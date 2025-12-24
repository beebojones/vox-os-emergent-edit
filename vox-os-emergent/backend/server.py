from fastapi import FastAPI, APIRouter, HTTPException, Request, UploadFile, File
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import re
import tempfile

# === ENV ===
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env", override=True)

# === LOGGING ===
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# === DATABASE ===
mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME")

if not mongo_url or not db_name:
    raise RuntimeError("Missing required environment variables: MONGO_URL and/or DB_NAME")

client = AsyncIOMotorClient(mongo_url)
db: AsyncIOMotorDatabase = client[db_name]

# === APP ===
app = FastAPI()

# === SESSION MIDDLEWARE (NEW) ===
SESSION_SECRET = os.environ.get("SESSION_SECRET", "dev-only-change-me")

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    https_only=True,
    same_site="lax",
    session_cookie="vox_session",
)

# === ROUTER ===
api_router = APIRouter(prefix="/api")

# === CORS ===
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# === HEALTH ===
@api_router.get("/health")
async def health():
    return {"status": "ok"}

# === ROOT ===
@api_router.get("/")
async def root():
    return {"message": "Vox OS API", "status": "online"}

# === CHAT PLACEHOLDER (UNCHANGED) ===
@api_router.post("/chat")
async def chat_placeholder():
    return {"message": "Chat endpoint placeholder"}

# === TRANSCRIBE PLACEHOLDER (UNCHANGED) ===
@api_router.post("/transcribe")
async def transcribe_placeholder():
    return {"message": "Transcription endpoint placeholder"}

# === SHUTDOWN ===
@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# === INCLUDE ROUTER ===
app.include_router(api_router)
