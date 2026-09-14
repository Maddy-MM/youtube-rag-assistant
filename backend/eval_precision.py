from dotenv import load_dotenv

load_dotenv()

from src.rag.ingest import get_transcript
from src.rag.splitter import split_text
from src.rag.embeddings import create_vector_store, get_vector_store, namespace_exists
from src.rag.retriever import get_retriever, rerank


EVAL_SET = [
    {
        "video_id": "LPZh9BOjkQs",
        "questions": [
            {"question": "What is a token in a language model?", "relevant_keyword": "word"},
            {"question": "What does the attention mechanism do?", "relevant_keyword": "attention"},
            {"question": "How are words turned into vectors?", "relevant_keyword": "encode"},
            {"question": "What does the model predict at each step?", "relevant_keyword": "probability"},
            {"question": "What is a transformer?", "relevant_keyword": "transformer"},
        ],
    },
    {
        "video_id": "__vX2sjlpXU",
        "questions": [
            {"question": "What does O(n) mean?", "relevant_keyword": "linear"},
            {"question": "What is constant time complexity?", "relevant_keyword": "constant"},
            {"question": "What does Big-O notation measure?", "relevant_keyword": "efficiency"},
            {"question": "What is quadratic time?", "relevant_keyword": "quadratic"},
            {"question": "How does input size affect runtime?", "relevant_keyword": "input size"},
        ],
    },
    {
        "video_id": "0pn2kUa1iZw",
        "questions": [
            {"question": "What is a pathogen?", "relevant_keyword": "pathogen"},
            {"question": "How do antibodies work?", "relevant_keyword": "antibod"},
            {"question": "What does a weakened or inactivated vaccine contain?", "relevant_keyword": "weakened"},
            {"question": "What is an antigen?", "relevant_keyword": "antigen"},
            {"question": "How does the immune system remember a threat?", "relevant_keyword": "memory"},
        ],
    },
    {
        "video_id": "p7HKvqRI_Bo",
        "questions": [
            {"question": "Which company is credited with creating the first stock market?", "relevant_keyword": "Dutch East India"},
            {"question": "What do investors receive in exchange for their money?", "relevant_keyword": "shares"},
            {"question": "What is an IPO?", "relevant_keyword": "IPO"},
            {"question": "Where were shares originally traded?", "relevant_keyword": "coffee house"},
            {"question": "What determines a stock's price?", "relevant_keyword": "supply and demand"},
        ],
    },
    {
        "video_id": "UukRgqzk-KE",
        "questions": [
            {"question": "Why is ice less dense than liquid water?", "relevant_keyword": "hydrogen bond"},
            {"question": "What shape do water molecules form when frozen?", "relevant_keyword": "hexagonal"},
            {"question": "What would happen to aquatic life if ice sank instead of floated?", "relevant_keyword": "crustaceans"},
            {"question": "What is density?", "relevant_keyword": "dense"},
            {"question": "How do water molecules behave in liquid form?", "relevant_keyword": "liquid"},
        ],
    },
]


def is_relevant(doc, keyword: str) -> bool:
    return keyword.lower() in doc.page_content.lower()


def precision_at_3(docs: list, keyword: str) -> int:
    return 1 if any(is_relevant(d, keyword) for d in docs[:3]) else 0


def prepare_video(video_id: str):
    transcript, status = get_transcript(video_id)
    if status == "fallback":
        print(f"  [SKIP] Could not fetch transcript for {video_id} — paste it manually if needed.")
        return None, None

    docs = split_text(transcript)

    if namespace_exists(video_id):
        vector_store = get_vector_store(video_id)
    else:
        vector_store = create_vector_store(docs, video_id)

    return vector_store, docs


def main():
    totals = {"dense": 0, "dense_rerank": 0, "hybrid": 0, "hybrid_rerank": 0}
    total_questions = 0

    for entry in EVAL_SET:
        video_id = entry["video_id"]
        print(f"\n=== Video: {video_id} ===")

        vector_store, docs = prepare_video(video_id)
        if vector_store is None:
            continue

        FETCH_K = 6
        dense_retriever = vector_store.as_retriever(
            search_type="similarity", search_kwargs={"k": FETCH_K}
        )
        hybrid_retriever = get_retriever(vector_store, docs, fetch_k=FETCH_K)

        for q in entry["questions"]:
            question, keyword = q["question"], q["relevant_keyword"]
            total_questions += 1

            dense_docs_full = dense_retriever.invoke(question)
            dense_docs = dense_docs_full[:3]
            dense_reranked_docs = rerank(question, dense_docs_full, top_k=3)

            hybrid_docs_full = hybrid_retriever.invoke(question)
            hybrid_docs = hybrid_docs_full[:3]
            reranked_docs = rerank(question, hybrid_docs_full, top_k=3)

            dense_hit = precision_at_3(dense_docs, keyword)
            dense_rerank_hit = precision_at_3(dense_reranked_docs, keyword)
            hybrid_hit = precision_at_3(hybrid_docs, keyword)
            rerank_hit = precision_at_3(reranked_docs, keyword)

            totals["dense"] += dense_hit
            totals["dense_rerank"] += dense_rerank_hit
            totals["hybrid"] += hybrid_hit
            totals["hybrid_rerank"] += rerank_hit

            print(f"  Q: {question}")
            print(f"     dense={dense_hit}  dense+rerank={dense_rerank_hit}  hybrid={hybrid_hit}  hybrid+rerank={rerank_hit}")

    print("\n" + "=" * 50)
    print(f"Total questions evaluated: {total_questions}")
    for method, label in [
        ("dense", "Dense-only (baseline)"),
        ("dense_rerank", "Dense + reranking (no BM25)"),
        ("hybrid", "Hybrid RRF (no rerank)"),
        ("hybrid_rerank", "Hybrid RRF + reranking"),
    ]:
        precision = totals[method] / total_questions if total_questions else 0
        print(f"{label:28s}: {totals[method]}/{total_questions}  (precision@3 = {precision:.1%})")


if __name__ == "__main__":
    main()