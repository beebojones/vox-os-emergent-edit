from fastapi import FastAPI, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
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

@router.post("/chat/history/{session_id}")
async def add_chat_history(session_id: str, payload: Dict[str, Any]):
    msg = {
        "id": str(datetime.utcnow().timestamp()),
        "role": payload.get("role", "user"),
        "content": payload.get("content", ""),
    }
    CHAT_HISTORY.setdefault(session_id, []).append(msg)
    return {"ok": True, "message": msg}

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
