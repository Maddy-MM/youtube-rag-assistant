from typing import Optional
from datetime import datetime
import json
import urllib.request
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.rag.ingest import get_transcript
from src.rag.splitter import split_text
from src.rag.embeddings import (
    create_vector_store,
    get_vector_store,
    namespace_exists,
    delete_vector_namespace,
)
from src.rag.retriever import get_dense_retriever
from src.rag.chains import stream_answer
from src.database import User, UserVideo, ChatSession
from src.auth import (
    get_db,
    get_user,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter()

retriever_cache = {}


class VideoRequest(BaseModel):
    video_id: str
    title: Optional[str] = "YouTube Video"


class QuestionRequest(BaseModel):
    video_id: str
    question: str


class ManualTranscriptRequest(BaseModel):
    video_id: str
    transcript: str
    title: Optional[str] = "YouTube Video"


class SaveChatRequest(BaseModel):
    id: str
    video_id: str
    video_title: Optional[str] = "YouTube Video"
    title: Optional[str] = "New Chat"
    messages_json: str


class AuthRequest(BaseModel):
    username: str
    password: str


def extract_video_id(url: str) -> str:
    url = url.strip()
    if "v=" in url:
        return url.split("v=")[-1].split("&")[0]
    elif "youtu.be/" in url:
        return url.split("youtu.be/")[-1].split("?")[0]
    elif "shorts/" in url:
        return url.split("shorts/")[-1].split("?")[0].split("/")[0]
    return url


def _fetch_youtube_title(video_id: str) -> str:
    try:
        url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode())
            t = data.get("title")
            if t and t.strip():
                return t.strip()
    except Exception:
        pass

    try:
        url = f"https://www.youtube.com/watch?v={video_id}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Accept-Language": "en-US,en;q=0.9"})
        with urllib.request.urlopen(req, timeout=4) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
            import re
            m = re.search(r'<title>(.*?)</title>', html)
            if m:
                raw = m.group(1).replace(" - YouTube", "").strip()
                if raw and raw.lower() != "youtube":
                    return raw
    except Exception:
        pass

    return "YouTube Video"


