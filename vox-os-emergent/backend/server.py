from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from google_auth_oauthlib.flow import Flow
from pathlib import Path
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
    secret_key=os.getenv("SESSION_SECRET", "dev-only-change-me"),
    https_only=True,
    same_site="none",
    session_cookie="vox_session",
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
# ROOT (IMPORTANT)
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
# HEALTH
# ====================

@api.get("/health")
async def health():
    return {"status": "ok"}

@api.get("/")
async def api_root():
    return {"message": "Vox OS API", "status": "online"}

# ====================
# GOOGLE OAUTH
# ====================

def build_google_flow():
    return Flow.from_client_config(
        {
            "web": {
                "client_id": os.environ["GOOGLE_CLIENT_ID"],
                "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=["openid", "email", "profile"],
        redirect_uri="https://voxconsole.com/api/auth/google/callback",
    )

@api.get("/auth/google/login")
async def google_login(request: Request):
    flow = build_google_flow()

    auth_url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true",
    )

    request.session.clear()
    request.session["oauth_state"] = state

    logger.info(f"OAuth state set: {state}")

    return RedirectResponse(auth_url)

@api.get("/auth/google/callback")
async def google_callback(request: Request):
    state_expected = request.session.get("oauth_state")
    state_returned = request.query_params.get("state")

    logger.info(f"Expected state: {state_expected}")
    logger.info(f"Returned state: {state_returned}")

    if not state_expected or state_expected != state_returned:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    flow = build_google_flow()
    flow.fetch_token(authorization_response=str(request.url))

    creds = flow.credentials

    request.session["google_tokens"] = {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "scopes": list(creds.scopes or []),
    }

    logger.info("Google OAuth successful")

    return RedirectResponse("https://www.voxconsole.com")

# ====================
# AUTH DEBUG
# ====================

@api.get("/auth/debug")
async def auth_debug(request: Request):
    return {
        "has_session": bool(request.session),
        "has_google_tokens": "google_tokens" in request.session,
        "session_keys": list(request.session.keys()),
    }

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



