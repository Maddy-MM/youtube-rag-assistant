# YTLens

A production-grade **Retrieval-Augmented Generation (RAG) system** that allows users to chat with any YouTube video using its transcript. The system retrieves relevant context, respects temporal boundaries, and generates grounded responses streamed token-by-token with interactive `[MM:SS]` timestamp citations linked directly to YouTube playback.

---

## Table of Contents

1. Overview
2. Live Demo
3. Features
4. Project Workflow
5. RAG Pipeline Architecture
6. Retrieval Evaluation
7. Authentication & Database
8. API Endpoints
9. Frontend Experience
10. Project Structure
11. Installation & Setup
12. How to Run
13. Deployment Architecture
14. Transcript Fetching Strategy
15. Current Limitations & Tradeoffs
16. Future Improvements
17. Tech Stack

---

## Overview

YTLens implements an **end-to-end GenAI pipeline** with a unified, high-performance architecture:

- **FastAPI backend**: Powers the RAG pipeline, JWT authentication, and session persistence, while serving frontend Jinja2 templates and static assets on a single host.
- **Modern vanilla frontend**: High-performance UI built with Jinja2, HTML5, CSS3, and ES6+ JavaScript. Features real-time Server-Sent Events (SSE) streaming, interactive timestamp pills, a collapsible sidebar rail, and full modal workflows.
- **Fast package management with `uv`**: Uses Astral's `uv` with `pyproject.toml` and `uv.lock` for deterministic, sub-minute dependency installation both locally and in Docker multi-stage builds.
- **Temporal context & grounding**: Captures subtitle timestamps during ingestion and anchors transcript blocks, allowing the LLM to cite verifiable `[MM:SS]` video markers that jump directly to playback.

---

## Live Demo

