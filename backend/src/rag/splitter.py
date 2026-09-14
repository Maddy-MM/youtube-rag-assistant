from langchain_text_splitters import RecursiveCharacterTextSplitter


def split_text(text: str):
    if not text or not text.strip():
        return []

    # Sentence and block-aware separators to preserve timestamp anchors
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=600,
        chunk_overlap=150,
        separators=["\n\n", "\n", ". ", "? ", "! ", " ", ""],
    )
    return splitter.create_documents([text])