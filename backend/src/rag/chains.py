import os
from langchain_core.prompts import PromptTemplate
from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint
from langchain_openai import ChatOpenAI
from langchain_core.runnables import RunnableParallel, RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser

from src.rag.retriever import rerank

PROMPT = PromptTemplate(
    template="""You are a helpful assistant that answers questions strictly based on YouTube video transcripts.

TRANSCRIPT EXCERPTS:
{context}

INSTRUCTIONS:
- Answer the question using only the transcript excerpts above.
- Be concise and direct. Do not repeat the question.
- Whenever citing facts, explanations, or specific details from the video, include the timestamp from the transcript excerpts in [MM:SS] or [HH:MM:SS] format (e.g., [02:15] or [01:14:30]) directly after the relevant statement.
- If multiple points or steps are mentioned, provide the corresponding timestamp for each.
- If the excerpts contain a clear answer, provide it with relevant detail and timestamps.
- If the excerpts are partially relevant, use what is available, include timestamps, and note any gaps.
- If the excerpts do not contain enough information to answer, respond with:
  "The video does not appear to cover this topic."
- Do not make up information, timestamps, or use outside knowledge.

QUESTION: {question}

ANSWER:""",
    input_variables=["context", "question"]
)


def _format_docs(docs):
    return "\n\n".join(
        f"[Excerpt {i+1}]: {doc.page_content}"
        for i, doc in enumerate(docs)
    )


_llm = None


def _get_llm():
    global _llm
    if _llm is None:
        provider = os.environ.get("CHAT_PROVIDER", "openai").lower()
        if provider == "openai":
            model = os.environ.get("OPENAI_CHAT_MODEL", "gpt-5-nano")
            _llm = ChatOpenAI(
                model=model,
                temperature=0.2,
                streaming=True,
            )
        else:
            repo_id = os.environ.get("HUGGINGFACE_CHAT_MODEL", "openai/gpt-oss-20b")
            endpoint = HuggingFaceEndpoint(
                repo_id=repo_id,
                temperature=0.2,
                max_new_tokens=1024,
            )
            _llm = ChatHuggingFace(llm=endpoint)
    return _llm


def build_chain(retriever):
    def retrieve_and_rerank(question: str):
        candidates = retriever.invoke(question)
        return rerank(question, candidates, top_k=5)

    chain = (
        RunnableParallel({
            "context": RunnableLambda(retrieve_and_rerank) | RunnableLambda(_format_docs),
            "question": RunnablePassthrough()
        })
        | PROMPT
        | _get_llm()
        | StrOutputParser()
    )

    return chain


def stream_answer(retriever, question: str):
    candidates = retriever.invoke(question)
    top_docs = rerank(question, candidates, top_k=5)
    context = _format_docs(top_docs)

    prompt_value = PROMPT.invoke({"context": context, "question": question})
    llm = _get_llm()

    for chunk in llm.stream(prompt_value):
        token = chunk.content
        if token:
            yield token