import os
from langchain_community.retrievers import BM25Retriever

# Lazy-loaded singleton — only loaded if ENABLE_RERANKER is enabled
_reranker = None


def _get_reranker():
    global _reranker
    if _reranker is None:
        # Lazy import so PyTorch / torch C-extensions are never loaded unless explicitly requested
        from sentence_transformers import CrossEncoder
        # Use a lightweight cross-encoder (35MB vs 1.1GB) to avoid OOM crashes
        model_name = os.environ.get("RERANKER_MODEL", "cross-encoder/ms-marco-MiniLM-L-2-v2")
        _reranker = CrossEncoder(model_name)
    return _reranker


class HybridRetriever:
    """Combines BM25 (sparse/keyword) and dense embedding retrieval via
    Reciprocal Rank Fusion, implemented directly rather than through
    LangChain's EnsembleRetriever — that class now lives in the legacy
    `langchain-classic` package, which the docs describe as a holding
    ground for deprecated functionality. RRF itself is simple enough
    (sum of 1/(k + rank) across each retriever's ranked list) that it's
    not worth taking on that dependency just to call it through a library.
    """

    def __init__(self, vector_store, docs, fetch_k: int = 20, rrf_k: int = 60):
        self.dense_retriever = vector_store.as_retriever(
            search_type="similarity",
            search_kwargs={"k": fetch_k},
        )
        self.bm25_retriever = BM25Retriever.from_documents(docs)
        self.bm25_retriever.k = fetch_k
        self.rrf_k = rrf_k  # standard RRF constant; dampens the influence of very low ranks

    def invoke(self, query: str) -> list:
        dense_docs = self.dense_retriever.invoke(query)
        sparse_docs = self.bm25_retriever.invoke(query)
        return self._reciprocal_rank_fusion([sparse_docs, dense_docs])

    def _reciprocal_rank_fusion(self, ranked_lists: list) -> list:
        scores = {}
        doc_by_key = {}

        for ranked_list in ranked_lists:
            for rank, doc in enumerate(ranked_list):
                key = doc.page_content  # dedupe identical chunks across the two retrievers
                doc_by_key[key] = doc
                scores[key] = scores.get(key, 0.0) + 1.0 / (self.rrf_k + rank + 1)

        ranked_keys = sorted(scores, key=scores.get, reverse=True)
        return [doc_by_key[key] for key in ranked_keys]


def get_retriever(vector_store, docs, fetch_k: int = 20) -> HybridRetriever:
    return HybridRetriever(vector_store, docs, fetch_k=fetch_k)


def rerank(question: str, docs: list, top_k: int = 5) -> list:
    """Re-scores candidates using a lightweight cross-encoder if enabled.
    Defaults to dense Pinecone ranking on 512MB memory-constrained servers."""
    if not docs:
        return docs

    # Check if neural reranking is enabled (default false for 512MB RAM instances)
    enable_reranker = os.environ.get("ENABLE_RERANKER", "false").lower() in ("1", "true", "yes")
    if not enable_reranker:
        return docs[:top_k]

    try:
        reranker = _get_reranker()
        pairs = [(question, doc.page_content) for doc in docs]
        scores = reranker.predict(pairs)
        ranked = sorted(zip(docs, scores), key=lambda pair: pair[1], reverse=True)
        return [doc for doc, _ in ranked[:top_k]]
    except Exception as e:
        print(f"Reranking skipped (falling back to dense Pinecone rank): {e}")
        return docs[:top_k]

def get_dense_retriever(vector_store, fetch_k: int = 20):
    """Production retrieval path — dense embedding search only, followed by
    cross-encoder reranking in chains.py. The hybrid BM25+dense (RRF) approach
    above was built and evaluated (see eval_precision.py) but measurably
    underperformed dense-only at the per-video corpus scale this app's Pinecone
    namespacing uses (~10-15 chunks/video) — BM25's term-frequency signal is
    too noisy on a corpus that small. Reranking, not hybrid fusion, was the
    actual quality driver, so production stays simple: dense retrieval, then rerank.
    """
    return vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": fetch_k},
    )