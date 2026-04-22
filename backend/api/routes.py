from fastapi import APIRouter
from pydantic import BaseModel

from src.splitter import split_text
from src.embeddings import create_vector_store
from src.retriever import get_retriever
from src.chains import build_chain

router = APIRouter()

# In-memory store 
vector_store_cache = {}


class VideoRequest(BaseModel):
    video_id: str
    transcript: str

class QuestionRequest(BaseModel):
    video_id: str
    question: str

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

    transcript = req.transcript

    if not transcript:
        return {"error": "No transcript available"}

    docs = split_text(transcript)
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