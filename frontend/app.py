import streamlit as st
import requests
import re
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled

API_URL = "https://youtube-rag-backend-js1w.onrender.com" 

st.set_page_config(page_title="YouTube RAG Chatbot")

# -------------------------
# Helpers
# -------------------------
def extract_video_id(url: str) -> str:
    if "v=" in url:
        return url.split("v=")[-1].split("&")[0]
    elif "youtu.be/" in url:
        return url.split("youtu.be/")[-1].split("?")[0]
    return url

def get_video_title(video_id: str) -> str:
    try:
        html = requests.get(f"https://www.youtube.com/watch?v={video_id}").text
        match = re.search(r"<title>(.*?)</title>", html)
        if match:
            return match.group(1).replace(" - YouTube", "")
        return "YouTube Video"
    except:
        return "YouTube Video"

def get_transcript(video_id: str) -> str:
    try:
        ytt_api = YouTubeTranscriptApi()

        try:
            transcript = ytt_api.fetch(video_id, languages=["en"])
        except Exception:
            transcript = ytt_api.fetch(video_id)

        return " ".join(chunk.text for chunk in transcript)

    except TranscriptsDisabled:
        return ""
    except Exception as e:
        st.error(f"Transcript error: {e}")
        return ""

# -------------------------
# Styles
# -------------------------
card_style = """
    background-color: rgba(255, 255, 255, 0.04);
    padding: 1.2rem 1.4rem;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
"""

st.markdown("""
<style>
h2 a {
    display: none !important;
}
</style>
""", unsafe_allow_html=True)

# -------------------------
# Session State Init
# -------------------------
if "video_processed" not in st.session_state:
    st.session_state.video_processed = False

if "video_id" not in st.session_state:
    st.session_state.video_id = ""

if "messages" not in st.session_state:
    st.session_state.messages = []

# -------------------------
# SIDE BAR
# -------------------------
with st.sidebar:

    st.markdown("""
        <div style="
            display: flex;
            align-items: center;
            gap: 0.8rem;
            padding: 0.4rem 0 1.2rem 0;
            border-bottom: 1px solid rgba(255,255,255,0.07);
            margin-bottom: 1.4rem;
        ">
            <span style="
                background: #FF0000;
                color: white;
                font-size: 0.9rem;
                border-radius: 6px;
                padding: 0.25rem 0.45rem;
                line-height: 1;
                box-shadow: 0 2px 8px rgba(255,0,0,0.35);
            ">▶</span>
            <div>
                <p style="
                    color: #ffffff;
                    font-size: 0.85rem;
                    font-weight: 700;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    margin: 0;
                    line-height: 1;
                ">YouTube RAG</p>
                <p style="
                    color: rgba(255,255,255,0.55);
                    font-size: 0.68rem;
                    letter-spacing: 0.04em;
                    margin: 0.25rem 0 0 0;
                    line-height: 1;
                ">Retrieval-Augmented Generation</p>
            </div>
        </div>

        <p style="
            color: rgba(255,255,255,0.5);
            font-size: 0.68rem;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            margin: 0 0 0.7rem 0;
        ">How it works</p>

        <div style="
            border: 1px solid rgba(255,255,255,0.09);
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 1.4rem;
            background: rgba(255,255,255,0.02);
        ">
            <div style="display:flex; align-items:center; gap:0.8rem; padding:0.8rem 1rem; border-bottom:1px solid rgba(255,255,255,0.06);">
                <span style="color:rgba(255,255,255,0.4); font-size:0.75rem; font-weight:600;">01</span>
                <span style="color:#ffffff; font-size:0.88rem; font-weight:500;">Extract transcript</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.8rem; padding:0.8rem 1rem; border-bottom:1px solid rgba(255,255,255,0.06);">
                <span style="color:rgba(255,255,255,0.4); font-size:0.75rem; font-weight:600;">02</span>
                <span style="color:#ffffff; font-size:0.88rem; font-weight:500;">Split into chunks</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.8rem; padding:0.8rem 1rem; border-bottom:1px solid rgba(255,255,255,0.06);">
                <span style="color:rgba(255,255,255,0.4); font-size:0.75rem; font-weight:600;">03</span>
                <span style="color:#ffffff; font-size:0.88rem; font-weight:500;">Create embeddings</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.8rem; padding:0.8rem 1rem; border-bottom:1px solid rgba(255,255,255,0.06);">
                <span style="color:rgba(255,255,255,0.4); font-size:0.75rem; font-weight:600;">04</span>
                <span style="color:#ffffff; font-size:0.88rem; font-weight:500;">Retrieve context</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.8rem; padding:0.8rem 1rem;">
                <span style="color:rgba(255,255,255,0.4); font-size:0.75rem; font-weight:600;">05</span>
                <span style="color:#ffffff; font-size:0.88rem; font-weight:500;">Generate answer</span>
            </div>
        </div>

        <p style="
            color: rgba(255,255,255,0.4);
            font-size: 0.7rem;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            margin: 0 0 0.7rem 0;
        ">Tech Stack</p>

        <div style="
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-bottom: 1.8rem;
        ">
            <span style="background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:0.35rem 0.75rem; color:#ffffff; font-size:0.78rem; font-weight:500; letter-spacing:0.03em;">FastAPI</span>
            <span style="background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:0.35rem 0.75rem; color:#ffffff; font-size:0.78rem; font-weight:500; letter-spacing:0.03em;">LangChain</span>
            <span style="background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:0.35rem 0.75rem; color:#ffffff; font-size:0.78rem; font-weight:500; letter-spacing:0.03em;">FAISS</span>
            <span style="background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:0.35rem 0.75rem; color:#ffffff; font-size:0.78rem; font-weight:500; letter-spacing:0.03em;">HuggingFace</span>
            <span style="background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:0.35rem 0.75rem; color:#ffffff; font-size:0.78rem; font-weight:500; letter-spacing:0.03em;">Streamlit</span>
        </div>

        <div style="
            border-top: 1px solid rgba(255,255,255,0.12);
            padding-top: 1rem;
        ">
            <p style="
                color: rgba(255,255,255,0.45);
                font-size: 0.68rem;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                margin: 0;
                text-align: center;
            ">Built for learning GenAI systems</p>
        </div>
    """, unsafe_allow_html=True)

