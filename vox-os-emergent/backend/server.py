from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from datetime import datetime
from pydantic import BaseModel, EmailStr
from passlib.hash import pbkdf2_sha256
from bson import ObjectId
import os
import logging

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
# APP
# ====================

app = FastAPI(
    title="Vox Console",
    docs_url="/docs",
    redoc_url=None,
)

# ====================
# STATIC FILES (REQUIRED)
# ====================

app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static",
)

# ====================
# SESSION MIDDLEWARE
# ====================

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "dev-secret"),
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
# MODELS
# ====================

class SignupRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# ====================
# PASSWORD HELPERS
# ====================

def hash_password(password: str) -> str:
    if len(password.encode("utf-8")) > 72:
        password = password[:72]
    return pbkdf2_sha256.hash(password)

def verify_password(password: str, password_hash: str) -> bool:
    return pbkdf2_sha256.verify(password, password_hash)

# ====================
# PAGE ROUTES
# ====================

@app.get("/")
async def splash():
    return RedirectResponse("/static/splash.html")

@app.get("/login")
async def login_page():
    return RedirectResponse("/static/login.html")

@app.get("/dashboard")
async def dashboard():
    return RedirectResponse("/static/dashboard.html")

# ====================
# AUTH API
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

    logger.info(f"User created: {data.email} ({role})")

    return JSONResponse({"success": True})

@api.post("/login")
async def login(data: LoginRequest, request: Request):
    user = await users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    request.session.clear()
    request.session["user_id"] = str(user["_id"])
    request.session["role"] = user.get("role", "user")

    await users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )

    logger.info(f"User logged in: {data.email}")

    return JSONResponse({"success": True})

@api.post("/logout")
async def logout(request: Request):
    request.session.clear()
    return JSONResponse({"success": True})

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
        "role": user.get("role", "user"),
    }

# ====================
# HEALTH
# ====================

@api.get("/health")
async def health():
    return {"status": "ok"}

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
