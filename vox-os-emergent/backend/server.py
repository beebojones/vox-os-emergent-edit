from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from google_auth_oauthlib.flow import Flow
from pathlib import Path
import os
import logging
import requests

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
# SPLASH / ENTRY ROUTES
# ====================

@app.get("/")
async def root():
    return FileResponse("static/splash.html")

@app.get("/login")
async def login_page():
    return {"message": "Login page coming next"}

@app.get("/signup")
async def signup_page():
    return {"message": "Account creation coming next"}

# ====================
# DASHBOARD (TEMP)
# ====================

@app.get("/login/success")
async def login_success():
    return FileResponse("static/login_success.html")

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
# USER IDENTITY
# ====================

@api.get("/me")
async def me(request: Request):
    tokens = request.session.get("google_tokens")
    if not tokens:
        raise HTTPException(status_code=401, detail="Not authenticated")

    headers = {
        "Authorization": f"Bearer {tokens['access_token']}"
    }

    r = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers=headers,
        timeout=5,
    )

    profile = r.json()

    return {
        "authenticated": True,
        "name": profile.get("name"),
        "email": profile.get("email"),
    }

# ====================
# GOOGLE OAUTH (INTEGRATION)
# ====================

GOOGLE_SCOPES = ["openid", "email", "profile"]

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
        scopes=GOOGLE_SCOPES,
        redirect_uri="https://voxconsole.com/api/auth/google/callback",
    )

@api.get("/auth/google/login")
async def google_login(request: Request):
    flow = build_google_flow()
    auth_url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",
    )
    request.session.clear()
    request.session["oauth_state"] = state
    return RedirectResponse(auth_url)

@api.get("/auth/google/callback")
async def google_callback(request: Request):
    state_expected = request.session.get("oauth_state")
    state_returned = request.query_params.get("state")

    if not state_expected or state_expected != state_returned:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    flow = build_google_flow()
    flow.oauth2session.state = state_returned
    flow.fetch_token(code=code)

    creds = flow.credentials

    request.session["google_tokens"] = {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "scopes": list(creds.scopes or []),
    }

    logger.info("Google OAuth successful")

    return RedirectResponse("/login/success")

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
