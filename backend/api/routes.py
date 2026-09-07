from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.rag.ingest import get_transcript
from src.rag.splitter import split_text
from src.rag.embeddings import create_vector_store, get_vector_store, namespace_exists
from src.rag.retriever import get_dense_retriever
from src.rag.chains import stream_answer
from src.database import User
from src.auth import (
    get_db,
    get_user,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter()

# In-memory retriever cache (dense retriever handle per video)
# Pinecone holds durable vector storage; if the backend restarts,
# the cache can reconstitute the retriever on-the-fly using the namespace.
retriever_cache = {}

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
    url = url.strip()
    if "v=" in url:
        return url.split("v=")[-1].split("&")[0]
    elif "youtu.be/" in url:
        return url.split("youtu.be/")[-1].split("?")[0]
    elif "shorts/" in url:
        return url.split("shorts/")[-1].split("?")[0].split("/")[0]
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
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid or empty video ID")

    if video_id in retriever_cache:
        return {"message": "Video already processed"}

    if namespace_exists(video_id):
        # Pinecone's vectors survived a redeploy that wiped this in-memory
        # cache — reuse them instead of re-fetching and re-embedding.
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
    return {"message": "Video processed successfully"}

@router.post("/process_video_manual")
def process_video_manual(
    req: ManualTranscriptRequest,
    current_user: User = Depends(get_current_user)
):
    video_id = extract_video_id(req.video_id)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid or empty video ID")
    if not req.transcript or not req.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript cannot be empty")

    docs = split_text(req.transcript)
    if not docs:
        raise HTTPException(status_code=400, detail="Transcript produced no content chunks")
    vector_store = create_vector_store(docs, video_id)
    retriever_cache[video_id] = get_dense_retriever(vector_store)

    return {"message": "Video processed successfully"}

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
        # If backend restarted, reconstitute the retriever from Pinecone namespace
        if namespace_exists(video_id):
            vector_store = get_vector_store(video_id)
            retriever_cache[video_id] = get_dense_retriever(vector_store)
        else:
            return {"error": "Process video first"}

    retriever = retriever_cache[video_id]

    def event_stream():
        for token in stream_answer(retriever, req.question):
            # each line of a multi-line token needs its own "data:" field,
            # otherwise SSE clients only read the first line of the payload
            for line in token.split("\n"):
                yield f"data: {line}\n"
            yield "\n"
        yield "event: done\ndata: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")