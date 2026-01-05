from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from pathlib import Path
from datetime import datetime
from pydantic import BaseModel, EmailStr
from passlib.hash import pbkdf2_sha256
from bson import ObjectId
import os
import logging
from fastapi.responses import RedirectResponse

# ====================
# BASIC APP (NO DB YET)
# ====================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vox")

app = FastAPI(title="Vox Console")

# ====================
# CANARY (CRITICAL)
# ====================

@app.get("/__canary__")
async def canary():
    return {"ok": True}

# ====================
# STATIC FILES
# ====================

BASE_DIR = Path(__file__).parent
app.mount("/static", StaticFiles(directory="static"), name="static")

# ====================
# SESSION
# ====================

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "dev-secret"),
    https_only=True,
    same_site="none",
    session_cookie="vox_session",
)

# ====================
# CORS
# ====================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://voxconsole.com",
        "https://www.voxconsole.com",
        "https://vox-os-emergent-edit.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================
# ROUTER
# ====================

api = APIRouter(prefix="/api")
app.include_router(api)

# ====================
# SAFE DASHBOARD CONTRACTS
# ====================

@api.get("/health")
async def health():
    return {"status": "ok"}

@api.get("/calendar")
async def calendar():
    return {"items": []}

@api.get("/tasks")
async def tasks():
    return {"items": []}

@api.get("/memories")
async def memories():
    return {"items": []}

@api.get("/status")
async def status():
    return {"status": "ok"}

@api.get("/providers")
async def providers():
    return {"items": []}

@api.get("/default")
async def default():
    return {"ok": True}

@app.get("/dashboard")
def dashboard_redirect():
    return RedirectResponse("https://vox-os-emergent-edit.vercel.app/")

# ====================
# SAFE DEFAULTS + MISSING ROUTES
# ====================

from typing import Dict, List, Any
from datetime import datetime

# In-memory chat storage: { session_id: [ {id, role, content} ] }
CHAT_HISTORY: Dict[str, List[Dict[str, Any]]] = {}


def _is_google_configured() -> bool:
    # Adjust env var names if yours differ
    return bool(os.getenv("GOOGLE_CLIENT_ID") and os.getenv("GOOGLE_CLIENT_SECRET"))


def _is_outlook_configured() -> bool:
    return bool(os.getenv("OUTLOOK_CLIENT_ID") and os.getenv("OUTLOOK_CLIENT_SECRET"))


def _get_session_email(request: Request, key: str) -> str:
    # Optional: if you store email in session
    try:
        return (request.session.get(key) or "").strip()
    except Exception:
        return ""


@router.get("/auth/google/status")
async def google_status(request: Request):
    # If you later store tokens in session, set these keys accordingly.
    # For now: connected if a token exists in session
    tokens = None
    try:
        tokens = request.session.get("google_tokens")
    except Exception:
        tokens = None

    connected = bool(tokens)
    email = _get_session_email(request, "google_email")

    return {"configured": _is_google_configured(), "connected": connected, "email": email}


@router.get("/auth/outlook/status")
async def outlook_status(request: Request):
    tokens = None
    try:
        tokens = request.session.get("outlook_tokens")
    except Exception:
        tokens = None

    connected = bool(tokens)
    email = _get_session_email(request, "outlook_email")

    return {"configured": _is_outlook_configured(), "connected": connected, "email": email}


@router.get("/auth/calendar/providers")
async def calendar_providers():
    # Frontend expects response.data.providers
    providers = [
        {
            "id": "google",
            "name": "Google Calendar",
            "enabled": True,
            "configured": _is_google_configured(),
            "message": "OAuth not configured on server" if not _is_google_configured() else "",
        },
        {
            "id": "outlook",
            "name": "Outlook Calendar",
            "enabled": True,
            "configured": _is_outlook_configured(),
            "message": "OAuth not configured on server" if not _is_outlook_configured() else "",
        },
    ]
    return {"providers": providers}


@router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    # Frontend expects an array of messages
    return CHAT_HISTORY.get(session_id, [])


@router.delete("/chat/history/{session_id}")
async def clear_chat_history(session_id: str):
    CHAT_HISTORY[session_id] = []
    return {"ok": True}


@router.post("/chat/history/{session_id}")
async def add_chat_history_message(session_id: str, payload: Dict[str, Any]):
    # Optional helper if you ever want to save chat history directly
    role = payload.get("role", "user")
    content = payload.get("content", "")
    msg = {"id": f"{datetime.utcnow().timestamp()}", "role": role, "content": content}

    CHAT_HISTORY.setdefault(session_id, []).append(msg)
    return {"ok": True, "message": msg}

# ====================
# PAGES
# ====================

@app.get("/")
async def splash():
    return RedirectResponse("/static/splash.html")

@app.get("/login")
async def login_page():
    return RedirectResponse("/static/login.html")

@app.get("/signup")
async def signup_page():
    return FileResponse(BASE_DIR / "static/signup.html")

# ====================
# REGISTER API
# ====================

app.include_router(api)




