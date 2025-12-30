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
from pydantic import BaseModel, EmailStr

# ====================
# ENV + LOGGING
# ====================

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env", override=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vox")

# ====================
# DATABASE
# ====================

mongo_url = os.getenv("MONGO_URL")
db_name = os.getenv("DB_NAME")

if not mongo_url or not db_name:
    raise RuntimeError("Missing MONGO_URL or DB_NAME")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]
users = db["users"]

# ====================
# MODELS
# ====================

class SignupRequest(BaseModel):
    email: EmailStr
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
    secret_key=os.getenv("SESSION_SECRET"),
    https_only=True,
    same_site="none",
    session_cookie="vox_session",
    domain=".voxconsole.com",
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
    return FileResponse("static/splash.html")

# ====================
# SIGNUP (LOCAL AUTH)
# ====================

@api.post("/signup")
async def signup(data: SignupRequest, request: Request):
    existing = await users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    user_count = await users.count_documents({})
    role = "admin" if user_count == 0 else "user"

    user = {
        "email": data.email,
        "password_hash": hash_password(data.password),
        "role": role,
        "created_at": datetime.utcnow(),
        "last_login": datetime.utcnow(),
    }

    result = await users.insert_one(user)

    request.session.clear()
    request.session["user_id"] = str(result.inserted_id)
    request.session["role"] = role

    logger.info(f"New user created: {data.email} ({role})")

    return RedirectResponse("/login/success", status_code=303)

# ====================
# LOGIN SUCCESS (TEMP DASHBOARD)
# ====================

@app.get("/login/success")
async def login_success():
    return FileResponse("static/login_success.html")

# ====================
# SESSION IDENTITY
# ====================

@api.get("/me")
async def me(request: Request):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = await users.find_one({"_id": ObjectId(user_id)})
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
