import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from api.routes import router
from dotenv import load_dotenv
from src.database import init_db, SessionLocal, User
from src.auth import get_user, create_user, hash_password
from src.rag.retriever import _get_reranker

load_dotenv()

# Resolve frontend directory — works in both local dev (../frontend)
# and Docker (/app/frontend) layouts.
_base = os.path.dirname(os.path.abspath(__file__))
_candidates = [
    os.path.join(_base, "frontend"),       # Docker: /app/frontend
    os.path.join(_base, "..", "frontend"),  # Local:  ../frontend
]
FRONTEND_DIR = next(
    (p for p in _candidates if os.path.isdir(os.path.join(p, "templates"))),
    _candidates[-1]
)
templates = Jinja2Templates(directory=os.path.join(FRONTEND_DIR, "templates"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()

    default_username = os.environ.get("DEFAULT_USER", "admin")
    default_password = os.environ.get("DEFAULT_PASS", "secret")

    db = SessionLocal()
    try:
        # Remove any other accounts so only the credentials in .env can log in
        db.query(User).filter(User.username != default_username).delete()

        user = get_user(db, default_username)
        if not user:
            create_user(db, default_username, default_password)
            print(f"Configured user '{default_username}' created.")
        else:
            user.hashed_password = hash_password(default_password)
            db.commit()
            print(f"Configured user '{default_username}' credentials synced.")
    finally:
        db.close()

    # Only pre-warm neural reranker if explicitly enabled (saves ~800MB RAM on 512MB hosts)
    if os.environ.get("ENABLE_RERANKER", "false").lower() in ("1", "true", "yes"):
        try:
            _get_reranker()
            print("Reranker model warmed up successfully.")
        except Exception as e:
            print(f"Warning: Reranker warm-up skipped: {e}")
    else:
        print("Running in memory-optimized mode (local neural reranker inactive, using Pinecone dense rank).")

    yield  # Application runs here


app = FastAPI(title="YouTube RAG API", lifespan=lifespan)
app.include_router(router)


@app.get("/")
async def index(request: Request):
    return templates.TemplateResponse(request, "index.html")


app.mount("/static", StaticFiles(directory=os.path.join(FRONTEND_DIR, "static")), name="static")