# =========================
# SCREEN 1 → VIDEO INPUT
# =========================
if not st.session_state.video_processed:

    st.markdown(
        """
        <div style="
            background: linear-gradient(135deg, #1e1e2e 0%, #16161f 100%);
            padding: 1.6rem 2rem;
            border-radius: 16px;
            margin-bottom: 1.8rem;
            display: flex;
            align-items: center;
            gap: 1.4rem;
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06);
        ">
            <span style="
                font-size: 1.6rem;
                background: #FF0000;
                color: white;
                border-radius: 10px;
                padding: 0.4rem 0.65rem;
                line-height: 1;
                box-shadow: 0 4px 14px rgba(255,0,0,0.4);
            ">▶</span>
            <div>
                <h1 style="color: #ffffff; margin: 0; padding: 0; font-size: 1.45rem; line-height: 1.3; font-weight: 700; letter-spacing: 0.01em;">YouTube RAG Chatbot</h1>
                <p style="color: rgba(255,255,255,0.55); margin: 0.25rem 0 0 0; font-size: 0.82rem; font-weight: 400; letter-spacing: 0.04em; text-transform: uppercase;">
                    Retrieval-Augmented Generation
                </p>
            </div>
        </div>
        """,
        unsafe_allow_html=True
    )

    st.markdown("""
    <div style="
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 12px;
        padding: 0.9rem 1.4rem;
        background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%);
        margin-bottom: 1.2rem;
        display: flex;
        align-items: center;
        gap: 0.8rem;
    ">
        <span style="
            color: #FF4444;
            font-size: 0.85rem;
        ">▶</span>
        <h3 style='
            background: linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.6) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin: 0;
            padding: 0;
            font-size: 0.85rem;
            font-weight: 600;
            letter-spacing: 0.07em;
            text-transform: uppercase;
        '>Load a Video</h3>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
        <style>
            div[data-testid="stTextInput"] label {
                color: #aaaaaa;
                font-size: 0.85rem;
                font-weight: 500;
                letter-spacing: 0.03em;
                text-transform: uppercase;
            }
            div[data-testid="stTextInput"] input {
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 10px;
                background-color: rgba(255,255,255,0.03);
                color: #ffffff;
                padding: 0.6rem 1rem;
                font-size: 0.95rem;
                transition: border-color 0.2s ease;
            }
            div[data-testid="stTextInput"] input:focus {
                border-color: rgba(255,255,255,0.3);
                box-shadow: 0 0 0 2px rgba(255,255,255,0.05);
            }
            div[data-testid="stButton"] button {
                background: rgba(255,255,255,0.06);
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 10px;
                color: #ffffff;
                font-weight: 600;
                font-size: 0.95rem;
                letter-spacing: 0.02em;
                transition: all 0.2s ease;
            }
            div[data-testid="stButton"] button:hover {
                background: rgba(255,255,255,0.1);
                border-color: rgba(255,255,255,0.25);
                color: #ffffff;
            }
        </style>
    """, unsafe_allow_html=True)

    video_input = st.text_input(
        "YouTube URL or ID",
        placeholder="Paste YouTube link here..."
    )

    if st.button("Process Video", use_container_width=True):
        if not video_input:
            st.warning("Please enter a video")
        else:
            with st.spinner("Processing video..."):

                video_id = extract_video_id(video_input)

                transcript = get_transcript(video_id)

                if not transcript:
                    st.error("No transcript available")
                else:
                    res = requests.post(
                        f"{API_URL}/process_video",
                        json={
                            "video_id": video_id,
                            "transcript": transcript
                        }
                    ).json()

                    if "error" in res:
                        st.error(res["error"])
                    else:
                        st.session_state.video_processed = True
                        st.session_state.video_id = video_id
                        st.session_state.messages = []
                        st.rerun()

