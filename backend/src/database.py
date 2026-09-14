import os
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

_base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_env_file = os.path.join(_base_dir, ".env")
if os.path.exists(_env_file):
    load_dotenv(_env_file)
else:
    load_dotenv()

_default_sqlite = f"sqlite:///{os.path.join(_base_dir, 'users.db')}"

DATABASE_URL = os.environ.get("DATABASE_URL", _default_sqlite)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine_kwargs = {"connect_args": {"check_same_thread": False}} if DATABASE_URL.startswith("sqlite") else {"pool_pre_ping": True}
engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    videos = relationship("UserVideo", back_populates="user", cascade="all, delete-orphan")
    chats = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")


class UserVideo(Base):
    __tablename__ = "user_videos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    video_id = Column(String, nullable=False)
    title = Column(String, default="YouTube Video")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="videos")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    video_id = Column(String, nullable=False)
    video_title = Column(String, default="YouTube Video")
    title = Column(String, default="New Chat")
    messages_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="chats")


def init_db():
    Base.metadata.create_all(bind=engine)