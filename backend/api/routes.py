from fastapi import APIRouter
from pydantic import BaseModel

from src.ingest import get_transcript
from src.splitter import split_text
from src.embeddings import create_vector_store
from src.retriever import get_retriever
from src.chains import build_chain

router = APIRouter()

# In-memory store
vector_store_cache = {}


class VideoRequest(BaseModel):
    video_id: str

class QuestionRequest(BaseModel):
    video_id: str
    question: str

class ManualTranscriptRequest(BaseModel):
    video_id: str
    transcript: str

def extract_video_id(url: str) -> str:
    if "v=" in url:
        return url.split("v=")[-1].split("&")[0]
    elif "youtu.be/" in url:
        return url.split("youtu.be/")[-1].split("?")[0]
    return url  # already an ID

@router.post("/process_video")
def process_video(req: VideoRequest):

    video_id = extract_video_id(req.video_id)

    if video_id in vector_store_cache:
        return {"message": "Video already processed"}

    transcript, status = get_transcript(video_id)

    # Both direct and proxy fetch failed — tell frontend to show paste UI
    if status == "fallback":
        return {"error": "fallback"}

    docs = split_text(transcript)
    vector_store = create_vector_store(docs)
    vector_store_cache[video_id] = vector_store

    return {"message": "Video processed successfully"}

@router.post("/process_video_manual")
def process_video_manual(req: ManualTranscriptRequest):

    # User pasted transcript manually — run it through the same pipeline
    video_id = extract_video_id(req.video_id)

    docs = split_text(req.transcript)
    vector_store = create_vector_store(docs)
    vector_store_cache[video_id] = vector_store

    return {"message": "Video processed successfully"}

@router.post("/ask")
def ask_question(req: QuestionRequest):

    video_id = extract_video_id(req.video_id)

    if video_id not in vector_store_cache:
        return {"error": "Process video first"}

    vector_store = vector_store_cache[video_id]
    retriever = get_retriever(vector_store)
    chain = build_chain(retriever)

    answer = chain.invoke(req.question)

    return {"answer": answer}