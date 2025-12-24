from fastapi import FastAPI, APIRouter, HTTPException, Request, UploadFile, File
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import re
import tempfile

# ✅ OpenAI (official)
from openai import AsyncOpenAI

# Calendar integrations (unchanged)
from calendar_integration import *
from outlook_integration import *

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env", override=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vox")

# --- ENV ---
MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not all([MONGO_URL, DB_NAME, OPENAI_API_KEY]):
    raise RuntimeError("Missing required env vars")

# --- DB ---
mongo = AsyncIOMotorClient(MONGO_URL)
db = mongo[DB_NAME]

# --- OpenAI ---
openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

# --- APP ---
app = FastAPI()
api = APIRouter(prefix="/api")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================
# MODELS
# ============================

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

class ChatResponse(BaseModel):
    response: str

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============================
# SYSTEM PROMPT
# ============================

VOX_SYSTEM_PROMPT = """You are Vox, a calm personal AI assistant.
Be concise. Ask only one question max.
Never pressure or guilt.
"""

# ============================
# LLM
# ============================

async def chat_with_llm(system_prompt: str, user_text: str) -> str:
    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text}
            ],
            temperature=0.4,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"LLM error: {e}")
        raise HTTPException(status_code=500, detail="LLM failure")

# ============================
# ROUTES
# ============================

@api.get("/health")
async def health():
    return {"status": "ok"}

@api.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    response = await chat_with_llm(VOX_SYSTEM_PROMPT, req.message)

    await db.messages.insert_many([
        Message(role="user", content=req.message).model_dump(),
        Message(role="assistant", content=response).model_dump(),
    ])

    return ChatResponse(response=response)

@api.get("/chat/history/{session_id}", response_model=List[Message])
async def history(session_id: str):
    msgs = await db.messages.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("timestamp", 1).to_list(100)

    for m in msgs:
        if isinstance(m["timestamp"], str):
            m["timestamp"] = datetime.fromisoformat(m["timestamp"])
    return msgs

# ============================
# TRANSCRIPTION (Whisper)
# ============================

@api.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    data = await file.read()

    with tempfile.NamedTemporaryFile(delete=False) as f:
        f.write(data)
        path = f.name

    try:
        with open(path, "rb") as audio:
            result = await openai_client.audio.transcriptions.create(
                file=audio,
                model="whisper-1"
            )
        return {"text": result.text}
    finally:
        os.unlink(path)

# ============================
# REGISTER
# ============================

app.include_router(api)

@app.on_event("shutdown")
async def shutdown():
    mongo.close()
