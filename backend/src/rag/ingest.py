import os
from requests import Session
from requests.adapters import HTTPAdapter
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import WebshareProxyConfig

def _format_timestamp(seconds: float | int) -> str:
    total = max(0, int(seconds))
    hrs = total // 3600
    mins = (total % 3600) // 60
    secs = total % 60
    if hrs > 0:
        return f"{hrs:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"


def _format_transcript_chunks(transcript) -> str:
    formatted_blocks = []
    current_block = []
    block_start_time = None

    for item in transcript:
        if hasattr(item, "text"):
            text = str(item.text).strip()
            start = float(getattr(item, "start", 0.0))
        elif isinstance(item, dict):
            text = str(item.get("text", "")).strip()
            start = float(item.get("start", 0.0))
        else:
            text = str(item).strip()
            start = 0.0

        if not text:
            continue

        if block_start_time is None:
            block_start_time = start

        current_block.append(text)

        if (start - block_start_time >= 18.0) or (len(" ".join(current_block).split()) >= 45):
            ts = _format_timestamp(block_start_time)
            formatted_blocks.append(f"[{ts}] {' '.join(current_block)}")
            current_block = []
            block_start_time = None

    if current_block:
        ts = _format_timestamp(block_start_time if block_start_time is not None else 0.0)
        formatted_blocks.append(f"[{ts}] {' '.join(current_block)}")

    return "\n\n".join(formatted_blocks)


def _fetch_from_api(ytt_api: YouTubeTranscriptApi, video_id: str) -> str:
    try:
        transcript = ytt_api.fetch(video_id, languages=["en", "en-US", "en-GB"])
    except Exception:
        transcript_list = ytt_api.list(video_id)
        transcript = None
        for t in transcript_list:
            transcript = t.fetch()
            break
        if transcript is None:
            raise RuntimeError(f"No transcripts found for video {video_id}")

    return _format_transcript_chunks(transcript)


def _fetch_with_proxy(video_id: str) -> str | None:
    session = Session()
    adapter = HTTPAdapter(max_retries=0)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    session.request = lambda method, url, **kwargs: Session.request(
        session, method, url, timeout=3, **kwargs
    )

    ytt_api_proxy = YouTubeTranscriptApi(
        proxy_config=WebshareProxyConfig(
            proxy_username=os.environ["WEBSHARE_USER"],
            proxy_password=os.environ["WEBSHARE_PASS"],
        ),
        http_client=session
    )

    return _fetch_from_api(ytt_api_proxy, video_id)


def get_transcript(video_id: str) -> tuple[str | None, str | None]:
    try:
        ytt_api = YouTubeTranscriptApi()
        text = _fetch_from_api(ytt_api, video_id)
        return text, None
    except Exception as e:
        print("Direct fetch failed:", e)

    proxy_user = os.environ.get("WEBSHARE_USER")
    proxy_pass = os.environ.get("WEBSHARE_PASS")

    if not proxy_user or not proxy_pass:
        print("No proxy credentials configured, skipping to fallback")
        return None, "fallback"

    try:
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_fetch_with_proxy, video_id)
            text = future.result(timeout=3)
        return text, None

    except TimeoutError:
        print("Proxy fetch timed out after 3 seconds, fallback needed")
        return None, "fallback"

    except Exception as e:
        print("Proxy fetch failed, fallback needed:", e)
        return None, "fallback"