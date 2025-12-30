from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
import os
import logging
from passlib.context import CryptContext
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel

# ====================
# ENV + LOGGING
# ====================

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env", override=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vox")

# ====================
# REQUIRED ENV
# ====================

SESSION_SECRET = os.getenv("SESSION_SECRET")
MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME")

missing = []
if not SESSION_SECRET:
    missing.append("SESSION_SECRET")
if not MONGO_URL:
    missing.append("MONGO_URL")
if not DB_NAME:
    missing.append("DB_NAME")

if missing:
    raise RuntimeError(f"Missing required env var(s): {', '.join(missing)}")

# ====================
# DATABASE
# ====================

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
users = db["users"]

# ====================
# MODELS
# ====================

class SignupRequest(BaseModel):
    email: str
    password: str

# ====================
# PASSWORD HELPERS
# ====================

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)

# ====================
# APP
# ====================

app = FastAPI(
    title="Vox Console",
    docs_url="/docs",
    redoc_url=None,
)

# ====================
# SESSION MIDDLEWARE
# ====================

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    https_only=True,
    same_site="none",
    session_cookie="vox_session",
    # domain=".voxconsole.com",  # keep this OFF until everything is stable
)

# ====================
# CORS
# ====================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://voxconsole.com", "https://www.voxconsole.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================
# ROUTER
# ====================

api = APIRouter(prefix="/api")

# ====================
# SPLASH / ENTRY
# ====================

@app.get("/")
async def root():
    return FileResponse(str(ROOT_DIR / "static" / "splash.html"))

# ====================
# SIGNUP (LOCAL AUTH)
# ====================

@api.post("/signup")
async def signup(data: SignupRequest, request: Request):
    email = data.email.strip().lower()

    existing = await users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    user_count = await users.count_documents({})
    role = "admin" if user_count == 0 else "user"

    user = {
        "email": email,
        "password_hash": hash_password(data.password),
        "role": role,
        "created_at": datetime.utcnow(),
        "last_login": datetime.utcnow(),
    }

    result = await users.insert_one(user)

    request.session.clear()
    request.session["user_id"] = str(result.inserted_id)
    request.session["role"] = role

    logger.info(f"New user created: {email} ({role})")

    return RedirectResponse("/dashboard", status_code=303)

# ====================
# LOGIN SUCCESS (TEMP DASHBOARD)
# ====================

@app.get("/dashboard")
async def dashboard(request: Request):
    if not request.session.get("user_id"):
        return RedirectResponse("/", status_code=302)

    return FileResponse(str(ROOT_DIR / "static" / "dashboard.html"))

# ====================
# SESSION IDENTITY
# ====================

@api.get("/me")
async def me(request: Request):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session")

    user = await users.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")

    return {
        "authenticated": True,
        "email": user["email"],
        "role": user["role"],
    }

# ====================
# HEALTH
# ====================

@api.get("/health")
async def health():
    return {"status": "ok"}

@api.get("/")
async def api_root():
    return {"message": "Vox OS API", "status": "online"}

# ====================
# REGISTER ROUTER
# ====================

app.include_router(api)

# ====================
# SHUTDOWN
# ====================

@app.on_event("shutdown")
async def shutdown():
    client.close()