- **Application:** [ytlens.madhavmakwana.dev](https://ytlens.madhavmakwana.dev)

> **Note:** The application is hosted on Render free tier and may take 30–60 seconds to wake up on the first request if the container is sleeping.

---

## Features

- **Interactive YouTube Timestamp Citations**: Transcript ingestion preserves subtitle start times into ~18-second temporal blocks. Responses include `[MM:SS]` citations that render as interactive pills jumping directly to the exact second of the YouTube video.
- **ChatGPT-Inspired Collapsible Sidebar Rail**: Single unified toggle button switches seamlessly between a full 260px sidebar and a 58px compact icon rail, persisting user layout preference across browser sessions.
- **Multi-Session Chat Persistence**: Save, resume, switch, and delete individual conversation sessions, or clear all chats with a single click ("Clear all").
- **Video Knowledge Base Modal**: Full-screen centered dialog featuring list vs. poster grid views, real-time title/ID search filtering, and one-click deletion of videos and their Pinecone vector namespaces.
- **Integrated Ingest Modal Dialog**: Modal for entering YouTube URLs with automatic video ID parsing, live thumbnail preview, and a collapsible manual transcript fallback drawer.
- **Streamlined Floating Prompt Dock**: Distraction-free, studio-grade prompt bar with auto-expanding textarea, keyboard shortcut submission (`Enter` / `Shift+Enter`), and contextual grounding indicators.
- **Auto-Healing Video Titles**: Dual-layer title resolution ensuring video names automatically resolve via YouTube oEmbed / HTML scrapers instead of generic placeholders.
- **Persistent, Namespaced Vector Storage**: Pinecone serverless vector index namespaced per video ID. Once ingested, videos attach instantly without re-embedding; removing a video cleanly wipes its namespace.
- **Cross-Encoder Reranking (Configurable)**: Optional lightweight reranker (`cross-encoder/ms-marco-MiniLM-L-2-v2`, ~35MB) to re-score dense candidates. Disabled by default (`ENABLE_RERANKER=false`) to preserve low memory footprints on 512MB RAM cloud hosts.
- **Dual Chat Model Support**: Switch seamlessly between OpenAI (`gpt-5-nano` or configurable) and free open-source models via Hugging Face Inference API (`openai/gpt-oss-20b`).
- **Token-by-Token Streaming (SSE)**: Streams generated answers in real time via Server-Sent Events with an active "Stop generating" (`AbortController`) button.
- **Brand Identity & Favicon**: Custom vector crimson squircle brand icon (`/static/favicon.svg` and `/favicon.ico`) with sleek YTLens branding.
- **Dark-Theme Protected Autofill**: Native browser credential autofill styling customized to prevent bright white user-agent background flashes on dark theme inputs.
- **Two-Layer Transcript Fetching with Proxy**: Automatic direct fetching with Webshare residential proxy fallback for cloud IP bypass, plus manual transcript paste fallback.
- **Universal Database Persistence**: Runs out-of-the-box on SQLite (`sqlite:///./users.db`) and seamlessly transitions to managed PostgreSQL (Neon / Supabase) via `DATABASE_URL`.

---

## Project Workflow

```mermaid
flowchart TD
    A[User Enters YouTube URL] --> B{Already in Pinecone / Cache?}
    B -- Yes --> C[Instant Attach to Vector Store]
    B -- No --> D[Fetch Subtitles via youtube-transcript-api]
    D -- Direct / Proxy Fails --> E[Manual Transcript Fallback Drawer]
    D -- Success --> F[Aggregate into Time-Coded Blocks ~18s]
    E --> F
    F --> G[Recursive Splitter - Respects Boundary Markers]
    G --> H[Generate text-embedding-3-small Embeddings]
    H --> I[Upsert to Pinecone Namespace: video_id]
    I --> C
    C --> J[User Asks Question]
    J --> K[Pinecone Dense Similarity Search Top-K]
    K --> L{ENABLE_RERANKER?}
    L -- True --> M[Cross-Encoder Re-scores Candidates]
    L -- False --> N[Dense Candidates Direct]
    M --> O[Build Context with Excerpts & Timestamps]
    N --> O
    O --> P[Stream Answer via SSE with [MM:SS] Citations]
    P --> Q[Frontend Converts [MM:SS] into Interactive YouTube Links]
```

1. **Authentication**: User signs in via `/login` to receive a signed JWT access token.
2. **Video Ingestion / Cache Check**:
   - The backend checks `retriever_cache` and `namespace_exists(video_id)`. If previously indexed, the namespace is reused immediately.
   - If new, subtitles are fetched (direct, proxy, or manual fallback).
3. **Temporal Chunking**: Subtitles are grouped into time-anchored blocks (~18s / 45 words) prefixed with `[MM:SS]`.
4. **Embedding & Storage**: Documents are embedded via OpenAI `text-embedding-3-small` (1536-dim) and upserted into an isolated Pinecone namespace.
5. **Retrieval**: Questions trigger dense similarity search in Pinecone. If `ENABLE_RERANKER=true`, candidates are re-ranked with a lightweight cross-encoder.
6. **Grounding & Citations**: The LLM streams its answer token-by-token via SSE, inserting exact `[MM:SS]` timecodes. The frontend decorates these citations as clickable pills that launch YouTube at that exact second.
7. **Session Persistence**: Conversations are auto-persisted to SQLite/PostgreSQL with support for resume, individual deletion, and full wipe.

---

## RAG Pipeline Architecture

### 1. Transcript Extraction & Temporal Anchoring
- Library: `youtube-transcript-api` v1.2.4 with fallback language discovery (`en`, `en-US`, `en-GB`, or any available).
- **Temporal Formatting**: Subtitle cues are grouped into ~18-second or ~45-word blocks prefixed with `[MM:SS]` or `[HH:MM:SS]`.
- This preserves chronological context in embeddings without creating fragmented sentences or token inflation.

### 2. Text Splitting
- `RecursiveCharacterTextSplitter` configured for subtitle structures:
  - **Chunk Size**: 600 characters
  - **Chunk Overlap**: 150 characters
  - **Separators**: `["\n\n", "\n", ". ", "? ", "! ", " ", ""]` to prevent slicing through timestamp markers and sentence boundaries.

### 3. Embeddings & Namespaced Vector Store
- **Embedding Model**: OpenAI `text-embedding-3-small` (1536 dimensions).
- **Pinecone Serverless**: Each video's vectors reside in a dedicated namespace named after its YouTube video ID (`namespace=video_id`).
  - Strict isolation prevents cross-video context leakage.
  - Namespaces double as persistent processing caches.
  - Deleting a video from the library permanently deletes its Pinecone namespace via `delete_vector_namespace()`.

### 4. Retrieval & Reranking
- **Dense Retrieval**: Similarity search retrieves the top 20 candidate chunks for the query.
- **Reranking**:
  - Optional cross-encoder reranking (`cross-encoder/ms-marco-MiniLM-L-2-v2`, ~35MB) re-scores top candidates to pick the top 5 most relevant excerpts.
  - Controlled by `ENABLE_RERANKER=false` (default) to fit within 512MB RAM constraints on free cloud tiers without Out-Of-Memory errors.
- **Why Not Hybrid BM25?**: Extensive offline precision benchmarking showed BM25 term frequency on small per-video corpora (~10–15 chunks) introduced noise and reduced precision compared to pure dense search (see [Retrieval Evaluation](#retrieval-evaluation)).

### 5. LLM & Grounded Prompting
- **Supported Providers**:
  - **OpenAI (Default)**: `gpt-5-nano` (or configurable model).
  - **Hugging Face**: `openai/gpt-oss-20b` via HuggingFace Endpoint.
- **Strict Grounding Instructions**: Prompt mandates answering solely from transcript excerpts and citing `[MM:SS]` timecodes directly after facts or quotes.
- **Streaming Output**: Tokens are yielded via Server-Sent Events (SSE) for low perceived latency.

---

## Retrieval Evaluation

Rather than assuming hybrid retrieval or reranking would improve answer quality, both were evaluated using a standalone precision test harness (`backend/eval_precision.py`).

**Methodology:** 5 short YouTube videos across diverse domains (AI/ML, algorithms, biology, finance, chemistry), 5 hand-labeled questions each (25 total), each paired with a confirmed ground-truth keyword. Four retrieval configurations were benchmarked on Precision@3:

| Configuration | Precision@3 | Notes |
|---|---|---|
| Dense-only (baseline) | 88% | Pure vector similarity against Pinecone |
| Hybrid RRF (BM25 + dense, no rerank) | 84% | Reciprocal Rank Fusion of sparse + dense |
| Dense + cross-encoder reranking | 92% | Re-scored with cross-encoder |
| Hybrid + cross-encoder reranking | 92% | Re-scored hybrid pool |

**Key Findings:**
1. Hybrid fusion alone *underperformed* dense-only retrieval due to noisy BM25 term-frequency statistics on small per-video document sets (~10–15 chunks/video).
2. Cross-encoder reranking drove the improvement, yielding a **33% relative reduction in retrieval misses** (from 3/25 to 2/25).
3. Production architecture uses **dense retrieval with optional lightweight cross-encoder reranking**.

---

## Authentication & Database

- **Authentication**: JWT access tokens (valid for 8 hours) with password hashing via **bcrypt**.
- **User Models**: Managed with **SQLAlchemy ORM** (`User`, `UserVideo`, `ChatSession`).
- **Database Flexibility**:
  - **Local Development**: Runs with zero setup on SQLite (`sqlite:///./users.db`).
  - **Cloud Deployment**: Set `DATABASE_URL=postgresql://...` to connect to hosted PostgreSQL (Neon, Supabase, Render Postgres) without code modifications.

---

## API Endpoints

### Public Endpoints
- `GET /` — Serves the frontend application template.
- `GET /health` — Health check endpoint used by uptime monitors and container orchestrators.
- `GET /favicon.ico` — Returns the brand SVG squircle favicon.
- `POST /login` — Authenticates user credentials and returns a JWT bearer token.

### Video Processing & Library (Protected)
- `POST /process_video` — Ingests YouTube video ID/URL, fetches subtitles, splits, embeds into Pinecone, and attaches to user library. Reuses existing namespace if already indexed.
- `POST /process_video_manual` — Ingests a manually provided transcript when captions are unavailable.
- `GET /videos` — Retrieves the authenticated user's indexed video library.
- `DELETE /videos/{video_id}` — Removes video from the library, clears backend retriever cache, and wipes its Pinecone namespace.

### Chat Sessions (Protected)
- `GET /chats` — Lists all conversation summaries for the authenticated user.
- `GET /chats/{chat_id}` — Retrieves full message history and metadata for a specific chat.
- `POST /chats` — Saves or updates a chat session.
- `DELETE /chats/{chat_id}` — Deletes an individual chat session.
- `DELETE /chats` — Permanently clears all chat sessions for the authenticated user.

### Question Answering (Protected)
- `POST /ask` — Streams context-aware answers with `[MM:SS]` citations via Server-Sent Events (SSE).

---

## Frontend Experience

The frontend is built with **Jinja2, HTML5, CSS3, and ES6+ JavaScript** with zero heavy frameworks:

- **Hardware Studio Console (Screen 0)**: Interactive hardware dashboard with audio visualizer telemetry, live transcript ticker, and particle canvas background.
- **ChatGPT-Style Collapsible Sidebar Rail (Screen 1)**: Unified toggle switches between 260px expanded and 58px compact icon rail modes. Features shortcuts for New Chat, Video Library, Ingest, and Chat History.
- **Video Knowledge Base Modal**: Full-screen dialog with search filtering, grid/list view switcher, and 1-click video/namespace deletion.
- **Ingest YouTube Video Modal**: Input dialog with instant URL parsing, live thumbnail preview, and a collapsible manual transcript drawer.
- **Interactive Timestamp Pills**: Real-time markdown parser renders `[MM:SS]` citations as `.citation-pill` buttons linking directly to YouTube playback (`&t=...s`).
- **Streamlined Floating Dock**: Symmetrical input bar with auto-expanding textarea, keyboard shortcuts (`Enter` to submit, `Shift+Enter` for newline), and model grounding indicators.
- **Client-Side SSE Streaming**: Real-time token streaming using `fetch()` and `ReadableStream` reader with active `AbortController` ("Stop generating") support.
- **Markdown & Code Highlighting**: Client-side rendering via `marked.js` and `highlight.js` with one-click code block copy buttons.
- **Dark-Theme Autofill Protection**: Browser autofill styled with inset shadows to eliminate bright white user-agent input backgrounds.

---

## Project Structure

```text
youtube-rag-assistant/
│
├── Dockerfile                         # Unified multi-stage Docker build using uv
├── .dockerignore
├── pyproject.toml                     # Project metadata and dependencies
├── uv.lock                            # Deterministic frozen dependency lockfile
├── render.yaml                        # Render deployment configuration
├── .env.example                       # Environment configuration template
├── README.md                          # Project documentation
│
├── backend/
│   ├── main.py                        # FastAPI lifespan, routes, static mounts, favicon
│   ├── eval_precision.py              # Offline precision evaluation benchmark
│   ├── .env                           # Local environment variables
│   │
│   ├── api/
│   │   └── routes.py                  # Endpoints for auth, videos, chats, and SSE /ask
│   │
│   └── src/
│       ├── auth.py                    # JWT token creation, validation, password hashing
│       ├── database.py                # SQLAlchemy models (User, UserVideo, ChatSession)
│       │
│       └── rag/
│           ├── __init__.py
│           ├── ingest.py              # Timestamp aggregation, direct & proxy fetching
│           ├── splitter.py            # Sentence & timecode boundary-aware splitting
│           ├── embeddings.py          # text-embedding-3-small, Pinecone vector store
│           ├── retriever.py           # Dense retrieval and lightweight cross-encoder
│           └── chains.py              # Grounded LLM prompt & SSE streaming generator
│
└── frontend/
    ├── templates/
    │   ├── base.html                  # Base HTML layout, CDN assets, favicon links
    │   └── index.html                 # Main interface (Console, Collapsible Rail, Modals)
    │
    ├── static/
    │   ├── favicon.svg                # Brand squircle play SVG favicon
    │   ├── css/
    │   │   └── style.css              # Obsidian dark theme, layout, modals, citation pills
    │   └── js/
    │       ├── api.js                 # API client, JWT management, SSE streaming reader
    │       └── app.js                 # UI controller, state sync, citation decorator
    │
    └── legacy_streamlit_app.py        # Preserved original Streamlit application
```

---

## Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/Maddy-MM/youtube-rag-assistant.git
cd youtube-rag-assistant
```

### 2. Install Dependencies with `uv`

[Astral `uv`](https://docs.astral.sh/uv/) installs and locks Python dependencies in seconds:

```bash
# Install uv (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh      # macOS / Linux
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"  # Windows

# Sync virtual environment from uv.lock
uv sync
```

### 3. Configure Environment Variables

Create a `.env` file in the `backend/` directory (or copy `.env.example`):

```ini
# --- OpenAI Configuration ---
# Required for text-embedding-3-small embeddings and default chat model
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# --- Chat Model Toggle ---
# Set to "openai" (recommended) or "huggingface"
CHAT_PROVIDER=openai
OPENAI_CHAT_MODEL=gpt-5-nano

# --- HuggingFace (Required if CHAT_PROVIDER=huggingface) ---
HUGGINGFACEHUB_API_TOKEN=your_token_here
HUGGINGFACE_CHAT_MODEL=openai/gpt-oss-20b

# --- Authentication & Credentials ---
JWT_SECRET=your_long_random_jwt_secret_here
DEFAULT_USER=admin
DEFAULT_PASS=your_secure_password

# --- Pinecone Vector Database ---
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=ytlens

# --- Database Persistence ---
# Defaults to local SQLite ('sqlite:///./users.db') if omitted.
# For cloud persistence (Render, Neon, Supabase PostgreSQL), provide connection string:
# DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# --- Webshare Residential Proxy (Optional) ---
# Used for cloud IP bypass when fetching YouTube subtitles
WEBSHARE_USER=
WEBSHARE_PASS=

# --- Neural Reranker (Optional) ---
# Set to "true" only on machines with >= 1GB RAM. Default is "false"
# for memory-constrained hosts (e.g. Render 512MB free tier).
ENABLE_RERANKER=false
RERANKER_MODEL=cross-encoder/ms-marco-MiniLM-L-2-v2
```

---

## How to Run

### Development Mode

Run the unified FastAPI server with hot-reloading:

```bash
uv run uvicorn backend.main:app --reload --port 8000
```

*(Alternatively, switch into `backend/` and run `uv run uvicorn main:app --reload --port 8000`).*

Access the application in your browser:
👉 **`http://localhost:8000`**

Log in using the `DEFAULT_USER` and `DEFAULT_PASS` configured in your `.env`.

---

## Deployment Architecture

- **Unified Docker Deployment**: A single Docker container built with `uv sync --frozen` serves both the FastAPI API and the frontend templates/static assets.
- **Dynamic Port Binding**: Dockerfile uses `CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]` compatible with Render, Railway, and Fly.io.
- **Decoupled Vector Index**: Pinecone serverless vector index with `text-embedding-3-small` (1536-dim, cosine similarity). Namespaces persist across container restarts.
- **Zero CORS / Domain Drift**: Both API and frontend share the same origin, avoiding complex cross-origin cookies or CORS preflight latency.
- **Cold Start Mitigation**: UptimeRobot pings `GET /health` every 5 minutes to prevent sleep on free tier hosts.

---

## Transcript Fetching Strategy

Cloud server IPs (Render, AWS, GCP) are frequently rate-limited or blocked by YouTube. YTLens uses a 3-layer fetching strategy to ensure resilience:

1. **Layer 1 — Direct API Fetch**: Attempts a direct connection using `youtube-transcript-api`. Fast and reliable locally.
2. **Layer 2 — Residential Proxy via Webshare**: If direct fetch fails and Webshare credentials exist, retries via residential proxy with a strict 3-second thread timeout (`ThreadPoolExecutor`). If credentials are not set, this layer is skipped instantly with 0ms overhead.
3. **Layer 3 — Manual Transcript Paste**: If automated retrieval fails, the UI surfaces a manual transcript drawer. The user pastes the transcript, which is processed through the exact same chunking, embedding, and vector storage pipeline.

---

## Current Limitations & Tradeoffs

- **Ephemeral SQLite on Render Free Tier**: Without setting `DATABASE_URL`, SQLite resets on container redeploy (though Pinecone vector namespaces persist). Setting `DATABASE_URL` to Supabase or Neon provides permanent persistence.
- **Memory Optimization on 512MB Hosts**: The cross-encoder reranker is disabled by default (`ENABLE_RERANKER=false`) to avoid OOM crashes on free-tier 512MB containers. Pinecone's dense similarity ranking is used instead.
- **Timestamp Precision on Manual Transcripts**: Manual paste transcripts without `[MM:SS]` tags will answer accurately but cannot generate millisecond-aligned jump links unless timecodes are included in the source text.
- **Pinecone Cache Invalidation**: Previously ingested videos reuse existing namespaces. To refresh embeddings (e.g. after updating timestamp chunking), delete the video from the library first to wipe its Pinecone namespace, then re-ingest.

---

## Future Improvements

- [ ] Upgraded residential proxy pool for 100% automated cloud subtitle retrieval.
- [ ] Multi-video cross-comparison search across an entire user library.
- [ ] Automated video summary generation and key topic extraction upon ingest.
- [ ] Automated CI/CD testing pipeline using GitHub Actions.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Backend Framework** | FastAPI, Uvicorn, Pydantic |
| **Package Management** | Astral `uv`, `pyproject.toml`, `uv.lock` |
| **RAG & Orchestration** | LangChain (`langchain-core`, `langchain-openai`, `langchain-community`, `langchain-pinecone`) |
| **Vector Database** | Pinecone Serverless (1536-dim, cosine metric, namespaced) |
| **Embeddings** | OpenAI `text-embedding-3-small` |
| **LLM Inference** | OpenAI (`gpt-5-nano`), Hugging Face Inference API (`openai/gpt-oss-20b`) |
| **Reranking** | `sentence-transformers` (`cross-encoder/ms-marco-MiniLM-L-2-v2`) |
| **Database & Auth** | SQLite / PostgreSQL, SQLAlchemy, `python-jose` (JWT), `passlib`, `bcrypt` |
| **Transcript Pipeline** | `youtube-transcript-api` v1.2.4, Webshare Proxy |
| **Frontend** | Jinja2, HTML5, Modern CSS3 (Obsidian Dark), Vanilla ES6+ JavaScript |
| **Client Libraries** | `marked.js` (Markdown), `highlight.js` (Syntax Highlighting) |
| **Streaming** | Server-Sent Events (SSE) via `fetch()` `ReadableStream` |
| **Deployment** | Docker multi-stage, Render, UptimeRobot |
