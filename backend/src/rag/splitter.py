from langchain_text_splitters import RecursiveCharacterTextSplitter


def split_text(text: str):
    # Smaller chunks with sentence-aware separators work better for transcripts
    # which have no paragraph structure unlike typical documents
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=600,
        chunk_overlap=150,
        separators=[". ", "? ", "! ", " ", ""],
    )
    return splitter.create_documents([text])