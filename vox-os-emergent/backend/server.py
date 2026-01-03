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


