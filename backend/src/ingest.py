from youtube_transcript_api import YouTubeTranscriptApi

def get_transcript(video_id: str) -> tuple[str | None, str | None]:

    # Layer 1: try English first
    try:
        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(video_id, languages=["en"])
        text = " ".join(chunk.text for chunk in transcript)
        return text, None

    except Exception as e:
        print("English transcript failed, trying any language:", e)

    # Layer 2: try any available language
    try:
        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(video_id)
        text = " ".join(chunk.text for chunk in transcript)
        return text, None

    except Exception as e:
        print("All transcript fetch failed, fallback needed:", e)
        return None, "fallback"