def _record_user_video(db: Session, user_id: int, video_id: str, title: str) -> str:
    existing = db.query(UserVideo).filter(UserVideo.user_id == user_id, UserVideo.video_id == video_id).first()
    resolved_title = title if (title and title != "YouTube Video") else _fetch_youtube_title(video_id)
    if not existing:
        db_video = UserVideo(user_id=user_id, video_id=video_id, title=resolved_title or "YouTube Video")
        db.add(db_video)
        db.commit()
        return resolved_title or "YouTube Video"
    elif not existing.title or existing.title == "YouTube Video":
        if resolved_title and resolved_title != "YouTube Video":
            existing.title = resolved_title
            db.commit()
        return existing.title or "YouTube Video"
    return existing.title or resolved_title or "YouTube Video"


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/login")
def login(req: AuthRequest, db: Session = Depends(get_db)):
    user = get_user(db, req.username)
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token(user.username)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/process_video")
def process_video(
    req: VideoRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    video_id = extract_video_id(req.video_id)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid or empty video ID")

    resolved_title = _record_user_video(db, current_user.id, video_id, req.title or "YouTube Video")

    if video_id in retriever_cache:
        return {"message": "Video already processed", "title": resolved_title}

    if namespace_exists(video_id):
        vector_store = get_vector_store(video_id)
    else:
        transcript, status = get_transcript(video_id)
        if not transcript or status == "fallback":
            return {"error": "fallback"}
        docs = split_text(transcript)
        if not docs:
            return {"error": "No transcript content found"}
        vector_store = create_vector_store(docs, video_id)

    retriever_cache[video_id] = get_dense_retriever(vector_store)
    return {"message": "Video processed successfully", "title": resolved_title}

@router.post("/process_video_manual")
def process_video_manual(
    req: ManualTranscriptRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    video_id = extract_video_id(req.video_id)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid or empty video ID")
    if not req.transcript or not req.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript cannot be empty")

    resolved_title = _record_user_video(db, current_user.id, video_id, req.title or "YouTube Video")

    docs = split_text(req.transcript)
    if not docs:
        raise HTTPException(status_code=400, detail="Transcript produced no content chunks")
    vector_store = create_vector_store(docs, video_id)
    retriever_cache[video_id] = get_dense_retriever(vector_store)
    return {"message": "Video processed successfully", "title": resolved_title}


@router.get("/videos")
def list_videos(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    videos = db.query(UserVideo).filter(UserVideo.user_id == current_user.id).order_by(UserVideo.created_at.desc()).all()
    updated = False
    for v in videos:
        if not v.title or v.title == "YouTube Video":
            resolved = _fetch_youtube_title(v.video_id)
            if resolved and resolved != "YouTube Video":
                v.title = resolved
                updated = True
    if updated:
        try:
            db.commit()
        except Exception:
            db.rollback()

    return [
        {
            "video_id": v.video_id,
            "title": v.title or "YouTube Video",
            "created_at": v.created_at.isoformat() if v.created_at else None,
        }
        for v in videos
    ]


@router.delete("/videos/{video_id}")
def delete_video(
    video_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    clean_id = extract_video_id(video_id)
    db.query(UserVideo).filter(UserVideo.user_id == current_user.id, UserVideo.video_id == clean_id).delete()
    db.commit()

    retriever_cache.pop(clean_id, None)
    delete_vector_namespace(clean_id)

    return {"message": f"Video {clean_id} removed from library and vector store"}


@router.get("/chats")
def list_chats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chats = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).order_by(ChatSession.updated_at.desc()).all()
    user_videos = {v.video_id: v.title for v in db.query(UserVideo).filter(UserVideo.user_id == current_user.id).all()}
    updated = False
    for c in chats:
        if not c.video_title or c.video_title == "YouTube Video":
            if c.video_id in user_videos and user_videos[c.video_id] != "YouTube Video":
                c.video_title = user_videos[c.video_id]
                updated = True
            else:
                resolved = _fetch_youtube_title(c.video_id)
                if resolved and resolved != "YouTube Video":
                    c.video_title = resolved
                    updated = True
    if updated:
        try:
            db.commit()
        except Exception:
            db.rollback()

    return [
        {
            "id": c.id,
            "video_id": c.video_id,
            "video_title": c.video_title,
            "title": c.title,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }
        for c in chats
    ]


@router.get("/chats/{chat_id}")
def get_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = db.query(ChatSession).filter(ChatSession.user_id == current_user.id, ChatSession.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if not chat.video_title or chat.video_title == "YouTube Video":
        uv = db.query(UserVideo).filter(UserVideo.user_id == current_user.id, UserVideo.video_id == chat.video_id).first()
        if uv and uv.title and uv.title != "YouTube Video":
            chat.video_title = uv.title
            try:
                db.commit()
            except Exception:
                pass
        else:
            resolved = _fetch_youtube_title(chat.video_id)
            if resolved and resolved != "YouTube Video":
                chat.video_title = resolved
                try:
                    db.commit()
                except Exception:
                    pass

    return {
        "id": chat.id,
        "video_id": chat.video_id,
        "video_title": chat.video_title,
        "title": chat.title,
        "messages_json": chat.messages_json,
        "updated_at": chat.updated_at.isoformat() if chat.updated_at else None,
    }


@router.post("/chats")
def save_chat(
    req: SaveChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resolved_vtitle = req.video_title
    if not resolved_vtitle or resolved_vtitle == "YouTube Video":
        uv = db.query(UserVideo).filter(UserVideo.user_id == current_user.id, UserVideo.video_id == req.video_id).first()
        if uv and uv.title and uv.title != "YouTube Video":
            resolved_vtitle = uv.title

    chat = db.query(ChatSession).filter(ChatSession.user_id == current_user.id, ChatSession.id == req.id).first()
    if chat:
        chat.video_id = req.video_id
        if resolved_vtitle and resolved_vtitle != "YouTube Video":
            chat.video_title = resolved_vtitle
        elif not chat.video_title or chat.video_title == "YouTube Video":
            chat.video_title = resolved_vtitle or chat.video_title
        chat.title = req.title or chat.title
        chat.messages_json = req.messages_json
        chat.updated_at = datetime.utcnow()
    else:
        chat = ChatSession(
            id=req.id,
            user_id=current_user.id,
            video_id=req.video_id,
            video_title=resolved_vtitle or "YouTube Video",
            title=req.title or "New Chat",
            messages_json=req.messages_json,
        )
        db.add(chat)
    db.commit()
    return {"message": "Chat saved successfully", "id": chat.id}


@router.delete("/chats")
def clear_all_chats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).delete()
    db.commit()
    return {"message": f"Cleared {count} chats"}


@router.delete("/chats/{chat_id}")
def delete_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deleted = db.query(ChatSession).filter(ChatSession.user_id == current_user.id, ChatSession.id == chat_id).delete()
    db.commit()
    if not deleted:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"message": "Chat deleted"}


@router.post("/ask")
def ask_question(
    req: QuestionRequest,
    current_user: User = Depends(get_current_user)
):
    video_id = extract_video_id(req.video_id)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid or empty video ID")
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    if video_id not in retriever_cache:
        if namespace_exists(video_id):
            vector_store = get_vector_store(video_id)
            retriever_cache[video_id] = get_dense_retriever(vector_store)
        else:
            return {"error": "Process video first"}

    retriever = retriever_cache[video_id]

    def event_stream():
        for token in stream_answer(retriever, req.question):
            for line in token.split("\n"):
                yield f"data: {line}\n"
            yield "\n"
        yield "event: done\ndata: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")