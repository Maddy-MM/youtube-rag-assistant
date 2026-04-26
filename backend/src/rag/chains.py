from langchain_core.prompts import PromptTemplate
from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint
from langchain_core.runnables import RunnableParallel, RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser


def build_chain(retriever):

    def format_docs(docs):
        return "\n\n".join(
            f"[Excerpt {i+1}]: {doc.page_content}"
            for i, doc in enumerate(docs)
        )

    prompt = PromptTemplate(
        template="""You are a helpful assistant that answers questions strictly based on YouTube video transcripts.

TRANSCRIPT EXCERPTS:
{context}

INSTRUCTIONS:
- Answer the question using only the transcript excerpts above.
- Be concise and direct. Do not repeat the question.
- If the excerpts contain a clear answer, provide it with relevant detail.
- If the excerpts are partially relevant, use what is available and note any gaps.
- If the excerpts do not contain enough information to answer, respond with:
  "The video does not appear to cover this topic."
- Do not make up information or use outside knowledge.

QUESTION: {question}

ANSWER:""",
        input_variables=["context", "question"]
    )

    endpoint = HuggingFaceEndpoint(
        repo_id="openai/gpt-oss-20b",
        temperature=0.2,
        max_new_tokens=1024
    )

    llm = ChatHuggingFace(llm=endpoint)

    chain = (
        RunnableParallel({
            "context": retriever | RunnableLambda(format_docs),
            "question": RunnablePassthrough()
        })
        | prompt
        | llm
        | StrOutputParser()
    )

    return chain