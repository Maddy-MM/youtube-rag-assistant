import streamlit as st
import requests

# API_URL = "https://youtube-rag-backend-js1w.onrender.com"
API_URL = "http://127.0.0.1:8000"

st.set_page_config(page_title="YTLens")

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
        res = requests.get(
            f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json",
            timeout=5
        )
        return res.json().get("title", "YouTube Video")
    except:
        return "YouTube Video"

def auth_headers() -> dict:
    return {"Authorization": f"Bearer {st.session_state.token}"}

# -------------------------
# Global style — hide anchor icons
# -------------------------
st.markdown("""
<style>
h1 a, h2 a, h3 a { display: none !important; }
</style>
""", unsafe_allow_html=True)

# -------------------------
# Session State Init
# -------------------------
if "token" not in st.session_state:
    st.session_state.token = None
if "chat_started" not in st.session_state:
    st.session_state.chat_started = False
if "video_processed" not in st.session_state:
    st.session_state.video_processed = False
if "video_id" not in st.session_state:
    st.session_state.video_id = ""
if "messages" not in st.session_state:
    st.session_state.messages = []
if "show_fallback" not in st.session_state:
    st.session_state.show_fallback = False
if "fallback_video_id" not in st.session_state:
    st.session_state.fallback_video_id = ""
if "manual_transcript" not in st.session_state:
    st.session_state.manual_transcript = ""

# -------------------------
# SIDEBAR
# -------------------------
with st.sidebar:

    st.markdown("""
        <div style="
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.4rem 0 1.2rem 0;
            border-bottom: 1px solid rgba(255,255,255,0.07);
            margin-bottom: 1.4rem;
        ">
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #FF0000 0%, #cc0000 100%);
                border-radius: 8px;
                width: 32px;
                height: 32px;
                flex-shrink: 0;
                box-shadow: 0 2px 10px rgba(255,0,0,0.4);
            ">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="white">
                    <path d="M8 5.14v14l11-7-11-7z"/>
                </svg>
            </div>
            <div>
                <p style="
                    color: #ffffff;
                    font-size: 0.9rem;
                    font-weight: 800;
                    letter-spacing: 0.02em;
                    margin: 0;
                    line-height: 1;
                ">YT<span style="color: rgba(255,255,255,0.5); font-weight: 400;">Lens</span></p>
                <p style="
                    color: rgba(255,255,255,0.4);
                    font-size: 0.65rem;
                    letter-spacing: 0.06em;
                    margin: 0.2rem 0 0 0;
                    line-height: 1;
                    text-transform: uppercase;
                ">Video Intelligence</p>
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
            <div style="display:flex; align-items:center; gap:0.8rem; padding:0.75rem 1rem; border-bottom:1px solid rgba(255,255,255,0.06);">
                <span style="color:rgba(255,0,0,0.7); font-size:0.7rem; font-weight:700;">01</span>
                <span style="color:#ffffff; font-size:0.85rem; font-weight:500;">Extract transcript</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.8rem; padding:0.75rem 1rem; border-bottom:1px solid rgba(255,255,255,0.06);">
                <span style="color:rgba(255,0,0,0.7); font-size:0.7rem; font-weight:700;">02</span>
                <span style="color:#ffffff; font-size:0.85rem; font-weight:500;">Split into chunks</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.8rem; padding:0.75rem 1rem; border-bottom:1px solid rgba(255,255,255,0.06);">
                <span style="color:rgba(255,0,0,0.7); font-size:0.7rem; font-weight:700;">03</span>
                <span style="color:#ffffff; font-size:0.85rem; font-weight:500;">Create embeddings</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.8rem; padding:0.75rem 1rem; border-bottom:1px solid rgba(255,255,255,0.06);">
                <span style="color:rgba(255,0,0,0.7); font-size:0.7rem; font-weight:700;">04</span>
                <span style="color:#ffffff; font-size:0.85rem; font-weight:500;">Retrieve context</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.8rem; padding:0.75rem 1rem;">
                <span style="color:rgba(255,0,0,0.7); font-size:0.7rem; font-weight:700;">05</span>
                <span style="color:#ffffff; font-size:0.85rem; font-weight:500;">Generate answer</span>
            </div>
        </div>

        <p style="
            color: rgba(255,255,255,0.4);
            font-size: 0.68rem;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            margin: 0 0 0.7rem 0;
        ">Tech Stack</p>

        <div style="display: flex; flex-wrap: wrap; gap: 0.45rem; margin-bottom: 1.8rem;">
            <span style="background:rgba(255,0,0,0.12); border:1px solid rgba(255,0,0,0.25); border-radius:6px; padding:0.3rem 0.7rem; color:#ffffff; font-size:0.75rem; font-weight:500; letter-spacing:0.03em;">FastAPI</span>
            <span style="background:rgba(255,0,0,0.12); border:1px solid rgba(255,0,0,0.25); border-radius:6px; padding:0.3rem 0.7rem; color:#ffffff; font-size:0.75rem; font-weight:500; letter-spacing:0.03em;">LangChain</span>
            <span style="background:rgba(255,0,0,0.12); border:1px solid rgba(255,0,0,0.25); border-radius:6px; padding:0.3rem 0.7rem; color:#ffffff; font-size:0.75rem; font-weight:500; letter-spacing:0.03em;">FAISS</span>
            <span style="background:rgba(255,0,0,0.12); border:1px solid rgba(255,0,0,0.25); border-radius:6px; padding:0.3rem 0.7rem; color:#ffffff; font-size:0.75rem; font-weight:500; letter-spacing:0.03em;">HuggingFace</span>
            <span style="background:rgba(255,0,0,0.12); border:1px solid rgba(255,0,0,0.25); border-radius:6px; padding:0.3rem 0.7rem; color:#ffffff; font-size:0.75rem; font-weight:500; letter-spacing:0.03em;">Streamlit</span>
            <span style="background:rgba(255,0,0,0.12); border:1px solid rgba(255,0,0,0.25); border-radius:6px; padding:0.3rem 0.7rem; color:#ffffff; font-size:0.75rem; font-weight:500; letter-spacing:0.03em;">JWT Auth</span>
        </div>

        <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1rem;">
            <p style="
                color: rgba(255,255,255,0.3);
                font-size: 0.65rem;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                margin: 0;
                text-align: center;
            ">AI-powered video intelligence</p>
        </div>
    """, unsafe_allow_html=True)

    # Logout button — only shown when logged in
    if st.session_state.token:
        st.markdown("<div style='margin-top: 1rem;'>", unsafe_allow_html=True)
        if st.button("⎋  Logout", use_container_width=True):
            st.session_state.token = None
            st.session_state.video_processed = False
            st.session_state.chat_started = False
            st.session_state.messages = []
            st.session_state.show_fallback = False
            st.session_state.manual_transcript = ""
            st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)


