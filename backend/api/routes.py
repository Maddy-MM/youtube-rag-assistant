from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.rag.ingest import get_transcript
from src.rag.splitter import split_text
from src.rag.embeddings import create_vector_store
from src.rag.retriever import get_retriever
from src.rag.chains import build_chain
from src.database import User
from src.auth import (
    get_db,
    get_user,
    create_user,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter()

# In-memory store
vector_store_cache = {}

# -------------------------
# Models
# -------------------------
class VideoRequest(BaseModel):
    video_id: str

class QuestionRequest(BaseModel):
    video_id: str
    question: str

class ManualTranscriptRequest(BaseModel):
    video_id: str
    transcript: str

class AuthRequest(BaseModel):
    username: str
    password: str

# -------------------------
# Helper
# -------------------------
def extract_video_id(url: str) -> str:
    if "v=" in url:
        return url.split("v=")[-1].split("&")[0]
    elif "youtu.be/" in url:
        return url.split("youtu.be/")[-1].split("?")[0]
    return url

# -------------------------
# Public endpoints
# -------------------------
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

# -------------------------
# Protected endpoints
# -------------------------
@router.post("/process_video")
def process_video(
    req: VideoRequest,
    current_user: User = Depends(get_current_user)
):
    video_id = extract_video_id(req.video_id)

    if video_id in vector_store_cache:
        return {"message": "Video already processed"}

    transcript, status = get_transcript(video_id)

    if status == "fallback":
        return {"error": "fallback"}

    docs = split_text(transcript)
    vector_store = create_vector_store(docs)
    vector_store_cache[video_id] = vector_store

    return {"message": "Video processed successfully"}

@router.post("/process_video_manual")
def process_video_manual(
    req: ManualTranscriptRequest,
    current_user: User = Depends(get_current_user)
):
    video_id = extract_video_id(req.video_id)

    docs = split_text(req.transcript)
    vector_store = create_vector_store(docs)
    vector_store_cache[video_id] = vector_store

    return {"message": "Video processed successfully"}

@router.post("/ask")
def ask_question(
    req: QuestionRequest,
    current_user: User = Depends(get_current_user)
):
    video_id = extract_video_id(req.video_id)

    if video_id not in vector_store_cache:
        return {"error": "Process video first"}

    vector_store = vector_store_cache[video_id]
    retriever = get_retriever(vector_store)
    chain = build_chain(retriever)

    answer = chain.invoke(req.question)

    return {"answer": answer}