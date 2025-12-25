from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from google_auth_oauthlib.flow import Flow

import os
import logging
from pathlib import Path

# ====================
# ENV + LOGGING
# ====================

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env", override=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ====================
# DATABASE
# ====================

mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME")

if not mongo_url or not db_name:
    raise RuntimeError("Missing required environment variables: MONGO_URL and/or DB_NAME")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# ====================
# APP
# ====================

app = FastAPI()

# ====================
# ROOT ROUTE (FIX)
# ====================

@app.get("/")
async def root():
    return {
        "name": "Vox Console",
        "status": "online",
        "api": "/api/",
        "health": "/api/health",
        "docs": "/docs",
    }

# ====================
# SESSION MIDDLEWARE
# ====================

SESSION_SECRET = os.environ.get("SESSION_SECRET", "dev-only-change-me")

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    https_only=True,
    same_site="lax",
    session_cookie="vox_session",
)

# ====================
# ROUTER
# ====================

api_router = APIRouter(prefix="/api")

# ====================
# CORS
# ====================

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================
# HEALTH
# ====================

@api_router.get("/health")
async def health():
    return {"status": "ok"}

@api_router.get("/")
async def api_root():
    return {"message": "Vox OS API", "status": "online"}

# ====================
# GOOGLE OAUTH (LOGIN + CALLBACK)
# ====================

def build_google_flow() -> Flow:
    client_id = os.environ["GOOGLE_CLIENT_ID"]
    client_secret = os.environ["GOOGLE_CLIENT_SECRET"]

    redirect_uri = "https://voxconsole.com/api/auth/google/callback"

    return Flow.from_client_config(
        {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=[
            "openid",
            "email",
            "profile",
        ],
        redirect_uri=redirect_uri,
    )

@api_router.get("/auth/google/login")
async def google_login(request: Request):
    flow = build_google_flow()

    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )

    request.session["google_oauth_state"] = state
    return RedirectResponse(authorization_url)

@api_router.get("/auth/google/callback")
async def google_callback(request: Request):
    state_in_session = request.session.get("google_oauth_state")
    state_returned = request.query_params.get("state")

    if not state_in_session or state_in_session != state_returned:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    flow = build_google_flow()

    try:
        flow.fetch_token(authorization_response=str(request.url))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {e}")

    credentials = flow.credentials

    request.session["google_tokens"] = {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "scopes": list(credentials.scopes or []),
    }

    return RedirectResponse("https://www.voxconsole.com")

# ====================
# AUTH DEBUG (TEMPORARY)
# ====================

@api_router.get("/auth/debug")
async def auth_debug(request: Request):
    return {
        "has_session": bool(request.session),
        "has_google_tokens": "google_tokens" in request.session,
    }

# ====================
# SHUTDOWN
# ====================

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# ====================
# REGISTER ROUTER
# ====================

app.include_router(api_router)