# =========================
# SCREEN 0 → LOGIN / REGISTER
# =========================
if not st.session_state.token:

    st.markdown("""
        <style>
            .block-container {
                padding-top: 5vh !important;
                max-width: 400px !important;
            }
            div[data-testid="stTextInput"] div[data-testid="InputInstructions"] {
                display: none !important;
            }
            div[data-testid="stTextInput"] label {
                color: rgba(255,255,255,0.38);
                font-size: 0.7rem;
                font-weight: 700;
                letter-spacing: 0.12em;
                text-transform: uppercase;
            }
            div[data-testid="stTextInput"] input {
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 10px;
                background-color: rgba(255,255,255,0.04);
                color: #ffffff;
                padding: 0.65rem 1rem;
                font-size: 0.93rem;
                transition: border-color 0.2s ease, box-shadow 0.2s ease;
            }
            div[data-testid="stTextInput"] input:focus {
                border-color: rgba(255, 50, 50, 0.5);
                box-shadow: 0 0 0 3px rgba(255,50,50,0.08);
            }
            div[data-testid="stButton"] button {
                background: linear-gradient(135deg, #cc0000 0%, #990000 100%);
                border: none;
                border-radius: 10px;
                color: #ffffff;
                font-weight: 700;
                font-size: 0.92rem;
                letter-spacing: 0.05em;
                transition: all 0.2s ease;
                box-shadow: 0 4px 18px rgba(180,0,0,0.4);
            }
            div[data-testid="stButton"] button:hover {
                background: linear-gradient(135deg, #ff1a1a 0%, #cc0000 100%);
                box-shadow: 0 6px 24px rgba(220,0,0,0.5);
                color: #ffffff;
            }
        </style>
    """, unsafe_allow_html=True)

    # Logo + branding
    st.markdown("""
        <style>
            div[data-testid="stMarkdown"] > div { width: 100% !important; }
        </style>
        <div style="width: 100%; text-align: center; margin-bottom: 1.2rem;">
            <div style="
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #FF0000 0%, #cc0000 100%);
                border-radius: 20px;
                width: 68px;
                height: 68px;
                box-shadow: 0 8px 32px rgba(255,0,0,0.45);
                margin-bottom: 0.5rem;
            ">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="white">
                    <path d="M8 5.14v14l11-7-11-7z"/>
                </svg>
            </div>
            <h1 style="
                color: #ffffff;
                font-size: 1.9rem;
                font-weight: 900;
                margin: 0;
                letter-spacing: -0.03em;
                line-height: 1;
            ">YT<span style="color: rgba(255,255,255,0.45); font-weight: 300;">Lens</span></h1>
            <div style="
                display: inline-block;
                border: 1px solid rgba(255,255,255,0.18);
                border-radius: 20px;
                padding: 0.3rem 0.9rem;
                margin-top: 0.2rem;
            ">
                <p style="
                    color: rgba(255,255,255,0.38);
                    font-size: 0.68rem;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    font-weight: 600;
                    margin: 0;
                ">Video Intelligence Platform</p>
            </div>
        </div>
    """, unsafe_allow_html=True)

    username = st.text_input("Username", placeholder="Enter your username", key="auth_username")
    password = st.text_input("Password", placeholder="Enter your password", type="password", key="auth_password")
    st.markdown("<div style='height: 0.2rem'></div>", unsafe_allow_html=True)

    if st.button("Sign In", use_container_width=True):
        if not username or not password:
            st.warning("Please enter both username and password.")
        else:
            with st.spinner("Signing in..."):
                try:
                    res = requests.post(
                        f"{API_URL}/login",
                        json={"username": username, "password": password}
                    ).json()
                except Exception:
                    st.error("Could not reach the backend. Please try again.")
                    st.stop()

            if "access_token" in res:
                st.session_state.token = res["access_token"]
                st.rerun()
            else:
                st.error(res.get("detail", "Login failed."))

    st.markdown("""
        <p style="text-align: center; margin-top: 1rem; color: rgba(255,255,255,0.5); font-size: 0.82rem; letter-spacing: 0.03em;">
            ⏱ First sign-in may take 30–60s while the backend wakes up
        </p>
    """, unsafe_allow_html=True)

    st.stop()


