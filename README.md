# YouTube RAG Chatbot

A **Retrieval-Augmented Generation (RAG) system** that allows users to ask questions about any YouTube video using its transcript. The system retrieves relevant context and generates grounded responses using a Large Language Model.

---

## Table of Contents

1. Overview
2. Features
3. Project Workflow
4. RAG Pipeline Architecture
5. API Endpoints
6. Frontend
7. Project Structure
8. Installation & Setup
9. How to Run
10. Deployment Architecture
11. Limitations
12. Future Improvements
13. Tech Stack

---

## Overview

This project implements an **end-to-end GenAI pipeline** with a modular architecture:

* **FastAPI backend** handles the RAG pipeline
* **Streamlit frontend** provides an interactive chat interface
* Components are independently deployable

The system ensures responses remain **grounded in transcript data** to reduce hallucinations.

---

## Features

* Ask questions about any YouTube video
* Context-aware responses based on transcripts
* Semantic search using FAISS
* HuggingFace embeddings for retrieval
* LLM-based answer generation
* Streamlit chat interface
* Modular API-based backend
* Docker support for deployment

---

## Project Workflow

1. User provides a YouTube video URL
2. Extract video ID
3. Fetch transcript
4. Split transcript into chunks
5. Generate embeddings
6. Store embeddings in vector database
7. Retrieve relevant chunks
8. Pass context + query to LLM
9. Return generated response

---

## RAG Pipeline Architecture

### Transcript Extraction

* Uses `youtube-transcript-api`
* Attempts English transcript first
* Falls back to available transcripts

### Text Splitting

* `RecursiveCharacterTextSplitter`
* Chunk size: 1000
* Overlap: 200

### Embeddings

* Model: `sentence-transformers/all-MiniLM-L6-v2`

### Vector Store

* FAISS for similarity search
* In-memory caching

### Retrieval

* Top-k similarity search (k = 4)

### LLM

* Model: `openai/gpt-oss-20b` (via HuggingFace)
* Constrained prompting to ensure grounded answers

---

## API Endpoints

### Process Video

`POST /process_video`
Processes transcript and builds vector store

### Ask Question

`POST /ask`
Returns context-aware answers

---

## Frontend

Built with Streamlit:

* Video input
* Processing feedback
* Chat interface
* Message history

### User Flow

1. Paste video link
2. Process video
3. Preview video
4. Start chatting

---

## Project Structure

```text
youtube-rag-chatbot/

├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py
│   ├── src/
│   ├── api/
│   ├── .env
│
├── frontend/
│   ├── app.py
│   ├── requirements.txt
│
├── README.md
```

---

## Installation & Setup

### Clone Repository

```bash
git clone https://github.com/<your-username>/youtube-rag-chatbot.git
cd youtube-rag-chatbot
```

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd ../frontend
pip install -r requirements.txt
```

---

## How to Run

### Backend

```bash
cd backend
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
streamlit run app.py
```

---

## Deployment Architecture

* Backend deployed as a Dockerized API service
* Frontend deployed separately via Streamlit
* Communication via REST APIs

---

## Deployment Constraints

When deployed on cloud platforms, transcript fetching using `youtube-transcript-api` may fail due to **YouTube blocking datacenter IPs**.

* Local environments (residential IPs) → works reliably
* Cloud environments (datacenter IPs) → requests may be blocked

Approaches such as client-side transcript fetching and cookie-based authentication were evaluated but not adopted due to trade-offs in **modularity, security, and maintainability**.

The system therefore prioritizes a **clean backend architecture** while acknowledging this external limitation.

---

## Limitations

* No persistent storage
* Depends on transcript availability
* In-memory processing only
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

