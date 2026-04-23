import os
from youtube_transcript_api import YouTubeTranscriptApi

def get_transcript(video_id: str) -> tuple[str | None, str | None]:

    # Layer 1: direct fetch (no proxy) — works fine until YouTube blocks the cloud IP
    try:
        ytt_api = YouTubeTranscriptApi()
        try:
            transcript = ytt_api.fetch(video_id, languages=["en"])
        except Exception:
            transcript = ytt_api.fetch(video_id)

        text = " ".join(chunk.text for chunk in transcript)
        return text, None

    except Exception as e:
        print("Direct fetch failed, trying proxy:", e)

    # Layer 2: proxy fetch (legacy static API — supports proxies unlike the newer instance method)
    try:
        proxy_url = (
            f"http://{os.environ['WEBSHARE_USER']}:{os.environ['WEBSHARE_PASS']}"
            f"@{os.environ['WEBSHARE_HOST']}:{os.environ['WEBSHARE_PORT']}"
        )
        proxies = {"https": proxy_url}

        try:
            transcript = YouTubeTranscriptApi.get_transcript(
                video_id,
                languages=["en"],
                proxies=proxies
            )
        except Exception:
            transcript = YouTubeTranscriptApi.get_transcript(
                video_id,
                proxies=proxies
            )

        text = " ".join(t["text"] for t in transcript)
        return text, None

    except Exception as e:
        print("Proxy fetch failed, fallback needed:", e)
        return None, "fallback"  # Layer 3 — triggers manual paste UI in frontend