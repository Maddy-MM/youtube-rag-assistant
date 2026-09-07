import os
from pinecone import Pinecone, ServerlessSpec
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore

EMBEDDING_DIM = 1536  # text-embedding-3-small native dimension
INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "ytlens")

_embeddings = None
_pc_client = None
_index = None


def get_embeddings():
    global _embeddings
    if _embeddings is None:
        model_name = os.environ.get("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
        _embeddings = OpenAIEmbeddings(model=model_name)
    return _embeddings


def _get_pinecone_client() -> Pinecone:
    global _pc_client
    if _pc_client is None:
        _pc_client = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    return _pc_client


def get_pinecone_index():
    global _index
    if _index is None:
        pc = _get_pinecone_client()
        existing = pc.list_indexes().names()
        if INDEX_NAME not in existing:
            pc.create_index(
                name=INDEX_NAME,
                dimension=EMBEDDING_DIM,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1"),
            )
        _index = pc.Index(INDEX_NAME)
    return _index


def namespace_exists(video_id: str) -> bool:
    """Cheap 'already processed' check — namespaces let one Pinecone index
    hold every video without their chunks ever mixing at query time."""
    try:
        index = get_pinecone_index()
        stats = index.describe_index_stats()
        if not stats or not stats.namespaces:
            return False
        ns = stats.namespaces.get(video_id)
        return ns is not None and getattr(ns, "vector_count", 0) > 0
    except Exception as e:
        print("Error checking namespace existence:", e)
        return False


def create_vector_store(docs, video_id: str) -> PineconeVectorStore:
    return PineconeVectorStore.from_documents(
        docs,
        embedding=get_embeddings(),
        index_name=INDEX_NAME,
        namespace=video_id,
    )


def get_vector_store(video_id: str) -> PineconeVectorStore:
    return PineconeVectorStore(
        index=get_pinecone_index(),
        embedding=get_embeddings(),
        namespace=video_id,
    )