# =========================
# SCREEN 2 → CHAT UI
# =========================
else:

    if "chat_started" not in st.session_state:
        st.session_state.chat_started = False

    # START SCREEN
        if not st.session_state.chat_started:

            vid = extract_video_id(st.session_state.video_id)

            try:
                title = get_video_title(vid)
            except:
                title = "YouTube Video"

            thumb = f"https://img.youtube.com/vi/{vid}/hqdefault.jpg"

            col1, col2, col3 = st.columns([0.7, 2.6, 0.7])

            with col2:
                st.markdown(f"""
                    <div style="
                        border: 1px solid rgba(255,255,255,0.09);
                        border-radius: 16px;
                        overflow: hidden;
                        background: linear-gradient(160deg, #252535 0%, #1c1c28 100%);
                        box-shadow: 0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08);
                        margin-bottom: 0.6rem;
                    ">
                        <img src="{thumb}" style="
                            width: 100%;
                            height: 260px;
                            object-fit: cover;
                            object-position: center;
                            display: block;
                            border-bottom: 1px solid rgba(255,255,255,0.07);
                        "/>
                        <div style="padding: 1.2rem 1.5rem 1.4rem 1.5rem; text-align: center;">
                            <p style="
                                color: rgba(255,255,255,0.35);
                                font-size: 0.7rem;
                                font-weight: 600;
                                letter-spacing: 0.1em;
                                text-transform: uppercase;
                                margin: 0 0 0.45rem 0;
                            ">▶ Ready to Chat</p>
                            <h2 style="
                                color: #ffffff;
                                font-size: 1.15rem;
                                font-weight: 700;
                                margin: 0 0 0.7rem 0;
                                line-height: 1.4;
                                letter-spacing: 0.01em;
                            ">{title}</h2>
                            <p style="
                                color: rgba(255,255,255,0.35);
                                font-size: 0.75rem;
                                margin: 0;
                                letter-spacing: 0.03em;
                                text-transform: uppercase;
                            ">Ask questions · Summarize · Explore insights</p>
                        </div>
                    </div>
                """, unsafe_allow_html=True)

                st.markdown("""
                    <style>
                        div[data-testid="stButton"] button {
                            background: linear-gradient(135deg, #1e1e2e 0%, #16161f 100%);
                            border: 1px solid rgba(255,255,255,0.1);
                            border-radius: 10px;
                            color: #ffffff;
                            font-weight: 600;
                            font-size: 0.9rem;
                            letter-spacing: 0.04em;
                            text-transform: uppercase;
                            box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
                            transition: all 0.2s ease;
                        }
                        div[data-testid="stButton"] button:hover {
                            background: linear-gradient(135deg, #252538 0%, #1a1a28 100%);
                            border-color: rgba(255,255,255,0.2);
                            color: #ffffff;
                        }
                    </style>
                """, unsafe_allow_html=True)

                if st.button("▶  Start Chatting", use_container_width=True):
                    st.session_state.chat_started = True
                    st.rerun()


    # CHAT INTERFACE
    else:

        # Header row
        # Header row
        if st.button("↩  Upload a Different Video", use_container_width=True, key="new_video_btn"):
            st.session_state.video_processed = False
            st.session_state.chat_started = False
            st.session_state.messages = []
            st.rerun()

        st.markdown("""
            <style>
                div[data-testid="stButton"] button {
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 10px;
                    color: rgba(255,255,255,0.7);
                    font-size: 0.75rem;
                    font-weight: 600;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    transition: all 0.2s ease;
                }
                div[data-testid="stButton"] button:hover {
                    background: rgba(255,255,255,0.06);
                    border-color: rgba(255,255,255,0.25);
                    color: #ffffff;
                }

                div style="
                display: flex;
                align-items: center;
                gap: 1rem;
                margin-bottom: 1.4rem;
            ">
            </style>

            <div style="
                display: flex;
                align-items: center;
                gap: 1rem;
                margin-bottom: 1.4rem;
                margin-top: 1rem;
            ">
                <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.15);"></div>
                <span style="
                    color: #ffffff;
                    font-size: 0.75rem;
                    font-weight: 700;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                ">Chat</span>
                <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.15);"></div>
            </div>
        """, unsafe_allow_html=True)

        chat_container = st.container()

        # 1. Render existing messages (stable, no flicker)
        with chat_container:
            for role, msg in st.session_state.messages:
                st.chat_message("user" if role == "user" else "assistant").write(msg)

        # 2. Take input
        user_input = st.chat_input("Ask something...")

        # 3. Handle new input WITHOUT re-rendering everything again
        if user_input:
            # Show user message immediately (without touching old ones)
            with chat_container:
                st.chat_message("user").write(user_input)

                # Spinner ONLY wraps API call
                with st.spinner("Thinking..."):
                    res = requests.post(
                        f"{API_URL}/ask",
                        json={
                            "video_id": st.session_state.video_id,
                            "question": user_input
                        }
                    ).json()

                    answer = res.get("answer", "Error")

                st.chat_message("assistant").write(answer)

            # Store AFTER rendering (important)
            st.session_state.messages.append(("user", user_input))
            st.session_state.messages.append(("bot", answer))