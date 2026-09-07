import os
from requests import Session
from requests.adapters import HTTPAdapter
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import WebshareProxyConfig

def _fetch_from_api(ytt_api: YouTubeTranscriptApi, video_id: str) -> str:
    try:
        transcript = ytt_api.fetch(video_id, languages=["en", "en-US", "en-GB"])
    except Exception:
        # Fallback to the first available transcript in any language
        transcript_list = ytt_api.list(video_id)
        transcript = None
        for t in transcript_list:
            transcript = t.fetch()
            break
        if transcript is None:
            raise RuntimeError(f"No transcripts found for video {video_id}")

    return " ".join(chunk.text for chunk in transcript)


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

    # Layer 1: direct fetch (no proxy)
    try:
        ytt_api = YouTubeTranscriptApi()
        text = _fetch_from_api(ytt_api, video_id)
        return text, None

    except Exception as e:
        print("Direct fetch failed:", e)

    # Layer 2: proxy fetch — only attempted if credentials are configured
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