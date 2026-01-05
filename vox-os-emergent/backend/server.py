from fastapi import FastAPI, APIRouter, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from openai import OpenAI
import os
from typing import Dict, List, Any
from datetime import datetime

# ====================
# APP SETUP
# ====================

app = FastAPI()
router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://voxconsole.com",
        "https://vox-os-emergent-edit.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "vox-dev-secret"),
)

# ====================
# OPENAI
# ====================

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ====================
# IN-MEMORY STORES
# ====================

CHAT_HISTORY: Dict[str, List[Dict[str, Any]]] = {}

EVENTS: List[Dict[str, Any]] = []
TASKS: List[Dict[str, Any]] = []
MEMORIES: List[Dict[str, Any]] = []

# ====================
# HELPERS
# ====================

def google_configured() -> bool:
    return bool(os.getenv("GOOGLE_CLIENT_ID") and os.getenv("GOOGLE_CLIENT_SECRET"))

def outlook_configured() -> bool:
    return bool(os.getenv("OUTLOOK_CLIENT_ID") and os.getenv("OUTLOOK_CLIENT_SECRET"))

def session_value(request: Request, key: str) -> str:
    try:
        return request.session.get(key) or ""
    except Exception:
        return ""

# ====================
# CORE DATA ROUTES
# ====================

@router.get("/calendar")
async def get_calendar():
    return EVENTS

@router.get("/tasks")
async def get_tasks():
    return TASKS

@router.get("/memories")
async def get_memories():
    return MEMORIES

@router.post("/seed")
async def seed():
    if not EVENTS:
        EVENTS.append({
            "id": "evt-1",
            "title": "Welcome to Vox OS",
            "provider": "system"
        })

    if not TASKS:
        TASKS.append({
            "id": "tsk-1",
            "title": "Explore the dashboard",
            "status": "open"
        })

    if not MEMORIES:
        MEMORIES.append({
            "id": "mem-1",
            "content": "Vox OS initialized successfully"
        })

    return {"ok": True}

# ====================
# AUTH STATUS ROUTES
# ====================

@router.get("/auth/google/status")
async def google_status(request: Request):
    tokens = request.session.get("google_tokens")
    return {
        "configured": google_configured(),
        "connected": bool(tokens),
        "email": session_value(request, "google_email"),
    }

@router.get("/auth/outlook/status")
async def outlook_status(request: Request):
    tokens = request.session.get("outlook_tokens")
    return {
        "configured": outlook_configured(),
        "connected": bool(tokens),
        "email": session_value(request, "outlook_email"),
    }

@router.get("/auth/calendar/providers")
async def calendar_providers():
    return {
        "providers": [
            {
                "id": "google",
                "name": "Google Calendar",
                "enabled": True,
                "configured": google_configured(),
            },
            {
                "id": "outlook",
                "name": "Outlook Calendar",
                "enabled": True,
                "configured": outlook_configured(),
            },
        ]
    }

# ====================
# CHAT HISTORY ROUTES
# ====================

@router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    return CHAT_HISTORY.get(session_id, [])

@router.delete("/chat/history/{session_id}")
async def clear_chat_history(session_id: str):
    CHAT_HISTORY[session_id] = []
    return {"ok": True}

# ====================
# VOX BRAIN
# ====================

@router.post("/chat/send")
async def chat_send(payload: Dict[str, Any]):
    session_id = payload.get("session_id", "default")
    user_content = payload.get("content", "").strip()

    if not user_content:
        raise HTTPException(status_code=400, detail="Empty message")

    # Store user message
    user_msg = {
        "id": str(datetime.utcnow().timestamp()),
        "role": "user",
        "content": user_content,
    }
    CHAT_HISTORY.setdefault(session_id, []).append(user_msg)

    # Build conversation context
    conversation = [
        {
            "role": "system",
            "content": (
                "You are Vox, a calm, intelligent personal AI assistant. "
                "You are concise, thoughtful, and helpful. "
                "You speak naturally and clearly."
            ),
        }
    ]

    # Add recent history (cap at 20)
    for msg in CHAT_HISTORY[session_id][-20:]:
        conversation.append(
            {
                "role": msg["role"],
                "content": msg["content"],
            }
        )

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=conversation,
            temperature=0.7,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    assistant_content = response.choices[0].message.content

    assistant_msg = {
        "id": str(datetime.utcnow().timestamp()) + "-vox",
        "role": "assistant",
        "content": assistant_content,
    }

    CHAT_HISTORY[session_id].append(assistant_msg)

    return assistant_msg

# ====================
# STATUS
# ====================

@router.get("/status")
async def status():
    return {"status": "ok"}

# ====================
# MOUNT ROUTER
# ====================

app.include_router(router)