# =========================
# SCREEN 1 → VIDEO INPUT
# =========================
if not st.session_state.video_processed:

    st.markdown("""
        <style>
            .block-container { padding-top: 12vh !important; max-width: 860px !important; }
            div[data-testid="stTextInput"] label {
                color: rgba(255,255,255,0.4);
                font-size: 0.72rem;
                font-weight: 700;
                letter-spacing: 0.1em;
                text-transform: uppercase;
            }
            div[data-testid="stTextInput"] input {
                border: 1px solid rgba(255,255,255,0.09);
                border-radius: 10px;
                background-color: rgba(255,255,255,0.03);
                color: #ffffff;
                padding: 0.65rem 1rem;
                font-size: 0.95rem;
            }
            div[data-testid="stTextInput"] input:focus {
                border-color: rgba(255,50,50,0.4);
                box-shadow: 0 0 0 3px rgba(255,50,50,0.07);
            }
            div[data-testid="stButton"] button {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 10px;
                color: #ffffff;
                font-weight: 600;
                font-size: 0.95rem;
                letter-spacing: 0.02em;
                transition: all 0.2s ease;
            }
            div[data-testid="stButton"] button:hover {
                background: rgba(255,255,255,0.09);
                border-color: rgba(255,255,255,0.2);
                color: #ffffff;
            }
            div[data-testid="stTextInput"] div[data-testid="InputInstructions"] {
                display: none !important;
            }
        </style>
    """, unsafe_allow_html=True)

    # Header
    st.markdown("""
        <div style="
            background: linear-gradient(135deg, #1a1a26 0%, #13131c 100%);
            padding: 1.4rem 1.8rem;
            border-radius: 14px;
            margin-bottom: 1.6rem;
            display: flex;
            align-items: center;
            gap: 1.2rem;
            border: 1px solid rgba(255,255,255,0.07);
            box-shadow: 0 4px 24px rgba(0,0,0,0.4);
        ">
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #FF0000 0%, #cc0000 100%);
                border-radius: 10px;
                width: 40px;
                height: 40px;
                flex-shrink: 0;
                box-shadow: 0 4px 14px rgba(255,0,0,0.4);
            ">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                    <path d="M8 5.14v14l11-7-11-7z"/>
                </svg>
            </div>
            <div>
                <h1 style="
                    color: #ffffff;
                    margin: 0;
                    padding: 0;
                    font-size: 1.3rem;
                    font-weight: 900;
                    letter-spacing: -0.02em;
                    line-height: 1;
                ">YT<span style="color: rgba(255,255,255,0.45); font-weight: 300;">Lens</span></h1>
                <p style="
                    color: rgba(255,255,255,0.35);
                    margin: 0.3rem 0 0 0;
                    font-size: 0.72rem;
                    font-weight: 500;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                ">AI-Powered Video Intelligence</p>
            </div>
        </div>
    """, unsafe_allow_html=True)

    # Load a video section header
    st.markdown("""
        <div style="
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 10px;
            padding: 0.8rem 1.2rem;
            background: rgba(255,255,255,0.02);
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.7rem;
        ">
            <div style="
                width: 6px; height: 6px;
                background: #FF0000;
                border-radius: 50%;
                box-shadow: 0 0 6px rgba(255,0,0,0.6);
            "></div>
            <p style="
                color: rgba(255,255,255,0.6);
                margin: 0;
                font-size: 0.78rem;
                font-weight: 700;
                letter-spacing: 0.1em;
                text-transform: uppercase;
            ">Load a Video</p>
        </div>
    """, unsafe_allow_html=True)

    video_input = st.text_input(
        "YouTube URL or ID",
        placeholder="Paste YouTube link here..."
    )

    if st.button("Analyse Video", use_container_width=True):
        if not video_input:
            st.warning("Please enter a video URL or ID.")
        else:
            with st.spinner("Analysing video..."):
                res = requests.post(
                    f"{API_URL}/process_video",
                    json={"video_id": video_input},
                    headers=auth_headers()
                ).json()

            if res.get("error") == "fallback":
                st.session_state.show_fallback = True
                st.session_state.fallback_video_id = video_input
            elif "error" in res:
                st.error(res["error"])
            else:
                st.session_state.show_fallback = False
                if st.session_state.video_id != video_input:
                    st.session_state.chat_started = False
                st.session_state.video_processed = True
                st.session_state.video_id = video_input
                st.session_state.messages = []
                st.rerun()

    st.markdown("""
        <p style="
            color: rgba(255,255,255,0.5);
            font-size: 0.82rem;
            text-align: center;
            margin-top: 0.6rem;
            letter-spacing: 0.03em;
        ">
            🔒 Your session is secured with JWT authentication
        </p>
    """, unsafe_allow_html=True)

    # Fallback UI
    if st.session_state.show_fallback:
        st.warning("Transcript unavailable — no captions found or access was blocked. Please paste it manually below.")
        st.markdown(
            "Please go to [youtubetotranscript.com](https://youtubetotranscript.com/), "
            "find your video, and paste the transcript below."
        )

        st.session_state.manual_transcript = st.text_area(
            "Paste transcript here",
            height=200,
            value=st.session_state.manual_transcript
        )

        if st.button("Submit Transcript", use_container_width=True):
            if not st.session_state.manual_transcript.strip():
                st.warning("Please paste the transcript first.")
            else:
                with st.spinner("Processing transcript..."):
                    res2 = requests.post(
                        f"{API_URL}/process_video_manual",
                        json={
                            "video_id": st.session_state.fallback_video_id,
                            "transcript": st.session_state.manual_transcript
                        },
                        headers=auth_headers()
                    ).json()

                if "error" in res2:
                    st.error(res2["error"])
                else:
                    st.session_state.show_fallback = False
                    st.session_state.manual_transcript = ""
                    st.session_state.video_processed = True
                    st.session_state.video_id = st.session_state.fallback_video_id
                    st.session_state.messages = []
                    st.rerun()


