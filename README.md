# YTLens

A **Retrieval-Augmented Generation (RAG) system** that allows users to ask questions about any YouTube video using its transcript. The system retrieves relevant context and generates grounded, streamed responses using a Large Language Model.

---

## Table of Contents

1. Overview
2. Features
3. Project Workflow
4. RAG Pipeline Architecture
5. Retrieval Evaluation
6. Authentication
7. API Endpoints
8. Frontend
9. Project Structure
10. Installation & Setup
11. How to Run
12. Deployment Architecture
13. Transcript Fetching Strategy
14. Current Limitations & Tradeoffs
15. Future Improvements
16. Tech Stack

---

## Overview

This project implements an **end-to-end GenAI pipeline** with a unified architecture:

- **FastAPI backend & server** handles the RAG pipeline, authentication, and serves the frontend templates and static assets
- **Jinja2 + HTML/CSS/JS frontend** provides a responsive, Claude-inspired chat interface with token-by-token streaming and YouTube dark branding
- **High-speed package management with `uv`** for lightning-fast local installations and optimized Docker builds

The system ensures responses remain **grounded in transcript data** to reduce hallucinations.

---

## Live Demo

- **Application:** [ytlens.madhavmakwana.dev](https://ytlens.madhavmakwana.dev)

> **Note:** The application is hosted on Render and may take 30–60 seconds to wake up on the first request if the container is sleeping.

---

## Features

- JWT-authenticated access — protected endpoints require login
- Ask questions about any YouTube video
- Two-layer transcript fetching with graceful degradation
- Residential proxy support via Webshare for cloud IP bypass — skipped automatically if credentials are not configured, adding zero latency
- Manual transcript paste fallback when auto-fetch fails
- Persistent, namespaced vector storage via Pinecone — processed videos survive backend restarts and redeploys
- Cross-encoder reranking on top of dense retrieval, validated against a labeled evaluation set rather than assumed
- Dual chat model support — easily switch between OpenAI (e.g., `gpt-5-nano`) and free open-source models via Hugging Face
- Streaming LLM responses (SSE) — answers render token-by-token instead of blocking on full generation
- Claude-inspired two-pane chat interface with YouTube dark branding
- Modular API-based backend serving Jinja2 templates and static assets
- Unified Docker deployment on Render with high-speed `uv` dependency management
- UptimeRobot health monitoring to prevent cold starts on Render free tier

---

## Project Workflow

1. User logs in with username and password
2. JWT token issued and stored for the session
3. User provides a YouTube video URL
4. Extract video ID
5. Attempt transcript fetch — direct, then proxy (if credentials configured), then manual paste
6. Split transcript into chunks
7. Generate embeddings
8. Store embeddings in Pinecone, namespaced by video ID — reused across redeploys if the video was already processed
9. Retrieve relevant chunks based on the user's question via dense similarity search
10. Rerank the candidate chunks with a cross-encoder for final relevance ordering
11. Pass reranked context + query to the LLM
12. Stream the generated response back to the client token-by-token

---

## RAG Pipeline Architecture

### Transcript Extraction

- Uses `youtube-transcript-api` v1.2.4
- Two-layer fetching strategy (see Transcript Fetching Strategy section)
- Attempts English transcript first, falls back to any available language

### Text Splitting

- `RecursiveCharacterTextSplitter` tuned for transcript content
- Chunk size: 600
- Overlap: 150
- Custom separators prioritise sentence boundaries (`". "`, `"? "`, `"! "`) before falling back to word boundaries — minimises mid-sentence cuts common in transcript text

### Embeddings

- Model: `text-embedding-3-small` (via OpenAI API)
- Output dimension: 1536
- Superior MTEB retrieval performance compared to local CPU models, while keeping server RAM and CPU footprint minimal

### Vector Store

- **Pinecone** (serverless, free tier) — namespaced per video ID
- **Namespaced per video ID** — each video's chunks live in an isolated namespace, so retrieval for one video can never leak chunks from another, and the namespace doubles as an "already processed" check
- Vectors persist across backend restarts and redeploys

### Retrieval

- **Production path:** dense similarity search against Pinecone, followed by cross-encoder reranking
- **Evaluated but not shipped:** a hybrid BM25 + dense retriever fused via Reciprocal Rank Fusion (RRF) was built and benchmarked (see `eval_precision.py`) but measurably *underperformed* dense-only retrieval at this project's per-video corpus scale (~10–15 chunks/video) — BM25's term-frequency statistics are too noisy on a corpus that small to add useful signal.
- **Reranking:** `BAAI/bge-reranker-base` cross-encoder re-scores the top dense candidates against the specific question before the final top-k is passed to the LLM

### LLM (Chat Model)

- **Switchable Providers**: Easily toggle between OpenAI and Hugging Face via the `CHAT_PROVIDER` environment variable:
  - **OpenAI (Production / Default)**: Uses `gpt-5-nano` (or configurable model) for fast, high-quality reasoning.
  - **Hugging Face (Free Testing)**: Uses `openai/gpt-oss-20b` (or any Hugging Face inference model) for zero-cost testing.
- Temperature: 0.2
- Structured prompt with numbered excerpts (`[Excerpt 1]`, `[Excerpt 2]`...) and strict groundedness instructions
- Responses are **streamed via Server-Sent Events (SSE)** — the backend yields tokens as they're generated rather than waiting for the full completion

---

## Retrieval Evaluation

Rather than assuming hybrid retrieval or reranking would improve answer quality, both were measured directly with a standalone script, `eval_precision.py`.

**Method:** 5 short YouTube videos across distinct topics (AI/ML, algorithms, biology, finance, chemistry), 5 hand-labeled questions each (25 total), each paired with a keyword confirmed to appear in the transcript segment that actually answers it. For every question, four retrieval configurations were compared on whether the labeled-relevant chunk appeared in the top 3 results:

| Configuration | Precision@3 |
|---|---|
| Dense-only (baseline) | 88% |
| Hybrid RRF (BM25 + dense, no rerank) | 84% |
| Dense + cross-encoder reranking | 92% |
| Hybrid + cross-encoder reranking | 92% |

**Finding:** hybrid fusion alone *underperformed* dense-only retrieval, reproducibly, across two independent runs and two different candidate-pool sizes. Cross-encoder reranking was the actual driver of the precision improvement — a **33% relative reduction in top-3 retrieval misses** (from 3/25 to 2/25) over dense-only MMR. This finding directly shaped the production architecture: **dense retrieval + reranking**, without hybrid BM25 fusion.

---

## Authentication

YTLens uses **JWT-based authentication**. A login is required before accessing any part of the application.

- Passwords are hashed with **bcrypt** — no plaintext passwords are stored
- On login, the backend issues a signed JWT token valid for 8 hours
- All protected endpoints verify the token via a FastAPI `HTTPBearer` dependency
- User data is persisted in **SQLite via SQLAlchemy**
- A default admin user is seeded from environment variables on every backend startup

> **Note on Render's free tier:** Render has an ephemeral filesystem — the SQLite database is wiped on every redeploy. The default admin user is re-seeded automatically on startup so the app is always accessible. Registered users added at runtime will not survive a redeploy. Migrating to a persistent database (Neon, Supabase) is a straightforward connection string change.

**Public endpoints:** `/health`, `/login`

**Protected endpoints:** `/process_video`, `/process_video_manual`, `/ask`

---

## API Endpoints

### Health Check

`GET /health` — Returns `{"status": "ok"}` instantly with no ML or DB calls. Used by UptimeRobot to ping the backend every 5 minutes to keep the Render free tier container warm.

### Login

`POST /login` — Accepts `username` and `password`. Returns a signed JWT `access_token` on success, HTTP 401 on invalid credentials.

### Process Video

`POST /process_video` _(protected)_ — Attempts to fetch transcript automatically and builds (or reuses, if the Pinecone namespace already exists) the video's vector store. Returns `{"error": "fallback"}` if both fetch layers fail, signalling the frontend to show the manual paste UI.

### Process Video Manual

`POST /process_video_manual` _(protected)_ — Accepts a manually pasted transcript and runs it through the same pipeline as an auto-fetched transcript — split, embed, store. The `/ask` endpoint works identically regardless of how the transcript arrived.

### Ask Question

`POST /ask` _(protected)_ — Streams a context-aware answer as **Server-Sent Events**, retrieved via dense similarity search and reranked with a cross-encoder before generation. The client reads tokens progressively rather than waiting for a single JSON response.

---

## Frontend

Built with **Jinja2, vanilla HTML5, CSS3, and modern JavaScript**:

- **Claude-Inspired Two-Pane Layout**: Collapsible left sidebar (video thumbnail, title, direct YouTube link, switch video action, logout) alongside a centered chat conversation thread.
- **YouTube Dark Branding**: Custom dark palette (`#0f0f0f` background, `#181818` card surfaces, `#FF0000` accents).
- **Single-Page Experience (SPA)**: Fluid animated transitions between Login, Video Setup / Fallback, and Chat Interface without page reloads.
- **Client-Side SSE Streaming**: Real-time token streaming using `fetch()` with `ReadableStream` reader, animated typing cursor, and an active **"Stop generating" (AbortController)** button.
- **Rich Markdown & Syntax Highlighting**: Real-time markdown parsing with `marked.js` and code syntax highlighting with `highlight.js` (including one-click code copy buttons).
- **Session Persistence**: Browser `localStorage` retains the JWT auth token and active video metadata across page refreshes.

### User Flow

1. Sign in with username and password
2. Paste video link and click Analyse Video
3. Preview video thumbnail and title
4. Start chatting — answers stream in token-by-token with full markdown formatting

---

## Project Structure

```text
youtube-rag-assistant/
│
├── Dockerfile                         # Unified Dockerfile using uv (serves API + static + templates)
├── Dockerfile.dockerignore
├── README.md
│
├── backend/
│   ├── requirements.txt               # Dependencies (including jinja2)
│   ├── requirements.lock              # Deterministic uv lockfile
│   ├── main.py                        # FastAPI lifespan, static mounts, and Jinja2 route
│   │
│   ├── src/
│   │   ├── auth.py
│   │   ├── database.py
│   │   │
│   │   └── rag/
│   │       ├── __init__.py
│   │       ├── ingest.py
│   │       ├── splitter.py
│   │       ├── embeddings.py
│   │       ├── retriever.py
│   │       └── chains.py
│   │
│   ├── api/
│   │   └── routes.py
│   │
│   ├── eval_precision.py
│   │
│   └── .env
│
└── frontend/
    ├── templates/
    │   ├── base.html                  # HTML5 base layout (marked.js, highlight.js, Inter font)
    │   └── index.html                 # Main template (Login, Video Ingest, Chat views)
    │
    ├── static/
    │   ├── css/
    │   │   └── style.css              # YouTube dark theme, Claude-like layout
    │   └── js/
    │       ├── api.js                 # API client, SSE streaming via fetch ReadableStream
    │       └── app.js                 # UI state controller, markdown rendering, auto-scroll
    │
    └── legacy_streamlit_app.py        # Preserved original Streamlit app as backup
```

---

## Installation & Setup

### Clone Repository

```bash
git clone https://github.com/<your-username>/ytlens.git
cd ytlens
```

### Install with `uv` (Recommended)

`uv` resolves and installs all dependencies in seconds:

```bash
# Sync environment from uv.lock
uv sync
```

### Environment Variables

Create a `.env` file in the `backend/` directory (or copy `.env.example`):

```ini
# OpenAI (Required for text-embedding-3-small and optional chat)
OPENAI_API_KEY=your_openai_api_key_here

# Chat Model Toggle: "openai" (recommended) or "huggingface" (free test endpoint)
CHAT_PROVIDER=openai
OPENAI_CHAT_MODEL=gpt-5-nano

# HuggingFace (Required if CHAT_PROVIDER=huggingface)
HUGGINGFACEHUB_API_TOKEN=your_token_here
HUGGINGFACE_CHAT_MODEL=openai/gpt-oss-20b

# Authentication & Admin Credentials
JWT_SECRET=your_long_random_secret_string
DEFAULT_USER=your_admin_username
DEFAULT_PASS=your_admin_password

# Pinecone Vector Database
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=ytlens

# Optional: Residential Proxy
WEBSHARE_USER=your_webshare_username
WEBSHARE_PASS=your_webshare_password
```

> `OPENAI_API_KEY` is required for vector embeddings (`text-embedding-3-small`) and for the chat model when `CHAT_PROVIDER=openai`.

> `CHAT_PROVIDER` lets you switch instantly between `"openai"` (e.g. `gpt-5-nano`) and `"huggingface"` (free inference endpoint).

> `WEBSHARE_USER` and `WEBSHARE_PASS` are optional — if not set the proxy layer is skipped entirely with zero added latency.

> `PINECONE_API_KEY` is required — the app creates the 1536-dimension index automatically on first run if it doesn't already exist.

---

## How to Run

Run the unified FastAPI app (serves both API and frontend):

```bash
cd backend
uv run uvicorn main:app --reload --port 8000
```

*(Or simply `uvicorn main:app --reload --port 8000` with your virtual environment active).*

Open your browser at:
👉 **`http://127.0.0.1:8000`**

---

## Deployment Architecture

- **Unified Render Service**: Deployed as a single Dockerized FastAPI service on Render running on port 10000.
- **Fast Builds with `uv`**: Docker builds use `ghcr.io/astral-sh/uv` to install dependencies in ~30–45s instead of 3–5 minutes.
- **Decoupled Vector Storage**: Pinecone serverless vector database (`bge-small-en-v1.5` embeddings, cosine metric, namespaced per video ID).
- **Communication**: REST API with JWT Bearer token authentication; `/ask` responses stream via Server-Sent Events (SSE).
- **Zero CORS / Domain Issues**: Frontend and backend are hosted on the exact same domain on Render.
- **Uptime Monitoring**: UptimeRobot monitors `/health` every 5 minutes to keep the backend warm on Render's free tier.

---

## Transcript Fetching Strategy

YouTube blocks transcript fetch requests from cloud server IPs (Render, Streamlit Cloud, AWS, GCP etc.) because they originate from well-known datacenter IP ranges. This required building a robust two-layer fetching strategy with graceful degradation.

### Layer 1 — Direct Fetch

The system first attempts a direct fetch using `youtube-transcript-api` with no proxy. This works reliably in local environments and occasionally succeeds on cloud too depending on YouTube's current blocklist state. Tries English first, falls back to any available language.

### Layer 2 — Residential Proxy via Webshare

If the direct fetch fails and Webshare credentials are configured, the system retries using a Webshare residential proxy via the v1.2.4 `WebshareProxyConfig` API passed into the `YouTubeTranscriptApi` constructor. A hard 3-second timeout is enforced using `ThreadPoolExecutor` at the OS thread level — this kills the proxy attempt after exactly 3 seconds regardless of what the library does internally, including its own retry logic. `HTTPAdapter(max_retries=0)` is also set to prevent HTTP-level retries.

If credentials are not set, this layer is skipped instantly with no latency — making it safe to deploy without a paid proxy plan while keeping the full architecture intact for when credentials are added.

> **Note on the free tier:** Webshare's free tier provides shared datacenter proxies, not true residential proxies. These get blocked by YouTube just like regular cloud IPs. A paid Webshare residential proxy plan makes this layer fully reliable.

### Layer 3 — Manual Transcript Paste

If both fetch attempts fail, the backend returns `{"error": "fallback"}` and the frontend shows a manual paste UI directing the user to [youtubetotranscript.com](https://youtubetotranscript.com/). The pasted transcript is submitted to `/process_video_manual` and passed through the identical pipeline — split, embed, store — so the chat experience is unchanged.

---

## Current Limitations & Tradeoffs

- **Ephemeral user storage on Render free tier** — SQLite is wiped on every redeploy; the default admin is re-seeded automatically. Migrating to Neon or Supabase PostgreSQL is a one-line connection string change
- **Transcript availability** — videos without captions fall back gracefully to the manual paste UI; no video is ever a hard failure
- **Webshare free tier** — the proxy architecture is fully implemented; reliable auto-fetch on cloud requires upgrading to a paid residential proxy plan
- **Hybrid retrieval was evaluated, not shipped** — BM25+dense RRF fusion is implemented and benchmarked in `eval_precision.py` but intentionally excluded from production after measurement showed it underperformed dense-only retrieval at this project's per-video corpus scale
- **Reranker cold start** — the cross-encoder model (~110MB) loads lazily on the first `/ask` call rather than at server startup, so the very first question after a deploy is slower than subsequent ones

---

## Future Improvements

- Paid Webshare residential proxy plan for reliable auto-fetch on cloud
- Persistent database (Neon / Supabase) for stable multi-user support
- Multi-video querying
- CI/CD pipeline
- Re-evaluate hybrid retrieval with a tuned (non-equal) BM25/dense weighting and a larger, held-out evaluation set, separate from the one used to make the current dense-only decision

---

## Tech Stack

### Backend

- FastAPI
- LangChain (`langchain-core`, `langchain-community`, `langchain-openai`, `langchain-huggingface`)
- Pinecone (serverless vector store, 1536-dim, namespaced per video)
- OpenAI API (`text-embedding-3-small` embeddings, `gpt-5-nano` chat model)
- Hugging Face Inference API (`openai/gpt-oss-20b` optional chat model, `BAAI/bge-reranker-base` cross-encoder)
- youtube-transcript-api v1.2.4
- SQLite + SQLAlchemy
- JWT authentication (python-jose, passlib, bcrypt)
- Webshare residential proxies
- `rank_bm25` (retrieval evaluation benchmark only)

### Frontend

- Jinja2 template engine
- Modern vanilla HTML5 / CSS3 / JavaScript (ES6+)
- `marked.js` (client-side markdown parsing)
- `highlight.js` (code syntax highlighting with copy buttons)
- Server-Sent Events (SSE) streaming via `fetch()` `ReadableStream` reader

### Deployment & Tooling

- `uv` (modern Python package and project manager)
- Docker (unified multi-stage container)
- Render (web service hosting)
- UptimeRobot (health monitoring)
