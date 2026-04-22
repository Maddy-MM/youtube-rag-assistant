# YouTube RAG Chatbot

A **Retrieval-Augmented Generation (RAG) system** that enables users to ask questions about any YouTube video using its transcript. The system retrieves relevant context from the video and generates accurate, grounded responses using a Large Language Model.

---

## Table of Contents

1. Overview
2. Features
3. Project Workflow
4. RAG Pipeline Architecture
5. API Endpoints
6. Frontend (Streamlit UI)
7. Project Structure
8. Installation & Setup
9. How to Run
10. Deployment Architecture
11. System Design Decisions
12. Limitations
13. Future Improvements
14. Tech Stack

---

## Overview

This project demonstrates an **end-to-end GenAI system** designed with a **modular and scalable architecture**, where:

* A **FastAPI backend** handles the RAG pipeline
* A **Streamlit frontend** provides an interactive chat interface
* Both components can be deployed independently

The system ensures responses are **strictly grounded in the video transcript**, minimizing hallucinations.

---

## Features

* Ask questions about any YouTube video
* Context-aware answers based only on transcript data
* Semantic search using FAISS vector database
* HuggingFace embeddings for efficient retrieval
* LLM-powered answer generation
* Clean chat interface with Streamlit
* Modular backend API design
* Docker-based containerization
* Deployment-ready architecture

---

## Project Workflow

1. User provides a YouTube video URL
2. Extract video ID
3. Fetch transcript
4. Split transcript into chunks
5. Convert chunks into embeddings
6. Store embeddings in vector database
7. Retrieve relevant chunks for query
8. Pass context + question to LLM
9. Generate and return answer

---

## RAG Pipeline Architecture

### Transcript Extraction

* Uses `youtube-transcript-api`
* Attempts English transcript first
* Falls back to available transcript
* Handles missing transcripts gracefully

---

### Text Splitting

* `RecursiveCharacterTextSplitter`
* Chunk size: 1000
* Overlap: 200
* Preserves semantic continuity

---

### Embeddings

* Model: `sentence-transformers/all-MiniLM-L6-v2`
* Converts text into dense vector representations

---

### Vector Store

* FAISS for similarity search
* In-memory caching for processed videos

---

### Retrieval

* Similarity-based retrieval
* Top-k = 4 relevant chunks

---

### LLM Chain

* Model: `openai/gpt-oss-20b` (via HuggingFace)
* Strict prompt constraints:

  * Answer only from context
  * Say “I don’t know” if insufficient data

---

## API Endpoints

### Process Video

`POST /process_video`

Processes transcript and builds vector store.

---

### Ask Question

`POST /ask`

Returns context-aware answer based on transcript.

---

## Frontend (Streamlit UI)

The Streamlit interface provides:

* Video input screen
* Processing feedback
* Interactive chat interface
* Message history tracking

### User Flow

1. Paste YouTube link
2. Process video
3. Preview video
4. Start chatting
5. Ask questions / summaries / insights

---

## Project Structure

```id="q2r9mv"
youtube-rag-chatbot/

├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── requirements.txt
│   ├── main.py
│
│   ├── src/
│   │   ├── ingest.py
│   │   ├── splitter.py
│   │   ├── embeddings.py
│   │   ├── retriever.py
│   │   ├── chains.py
│
│   ├── api/
│   │   ├── routes.py
│
│   ├── .env
│
├── frontend/
│   ├── app.py
│   ├── requirements.txt
│
├── .gitignore
├── README.md
```

---

## Installation & Setup

### Clone Repository

```id="r9flhm"
git clone https://github.com/<your-username>/youtube-rag-chatbot.git
cd youtube-rag-chatbot
```

---

### Backend Setup

```id="n1k3vp"
cd backend
pip install -r requirements.txt
```

---

### Frontend Setup

```id="v2x8qw"
cd ../frontend
pip install -r requirements.txt
```

---

## How to Run

### Run Backend

```id="g7s4kp"
cd backend
uvicorn main:app --reload
```

---

### Run Frontend

```id="z6dmq1"
cd frontend
streamlit run app.py
```

---

## Deployment Architecture

* Backend is containerized using Docker and deployed as an API service
* Frontend is deployed separately as a Streamlit application
* Communication happens via REST API

---

## System Design Decisions

### Modular Architecture

* Clear separation between API and UI
* Easier scalability and maintenance

---

### In-Memory Vector Store

* Fast retrieval for processed videos
* Avoids recomputation
* Can be replaced with Redis or external DB

---

### Prompt Grounding

* Ensures answers are based strictly on transcript
* Reduces hallucination

---

## Limitations

* No persistent storage (data resets on restart)
* Depends on transcript availability
* Single-instance in-memory design
* No authentication or rate limiting

---

## Future Improvements

* Redis caching
* Persistent vector database (Chroma / Pinecone)
* Multi-video querying
* Streaming responses
* Authentication & rate limiting
* CI/CD pipeline
* UI enhancements

---

## Tech Stack

### Backend

* FastAPI
* LangChain
* FAISS
* HuggingFace

### Frontend

* Streamlit

### Deployment

* Docker