# =========================
# SCREEN 2 → CHAT UI
# =========================
else:

    if "chat_started" not in st.session_state:
        st.session_state.chat_started = False

    # VIDEO READY SCREEN
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
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 16px;
                    overflow: hidden;
                    background: linear-gradient(160deg, #1e1e2e 0%, #16161f 100%);
                    box-shadow: 0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
                    margin-bottom: 0.6rem;
                ">
                    <div style="position: relative;">
                        <img src="{thumb}" style="
                            width: 100%;
                            height: 240px;
                            object-fit: cover;
                            object-position: center;
                            display: block;
                        "/>
                        <div style="
                            position: absolute;
                            top: 0; left: 0; right: 0; bottom: 0;
                            background: linear-gradient(to bottom, transparent 50%, rgba(22,22,31,0.95) 100%);
                        "></div>
                        <div style="
                            position: absolute;
                            top: 0.7rem; left: 0.7rem;
                            background: rgba(0,0,0,0.6);
                            border: 1px solid rgba(255,255,255,0.1);
                            border-radius: 6px;
                            padding: 0.25rem 0.55rem;
                            display: flex;
                            align-items: center;
                            gap: 0.35rem;
                        ">
                            <div style="width:6px; height:6px; background:#FF0000; border-radius:50%; box-shadow: 0 0 5px rgba(255,0,0,0.8);"></div>
                            <span style="color:rgba(255,255,255,0.8); font-size:0.65rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">Ready</span>
                        </div>
                    </div>
                    <div style="padding: 1.2rem 1.5rem 1.5rem 1.5rem; text-align: center;">
                        <h2 style="
                            color: #ffffff;
                            font-size: 1.05rem;
                            font-weight: 700;
                            margin: 0 0 0.6rem 0;
                            line-height: 1.4;
                            letter-spacing: 0.01em;
                        ">{title}</h2>
                        <p style="
                            color: rgba(255,255,255,0.28);
                            font-size: 0.7rem;
                            margin: 0;
                            letter-spacing: 0.06em;
                            text-transform: uppercase;
                        ">Ask questions · Summarize · Explore insights</p>
                    </div>
                </div>
            """, unsafe_allow_html=True)

            st.markdown("""
                <style>
                    div[data-testid="stButton"] button {
                        background: linear-gradient(135deg, #cc0000 0%, #990000 100%);
                        border: none;
                        border-radius: 10px;
                        color: #ffffff;
                        font-weight: 700;
                        font-size: 0.88rem;
                        letter-spacing: 0.06em;
                        text-transform: uppercase;
                        box-shadow: 0 4px 18px rgba(180,0,0,0.4);
                        transition: all 0.2s ease;
                    }
                    div[data-testid="stButton"] button:hover {
                        background: linear-gradient(135deg, #ff1a1a 0%, #cc0000 100%);
                        box-shadow: 0 6px 24px rgba(220,0,0,0.5);
                    }
                </style>
            """, unsafe_allow_html=True)

            if st.button("Start Chatting  →", use_container_width=True):
                st.session_state.chat_started = True
                st.rerun()

    # CHAT INTERFACE
    else:

        st.markdown("""
            <style>
                div[data-testid="stButton"] button {
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px;
                    color: rgba(255,255,255,0.5);
                    font-size: 0.72rem;
                    font-weight: 600;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    transition: all 0.2s ease;
                }
                div[data-testid="stButton"] button:hover {
                    background: rgba(255,255,255,0.07);
                    border-color: rgba(255,255,255,0.18);
                    color: #ffffff;
                }
            </style>
        """, unsafe_allow_html=True)

        if st.button("↩  Analyse a Different Video", use_container_width=True, key="new_video_btn"):
            st.session_state.video_processed = False
            st.session_state.chat_started = False
            st.session_state.messages = []
            st.rerun()

        st.markdown("""
            <div style="
                display: flex;
                align-items: center;
                gap: 1rem;
                margin: 1rem 0 1.4rem 0;
            ">
                <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.08);"></div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width:5px; height:5px; background:#FF0000; border-radius:50%; box-shadow: 0 0 5px rgba(255,0,0,0.7);"></div>
                    <span style="
                        color: rgba(255,255,255,0.5);
                        font-size: 0.7rem;
                        font-weight: 700;
                        letter-spacing: 0.14em;
                        text-transform: uppercase;
                    ">YTLens Chat</span>
                    <div style="width:5px; height:5px; background:#FF0000; border-radius:50%; box-shadow: 0 0 5px rgba(255,0,0,0.7);"></div>
                </div>
                <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.08);"></div>
            </div>
        """, unsafe_allow_html=True)

        chat_container = st.container()

        with chat_container:
            for role, msg in st.session_state.messages:
                st.chat_message("user" if role == "user" else "assistant").write(msg)

        user_input = st.chat_input("Ask anything about this video...")

        if user_input:
            with chat_container:
                st.chat_message("user").write(user_input)

                with st.spinner("Analysing..."):
                    res = requests.post(
                        f"{API_URL}/ask",
                        json={
                            "video_id": st.session_state.video_id,
                            "question": user_input
                        },
                        headers=auth_headers()
                    ).json()

                    answer = res.get("answer", "Error")

                st.chat_message("assistant").write(answer)

            st.session_state.messages.append(("user", user_input))
            st.session_state.messages.append(("bot", answer))