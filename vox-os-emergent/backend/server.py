from fastapi import FastAPI, APIRouter, HTTPException, Request, UploadFile, File
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import re
import tempfile

from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai import OpenAISpeechToText

# Calendar integration
from calendar_integration import (
    get_google_auth_url,
    exchange_code_for_tokens,
    save_google_tokens,
    get_calendar_connection_status,
    disconnect_google_calendar,
    fetch_calendar_events,
    get_today_events,
    get_week_events,
    format_events_for_vox,
    get_calendar_providers_status,
    is_google_oauth_configured,
    create_calendar_event,
    update_calendar_event,
    delete_calendar_event
)
from outlook_integration import (
    get_outlook_auth_url,
    exchange_outlook_code_for_tokens,
    get_outlook_calendar_events,
    save_outlook_tokens,
    get_outlook_tokens,
    delete_outlook_tokens,
    get_outlook_connection_status,
    create_outlook_calendar_event,
    update_outlook_calendar_event,
    delete_outlook_calendar_event,
    get_outlook_config
)

ROOT_DIR = Path(__file__).parent
# override=True ensures .env file values take precedence for custom domain support
load_dotenv(ROOT_DIR / ".env", override=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME")

if not mongo_url or not db_name:
    raise RuntimeError("Missing required environment variables: MONGO_URL and/or DB_NAME")

client = AsyncIOMotorClient(mongo_url)
db: AsyncIOMotorDatabase = client[db_name]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ==================== LOGGING MIDDLEWARE ====================

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests and responses"""
    import time
    start_time = time.time()
    
    # Log request
    logger.info(f"📥 REQUEST: {request.method} {request.url.path}")
    if request.query_params:
        logger.info(f"   Query params: {dict(request.query_params)}")
    
    # Process request
    response = await call_next(request)
    
    # Calculate duration
    duration = time.time() - start_time
    
    # Log response
    status_emoji = "✅" if response.status_code < 400 else "❌"
    logger.info(f"{status_emoji} RESPONSE: {request.method} {request.url.path} - Status: {response.status_code} - Duration: {duration:.3f}s")
    
    return response


# Store chat sessions in memory (keyed by session_id)
chat_sessions = {}


# Vox System Prompt (Charter)
VOX_SYSTEM_PROMPT = """You are Vox, a personal AI assistant designed to help a single user think, plan, and act safely across their life.

Vox is not a general chatbot. Vox is a personal agent with memory, restraint, and explainable behavior.

Core Principles:
- Vox exists to support the user's capacity, not to optimize productivity at all costs.
- Vox never shames, pressures, or guilt-trips.
- Vox never acts outside explicit permissions.
- Vox always explains its reasoning when asked.
- Vox is allowed to say "I'm not sure" or ask clarifying questions.

Conversation Style:
- Calm, grounded, and respectful
- Concise by default, detailed on request
- App-like responses, not essay-style
- No corporate tone, no motivational fluff
- Vox should feel like a capable presence, not a narrator.

RESTRAINT AND PACING (Critical - MUST follow):
- ONE question per response, maximum. Never ask multiple questions.
- When info is missing: make ONE suggestion OR ask ONE question (as simple choices if possible), then STOP and wait.
- Do NOT list "Two options:" or "Here are some questions:" - just pick one thing and offer it.
- For task capture: offer A or B choices, not open-ended questions.
- Deeper planning/coaching frameworks ONLY when user explicitly asks for them.
- Default to brevity. 2-3 sentences is ideal. Expand only when asked.

TASK CREATION (Important):
When the user asks you to add, create, or remember a TASK (something to do), include this exact format at the END of your response:
[TASK: task title | priority | energy]

Where:
- task title: the task description
- priority: low, normal, or high
- energy: low, medium, or high

Example: If user says "remind me to call mom", respond naturally then add:
[TASK: Call mom | normal | low]

Only include this when you are CONFIRMING a task addition, not when discussing tasks generally.

TASK DELETION (Important):
When the user asks you to delete, remove, or cancel tasks:
- For ONE task: [DELETE_TASK: task_id]
- For MULTIPLE specific tasks: [DELETE_TASKS: task_id1, task_id2, task_id3]
- For ALL tasks: [DELETE_ALL_TASKS]

Examples:
- "Delete all tasks" → [DELETE_ALL_TASKS]
- "Delete all high energy tasks" → Look at the task list, find tasks with energy: high, then use [DELETE_TASKS: id1, id2, ...]
- "Remove the grocery task" → [DELETE_TASK: abc123]

You must use the exact task IDs from the task context provided below.

TASK COMPLETION (Important):
When the user says they completed a task or marks it as done, include this format:
[COMPLETE_TASK: task_id]

Example: If user says "I finished the grocery shopping task", respond naturally then add:
[COMPLETE_TASK: abc123]

MEMORY CREATION (Important):
When the user tells you to REMEMBER something or shares personal information they want you to keep (preferences, facts, habits, etc.), IMMEDIATELY store it by including this exact format at the END of your response:
[MEMORY: content | category]

Where:
- content: what to remember (be concise)
- category: fact, preference, habit, context, goal, relationship, health, work, personal, or reminder

Examples:
- "Remember that I like cherry candy" → respond "Got it, I'll remember that." then add: [MEMORY: Favorite candy flavor is cherry | preference]
- "I'm allergic to peanuts" → respond "Noted, I'll keep that in mind." then add: [MEMORY: Allergic to peanuts | health]
- "My goal is to run a marathon" → respond "Great goal!" then add: [MEMORY: Goal is to run a marathon | goal]
- "My favorite color is blue" → respond "I'll remember that." then add: [MEMORY: Favorite color is blue | preference]

DO NOT ask "Want me to remember that?" - just store it immediately when the user explicitly asks you to remember something or shares important personal information.
Only include this tag when storing NEW information, not when recalling existing memories.

CALENDAR AWARENESS:
- When calendar data is provided in context, use it to give concrete, time-aware responses
- Reference specific events and times when suggesting task scheduling
- Identify gaps in the schedule for deep work or tasks
- If the user asks about their schedule/calendar and it's not connected, suggest connecting it ONCE
- After suggesting once, don't keep prompting - just work with what's available

CALENDAR EVENT CREATION (Important):
Two scenarios for calendar events:

1. EXPLICIT REQUESTS: When the user explicitly asks to add, create, or schedule an event:
   → Create the event immediately with [EVENT: ...] tag

2. CASUAL MENTIONS: When the user casually mentions a future activity/event (e.g., "I have a dinner with Sarah next Friday" or "I'm going to the gym tomorrow at 6am"):
   → First ASK: "Would you like me to add that to your calendar?"
   → If they confirm, then ask clarifying questions ONE AT A TIME to fill in missing details (time, duration, location)
   → Only after gathering info, add the [EVENT: ...] tag

Format at the END of your response when creating:
[EVENT: title | start_datetime | end_datetime | description | location]

Where:
- title: event name
- start_datetime: ISO format (2025-12-25T10:00:00 for timed, 2025-12-25 for all-day)
- end_datetime: ISO format
- description: optional, use empty string if none
- location: optional, use empty string if none

Examples (use current dates from context below):
- "Schedule a meeting tomorrow at 2pm for 1 hour" → [EVENT: Meeting | TOMORROW_DATET14:00:00 | TOMORROW_DATET15:00:00 | | ]
- "Add dentist appointment tomorrow at 9am" → [EVENT: Dentist appointment | TOMORROW_DATET09:00:00 | TOMORROW_DATET10:00:00 | | ]
- "Out of office 9 to 5:30" → [EVENT: Out of Office | DATET09:00:00 | DATET17:30:00 | | ]
- "Block off Christmas Day" → [EVENT: Christmas Day | 2025-12-25 | 2025-12-26 | | ]

REMEMBER: 9 AM = 09:00:00 (zero-nine), NOT 03:00:00!

CALENDAR EVENT DELETION (Important):
When the user asks to delete/remove/cancel a calendar event, include this format:
[DELETE_EVENT: event_id]

You must use the exact event ID from the calendar context provided.

CALENDAR EVENT UPDATES:
When asked to reschedule or modify an event, delete the old one and create a new one with the updated details.

Memory Philosophy:
- Vox distinguishes between: Facts, Preferences, Habits, Temporary context
- Vox does not permanently store preferences or habits without asking.
- Vox can propose remembering something by asking: "Want me to remember that?"
- Vox can always explain what it remembers and why.

Respond naturally and helpfully while maintaining your calm, grounded personality."""


# removed duplicate

# ==================== MODELS ====================


class Memory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str
    category: str = "fact"  # fact, preference, habit, context, goal, relationship, health, work, personal, reminder
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    tags: List[str] = []

# Available memory categories
MEMORY_CATEGORIES = [
    "fact",        # General facts about the user
    "preference",  # Likes, dislikes, preferences
    "habit",       # Regular behaviors and routines
    "context",     # Temporary situational context
    "goal",        # Goals and aspirations
    "relationship",# People, contacts, relationships
    "health",      # Health-related information
    "work",        # Work and career related
    "personal",    # Personal life details
    "reminder",    # Things to remember/follow up on
]

class MemoryCreate(BaseModel):
    content: str
    category: str = "fact"
    tags: List[str] = []


class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = ""
    priority: str = "normal"  # low, normal, high
    status: str = "pending"  # pending, in_progress, completed, dropped
    due_date: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    energy_level: str = "medium"  # low, medium, high


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: str = "normal"
    due_date: Optional[str] = None
    energy_level: str = "medium"


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None
    energy_level: Optional[str] = None


class CalendarEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = ""
    start_time: str
    end_time: str
    date: str
    color: str = "cyan"


class CalendarEventCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    start_time: str
    end_time: str
    date: str
    color: str = "cyan"


class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str  # user, assistant
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"


class ChatResponse(BaseModel):
    response: str
    session_id: str
    task_added: Optional[dict] = None
    task_deleted: Optional[str] = None
    task_completed: Optional[str] = None
    memory_added: Optional[dict] = None
    event_added: Optional[dict] = None
    event_deleted: Optional[bool] = None


class Briefing(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # morning, evening
    content: str
    date: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== HELPERS ====================


def parse_task_from_response(response: str) -> tuple[str, Optional[dict]]:
    """
    Extract task from Vox's response if present
    Pattern: [TASK: title | priority | energy]
    """
    pattern = r"\[TASK:\s*([^|]+)\s*\|\s*(low|normal|high)\s*\|\s*(low|medium|high)\s*\]"
    match = re.search(pattern, response, re.IGNORECASE)

    if match:
        task_data = {
            "title": match.group(1).strip(),
            "priority": match.group(2).lower(),
            "energy_level": match.group(3).lower(),
        }
        clean_response = re.sub(pattern, "", response, flags=re.IGNORECASE).strip()
        return clean_response, task_data

    return response, None


def parse_delete_task_from_response(response: str) -> tuple[str, Optional[list]]:
    """Extract task deletion from Vox's response if present - supports single, multiple, or all"""
    
    # Check for DELETE_ALL_TASKS first
    all_pattern = r'\[DELETE_ALL_TASKS\]'
    if re.search(all_pattern, response, re.IGNORECASE):
        clean_response = re.sub(all_pattern, '', response, flags=re.IGNORECASE).strip()
        logger.info("📋 Parsed DELETE_ALL_TASKS command")
        return clean_response, ["__ALL__"]
    
    # Check for DELETE_TASKS (multiple)
    multi_pattern = r'\[DELETE_TASKS:\s*([^\]]+)\s*\]'
    multi_match = re.search(multi_pattern, response, re.IGNORECASE)
    if multi_match:
        task_ids = [tid.strip() for tid in multi_match.group(1).split(',')]
        clean_response = re.sub(multi_pattern, '', response, flags=re.IGNORECASE).strip()
        logger.info(f"📋 Parsed DELETE_TASKS command for task IDs: {task_ids}")
        return clean_response, task_ids
    
    # Check for DELETE_TASK (single)
    single_pattern = r'\[DELETE_TASK:\s*([^\]]+)\s*\]'
    single_match = re.search(single_pattern, response, re.IGNORECASE)
    if single_match:
        task_id = single_match.group(1).strip()
        clean_response = re.sub(single_pattern, '', response, flags=re.IGNORECASE).strip()
        logger.info(f"📋 Parsed DELETE_TASK command for task ID: {task_id}")
        return clean_response, [task_id]
    
    return response, None


def parse_complete_task_from_response(response: str) -> tuple[str, Optional[str]]:
    """Extract task completion from Vox's response if present"""
    pattern = r'\[COMPLETE_TASK:\s*([^\]]+)\s*\]'
    match = re.search(pattern, response, re.IGNORECASE)
    
    if match:
        task_id = match.group(1).strip()
        clean_response = re.sub(pattern, '', response, flags=re.IGNORECASE).strip()
        logger.info(f"📋 Parsed COMPLETE_TASK command for task ID: {task_id}")
        return clean_response, task_id
    
    return response, None


def parse_memory_from_response(response: str) -> tuple[str, Optional[dict]]:
    """Extract memory from Vox's response if present"""
    # Pattern: [MEMORY: content | category]
    valid_categories = '|'.join(MEMORY_CATEGORIES)
    pattern = rf'\[MEMORY:\s*([^|]+)\s*\|\s*({valid_categories})\s*\]'
    match = re.search(pattern, response, re.IGNORECASE)
    
    if match:
        memory_data = {
            "content": match.group(1).strip(),
            "category": match.group(2).lower()
        }
        # Remove the memory tag from the displayed response
        clean_response = re.sub(pattern, '', response, flags=re.IGNORECASE).strip()
        return clean_response, memory_data
    
    return response, None

def fix_common_time_mistakes(time_str: str, user_message: str = "") -> str:
    """Fix common AI mistakes with time formatting"""
    from datetime import datetime, timedelta, timezone
    import re
    
    logger.info(f"Original time string from AI: {time_str}")
    
    # Get current date info for "today" and "tomorrow" references
    now = datetime.now(timezone.utc) - timedelta(hours=6)  # CST
    today = now.strftime("%Y-%m-%d")
    tomorrow = (now + timedelta(days=1)).strftime("%Y-%m-%d")
    
    # Replace placeholder texts
    time_str = time_str.replace("TOMORROW_DATE", tomorrow)
    time_str = time_str.replace("TODAY_DATE", today)
    time_str = time_str.replace("DATE", today)
    
    # If user said "tomorrow" but AI used today's date, fix it
    user_lower = user_message.lower()
    if "tomorrow" in user_lower and today in time_str:
        time_str = time_str.replace(today, tomorrow)
        logger.info(f"Corrected date from today ({today}) to tomorrow ({tomorrow})")
    
    # Common AI mistake: using 03:00 instead of 09:00 for 9 AM
    # Check if time looks like it should be morning but has wrong hour
    if "T03:00" in time_str or "T3:00" in time_str:
        # This is likely meant to be 9 AM (AI confusion)
        time_str = time_str.replace("T03:00", "T09:00").replace("T3:00", "T09:00")
        logger.info("Corrected 03:00 to 09:00")
    
    if "T03:30" in time_str or "T3:30" in time_str:
        time_str = time_str.replace("T03:30", "T09:30").replace("T3:30", "T09:30")
        logger.info("Corrected 03:30 to 09:30")
    
    # Fix 11:30 that should be 17:30 (5:30 PM)
    # This happens when AI thinks 5:30 PM is 11:30 (5+6=11, wrong math)
    if "T11:30" in time_str:
        # Check context - if start is around 9 AM, end should be 17:30 not 11:30
        time_str = time_str.replace("T11:30", "T17:30")
        logger.info("Corrected 11:30 to 17:30 (5:30 PM)")
    
    logger.info(f"Corrected time string: {time_str}")
    return time_str

# Store user message globally for time correction context
_last_user_message = ""

def parse_calendar_event_from_response(response: str) -> tuple[str, Optional[dict]]:
    """Extract calendar event creation from Vox's response if present"""
    # Pattern: [EVENT: title | start | end | description | location]
    pattern = r'\[EVENT:\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]*)\s*\|\s*([^|\]]*)\s*\]'
    match = re.search(pattern, response, re.IGNORECASE)
    
    if match:
        raw_start = match.group(2).strip()
        raw_end = match.group(3).strip()
        
        logger.info(f"AI generated EVENT - Title: {match.group(1).strip()}, Start: {raw_start}, End: {raw_end}")
        
        # Apply time corrections with user message context
        global _last_user_message
        corrected_start = fix_common_time_mistakes(raw_start, _last_user_message)
        corrected_end = fix_common_time_mistakes(raw_end, _last_user_message)
        
        event_data = {
            "title": match.group(1).strip(),
            "start_time": corrected_start,
            "end_time": corrected_end,
            "description": match.group(4).strip(),
            "location": match.group(5).strip()
        }
        clean_response = re.sub(pattern, '', response, flags=re.IGNORECASE).strip()
        return clean_response, event_data
    
    return response, None

def parse_delete_event_from_response(response: str) -> tuple[str, Optional[str]]:
    """Extract calendar event deletion from Vox's response if present"""
    # Pattern: [DELETE_EVENT: event_id]
    pattern = r'\[DELETE_EVENT:\s*([^\]]+)\s*\]'
    match = re.search(pattern, response, re.IGNORECASE)
    
    if match:
        event_id = match.group(1).strip()
        clean_response = re.sub(pattern, '', response, flags=re.IGNORECASE).strip()
        return clean_response, event_id
    
    return response, None


def should_attach_task_context(message: str) -> bool:
    """Check if message is about tasks"""
    message_lower = message.lower()
    task_keywords = [
        "task", "tasks", "todo", "to-do", "to do",
        "remind", "reminder",
        "done", "finished", "completed", "complete",
        "delete", "remove", "cancel",
        "what do i need", "what should i do",
        "pending", "outstanding",
    ]
    return any(kw in message_lower for kw in task_keywords)


def should_attach_calendar_context(message: str) -> bool:
    message_lower = message.lower()
    calendar_keywords = [
        "schedule",
        "calendar",
        "today",
        "tomorrow",
        "yesterday",
        "meeting",
        "free",
        "busy",
        "time",
        "when",
        "work on",
        "prioritize",
        "docket",
        "event",
        "appointment",
        "what do i have",
        "what did i have",
        "what's on",
        "what is on",
        "plans",
        "this week",
        "next week",
        "last week",
        "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
        "january", "february", "march", "april", "may", "june", 
        "july", "august", "september", "october", "november", "december",
        # Delete/modify keywords
        "delete", "remove", "cancel", "reschedule", "move", "change",
        "out of office", "ooo", "block", "clear",
    ]
    # Also check for date patterns like "17th", "21st", "3rd", etc.
    import re
    date_pattern = r'\b\d{1,2}(st|nd|rd|th)\b'
    has_date = bool(re.search(date_pattern, message_lower))
    
    return has_date or any(kw in message_lower for kw in calendar_keywords)


async def chat_with_llm(system_prompt: str, user_text: str, session_id: str = "default") -> str:
    """
    Chat using emergentintegrations LlmChat with EMERGENT_LLM_KEY
    """
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY is not configured")
    
    # Get or create chat session
    if session_id not in chat_sessions:
        chat_sessions[session_id] = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_prompt
        ).with_model("openai", "gpt-4.1-mini")
    
    chat = chat_sessions[session_id]
    user_message = UserMessage(text=user_text)
    response = await chat.send_message(user_message)
    return response


# ==================== ROUTES ====================


@api_router.get("/")
async def root():
    return {"message": "Vox OS API", "status": "online"}


@api_router.get("/health")
async def health():
    return {"status": "healthy", "service": "vox-os"}


# ==================== GOOGLE CALENDAR AUTH ====================


@api_router.get("/auth/google/login")
async def google_login(request: Request):
    """Get Google OAuth authorization URL"""
    # Always use voxconsole.com for OAuth
    redirect_uri = "https://voxconsole.com/api/auth/google/callback"
    logger.info(f"Using redirect URI: {redirect_uri}")
    return get_google_auth_url(override_redirect_uri=redirect_uri)

@api_router.get("/auth/google/debug")
async def google_debug():
    """Debug endpoint to check OAuth config at runtime"""
    import os
    client_id = os.environ.get('GOOGLE_CLIENT_ID', '')
    client_secret = os.environ.get('GOOGLE_CLIENT_SECRET', '')
    redirect_uri = os.environ.get('GOOGLE_REDIRECT_URI', '')
    
    return {
        "client_id_set": bool(client_id and len(client_id) > 10),
        "client_id_length": len(client_id) if client_id else 0,
        "client_id_preview": client_id[:20] + "..." if client_id and len(client_id) > 20 else client_id,
        "client_secret_set": bool(client_secret and len(client_secret) > 5),
        "client_secret_length": len(client_secret) if client_secret else 0,
        "redirect_uri": redirect_uri,
        "all_google_env_keys": [k for k in os.environ.keys() if 'GOOGLE' in k.upper()]
    }


@api_router.get("/auth/calendar/providers")
async def get_providers():
    """Get available calendar providers and their status"""
    return get_calendar_providers_status()


@api_router.get("/auth/google/callback")
async def google_callback(request: Request, code: str = None, error: str = None):
    """Handle Google OAuth callback"""
    # Always redirect back to voxconsole.com
    frontend_url = "https://voxconsole.com"
    
    logger.info(f"Google OAuth callback received - code present: {bool(code)}, error: {error}")
    logger.info(f"Redirecting to frontend_url: {frontend_url}")

    if error:
        logger.error(f"Google OAuth error from Google: {error}")
        return RedirectResponse(f"{frontend_url}?calendar_error={error}")

    if not code:
        logger.error("No authorization code provided in callback")
        raise HTTPException(status_code=400, detail="No authorization code provided")

    try:
        # Always use voxconsole.com for the callback
        callback_redirect_uri = "https://voxconsole.com/api/auth/google/callback"
        
        logger.info(f"Exchanging authorization code for tokens with redirect_uri: {callback_redirect_uri}")
        result = await exchange_code_for_tokens(code, redirect_uri=callback_redirect_uri)
        logger.info(f"Token exchange successful for email: {result.get('email')}")

        await save_google_tokens(
            db,
            email=result["email"],
            tokens=result["tokens"],
            name=result.get("name", ""),
        )
        logger.info("Tokens saved successfully")

        return RedirectResponse(f"{frontend_url}?calendar_connected=true")

    except Exception as e:
        logger.error(f"Google OAuth callback error: {e}", exc_info=True)
        return RedirectResponse(f"{frontend_url}?calendar_error=auth_failed")


@api_router.get("/auth/google/status")
async def google_auth_status():
    """Check Google Calendar connection status"""
    return await get_calendar_connection_status(db)


@api_router.post("/auth/google/disconnect")
async def google_disconnect():
    """Disconnect Google Calendar"""
    return await disconnect_google_calendar(db)


# ==================== OUTLOOK CALENDAR AUTH ====================


@api_router.get("/auth/outlook/login")
async def outlook_login():
    """Get Outlook OAuth authorization URL"""
    return get_outlook_auth_url()


@api_router.get("/auth/outlook/callback")
async def outlook_callback(code: str = None, error: str = None, error_description: str = None):
    """Handle Outlook OAuth callback"""
    frontend_url = os.environ.get("FRONTEND_URL", "https://voxconsole.com")
    logger.info(f"Outlook OAuth callback received - code present: {bool(code)}, error: {error}")

    if error:
        logger.error(f"Outlook OAuth error: {error} - {error_description}")
        return RedirectResponse(f"{frontend_url}?calendar_error={error}")

    if not code:
        logger.error("No authorization code provided in Outlook callback")
        raise HTTPException(status_code=400, detail="No authorization code provided")

    try:
        logger.info("Exchanging Outlook authorization code for tokens...")
        result = await exchange_outlook_code_for_tokens(code)
        logger.info(f"Outlook token exchange successful for email: {result.get('email')}")

        await save_outlook_tokens(
            db,
            email=result["email"],
            tokens=result["tokens"],
            name=result.get("name", ""),
        )
        logger.info("Outlook tokens saved successfully")

        return RedirectResponse(f"{frontend_url}?calendar_connected=outlook")

    except Exception as e:
        logger.error(f"Outlook OAuth callback error: {e}", exc_info=True)
        return RedirectResponse(f"{frontend_url}?calendar_error=auth_failed")


@api_router.get("/auth/outlook/status")
async def outlook_auth_status():
    """Check Outlook Calendar connection status"""
    return await get_outlook_connection_status(db)


@api_router.post("/auth/outlook/disconnect")
async def outlook_disconnect():
    """Disconnect Outlook Calendar"""
    await delete_outlook_tokens(db)
    return {"message": "Outlook Calendar disconnected"}


# ==================== OUTLOOK CALENDAR EVENTS ====================


@api_router.get("/outlook-calendar/events")
async def get_outlook_events_endpoint():
    """Fetch events from connected Outlook Calendar"""
    status = await get_outlook_connection_status(db)
    
    if not status.get("connected"):
        raise HTTPException(status_code=400, detail="Outlook Calendar not connected")
    
    token_doc = await get_outlook_tokens(db)
    if not token_doc or not token_doc.get("token_data"):
        raise HTTPException(status_code=400, detail="No valid Outlook tokens")
    
    access_token = token_doc["token_data"].get("access_token")
    events = await get_outlook_calendar_events(access_token)
    
    return {"events": events, "count": len(events)}


class CalendarEventCreateRequest(BaseModel):
    title: str
    start_time: str
    end_time: str
    description: Optional[str] = ""
    location: Optional[str] = ""

class CalendarEventUpdateRequest(BaseModel):
    title: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None


@api_router.post("/outlook-calendar/events")
async def create_outlook_event_endpoint(event: CalendarEventCreateRequest):
    """Create a new event in Outlook Calendar"""
    status = await get_outlook_connection_status(db)
    
    if not status.get("connected"):
        raise HTTPException(status_code=400, detail="Outlook Calendar not connected")
    
    token_doc = await get_outlook_tokens(db)
    access_token = token_doc["token_data"].get("access_token")
    
    result = await create_outlook_calendar_event(
        access_token,
        title=event.title,
        start_time=event.start_time,
        end_time=event.end_time,
        description=event.description or "",
        location=event.location or ""
    )
    
    return result


@api_router.put("/outlook-calendar/events/{event_id}")
async def update_outlook_event_endpoint(event_id: str, event: CalendarEventUpdateRequest):
    """Update an existing Outlook Calendar event"""
    status = await get_outlook_connection_status(db)
    
    if not status.get("connected"):
        raise HTTPException(status_code=400, detail="Outlook Calendar not connected")
    
    token_doc = await get_outlook_tokens(db)
    access_token = token_doc["token_data"].get("access_token")
    
    result = await update_outlook_calendar_event(
        access_token,
        event_id=event_id,
        title=event.title,
        start_time=event.start_time,
        end_time=event.end_time,
        description=event.description,
        location=event.location
    )
    
    return result


@api_router.delete("/outlook-calendar/events/{event_id}")
async def delete_outlook_event_endpoint(event_id: str):
    """Delete an Outlook Calendar event"""
    status = await get_outlook_connection_status(db)
    
    if not status.get("connected"):
        raise HTTPException(status_code=400, detail="Outlook Calendar not connected")
    
    token_doc = await get_outlook_tokens(db)
    access_token = token_doc["token_data"].get("access_token")
    
    result = await delete_outlook_calendar_event(access_token, event_id)
    return result


# ==================== GOOGLE CALENDAR EVENTS ====================


@api_router.get("/google-calendar/events")
async def get_google_calendar_events(days: int = 7):
    """Fetch events from connected Google Calendar"""
    return await fetch_calendar_events(db, days_ahead=days)


@api_router.get("/google-calendar/today")
async def get_google_calendar_today():
    """Fetch today's events from Google Calendar"""
    events = await get_today_events(db)
    status = await get_calendar_connection_status(db)
    return {
        "connected": status.get("connected", False),
        "events": events,
        "count": len(events),
    }


class GoogleCalendarEventCreate(BaseModel):
    title: str
    start_time: str  # ISO format: 2025-12-25 for all-day, 2025-12-25T10:00:00 for timed
    end_time: str
    description: Optional[str] = ""
    location: Optional[str] = ""

class GoogleCalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None

@api_router.post("/google-calendar/events")
async def create_google_calendar_event(event: GoogleCalendarEventCreate):
    """Create a new Google Calendar event"""
    result = await create_calendar_event(
        db,
        title=event.title,
        start_time=event.start_time,
        end_time=event.end_time,
        description=event.description or "",
        location=event.location or ""
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to create event"))
    return result

@api_router.put("/google-calendar/events/{event_id}")
async def update_google_calendar_event(event_id: str, event: GoogleCalendarEventUpdate):
    """Update a Google Calendar event"""
    result = await update_calendar_event(
        db,
        event_id=event_id,
        title=event.title,
        start_time=event.start_time,
        end_time=event.end_time,
        description=event.description,
        location=event.location
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to update event"))
    return result

@api_router.delete("/google-calendar/events/{event_id}")
async def delete_google_calendar_event(event_id: str):
    """Delete a Google Calendar event"""
    result = await delete_calendar_event(db, event_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to delete event"))
    return result


# ==================== CHAT ====================


@api_router.post("/chat", response_model=ChatResponse)
async def chat_with_vox(request: ChatRequest):
    """Chat with Vox AI assistant"""
    try:
        logger.info(f"💬 CHAT REQUEST - Session: {request.session_id}")
        logger.info(f"   User message: {request.message[:200]}{'...' if len(request.message) > 200 else ''}")
        
        # Store user message for time correction context
        global _last_user_message
        _last_user_message = request.message
        
        # Build context with calendar data if available
        calendar_status = await get_calendar_connection_status(db)
        calendar_context = ""

        if calendar_status.get("connected"):
            # Fetch all events (past 30 days + next 30 days)
            all_events_result = await fetch_calendar_events(db, days_ahead=30, max_results=50)
            all_events = all_events_result.get('events', [])
            
            if all_events:
                # Format events with dates for context - INCLUDE EVENT IDs for deletion
                events_text = []
                for event in all_events:
                    start = event.get('start', '')
                    title = event.get('title', 'Untitled')
                    event_id = event.get('id', '')
                    
                    # Parse date - show in 12-hour format with AM/PM
                    if 'T' in str(start):
                        try:
                            from datetime import datetime
                            dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
                            date_str = dt.strftime('%b %d, %Y at %I:%M %p').replace(' 0', ' ').replace('AM', 'AM').replace('PM', 'PM')
                        except Exception:
                            date_str = start
                    else:
                        date_str = start
                    
                    # Include event ID so AI can delete events
                    event_line = f"- [ID: {event_id}] {date_str}: {title}"
                    if event.get('location'):
                        event_line += f" @ {event['location']}"
                    if event.get('description'):
                        desc = event['description'][:100]
                        event_line += f" ({desc})"
                    events_text.append(event_line)
                
                calendar_context = (
                    "\n\n[Calendar events (past 30 days + next 30 days):\n"
                    + "\n".join(events_text)
                    + "\n\nTo delete an event, use [DELETE_EVENT: event_id] with the ID shown above.]"
                )

        # Build context with memories
        memory_context = ""
        memories = await db.memories.find({}, {"_id": 0}).to_list(50)
        if memories:
            memory_lines = []
            for mem in memories:
                memory_lines.append(f"- [{mem.get('category', 'fact')}] {mem.get('content', '')}")
            memory_context = "\n\n[Stored memories about the user:\n" + "\n".join(memory_lines) + "]"

        # Build context with tasks - include IDs for deletion/completion
        task_context = ""
        tasks = await db.tasks.find({}, {"_id": 0}).to_list(50)
        if tasks:
            task_lines = []
            for task in tasks:
                task_id = task.get('id', '')
                status = task.get('status', 'pending')
                priority = task.get('priority', 'normal')
                energy = task.get('energy_level', 'medium')
                title = task.get('title', '')
                task_lines.append(f"- [ID: {task_id}] [{status}] {title} (priority: {priority}, energy: {energy})")
            task_context = (
                "\n\n[User's tasks:\n" 
                + "\n".join(task_lines) 
                + "\n\nTo delete ONE task: [DELETE_TASK: task_id]"
                + "\nTo delete MULTIPLE tasks: [DELETE_TASKS: task_id1, task_id2, task_id3]"
                + "\nTo delete ALL tasks: [DELETE_ALL_TASKS]"
                + "\nTo mark complete: [COMPLETE_TASK: task_id]]"
            )

        enhanced_message = request.message
        
        # Attach calendar context for schedule-related queries
        if should_attach_calendar_context(request.message) and calendar_context:
            enhanced_message = request.message + calendar_context
        
        # Attach memory context for memory-related queries or general questions about the user
        memory_keywords = ['remember', 'memory', 'memories', 'know about me', 'stored', 'preference', 'habit', 'fact']
        if any(kw in request.message.lower() for kw in memory_keywords) and memory_context:
            enhanced_message = enhanced_message + memory_context
        
        # Attach task context for task-related queries
        task_keywords = ['task', 'tasks', 'todo', 'to do', 'to-do', 'doing', 'work on', 'pending', 'complete', 
                         'delete', 'remove', 'energy', 'priority', 'high energy', 'low energy', 'all tasks']
        if any(kw in request.message.lower() for kw in task_keywords) and task_context:
            enhanced_message = enhanced_message + task_context

        # Build dynamic system prompt with current date/time
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        # Adjust for user's likely timezone (CST = UTC-6)
        local_now = now - timedelta(hours=6)
        current_date = local_now.strftime("%A, %B %d, %Y")
        current_time = local_now.strftime("%I:%M %p")
        tomorrow_date = (local_now + timedelta(days=1)).strftime("%Y-%m-%d")
        today_date = local_now.strftime("%Y-%m-%d")
        
        date_context = f"""

CURRENT DATE AND TIME:
- Today is: {current_date}
- Current time: {current_time}
- Today's date (for events): {today_date}
- Tomorrow's date (for events): {tomorrow_date}

CRITICAL TIME CONVERSION TABLE (12-hour to 24-hour):
- 12:00 AM (midnight) = 00:00:00
- 1:00 AM = 01:00:00
- 2:00 AM = 02:00:00
- 3:00 AM = 03:00:00
- 6:00 AM = 06:00:00
- 7:00 AM = 07:00:00
- 8:00 AM = 08:00:00
- 9:00 AM = 09:00:00 (NINE AM is 09, not 03!)
- 10:00 AM = 10:00:00
- 11:00 AM = 11:00:00
- 12:00 PM (noon) = 12:00:00
- 1:00 PM = 13:00:00
- 2:00 PM = 14:00:00
- 3:00 PM = 15:00:00
- 4:00 PM = 16:00:00
- 5:00 PM = 17:00:00
- 5:30 PM = 17:30:00
- 6:00 PM = 18:00:00
- 9:00 PM = 21:00:00

IMPORTANT TIME RULES:
- When user says "tomorrow", use date: {tomorrow_date}
- "9 AM" or "9:00 AM" or "9" in morning context = T09:00:00 (NOT 03:00:00!)
- "5:30 PM" = T17:30:00
- "9 to 5:30" or "9-5:30" means start at T09:00:00 and end at T17:30:00
- Always double-check: 9 AM is 09:00, NOT 03:00

EXAMPLE for "Out of Office tomorrow 9 AM to 5:30 PM":
[EVENT: Out of Office | {tomorrow_date}T09:00:00 | {tomorrow_date}T17:30:00 | | ]

RECENT EVENTS CONTEXT:
When the user refers to "the event", "that event", or wants to modify something they just created, use the most recent event from the calendar context provided. You should be able to identify events by their title without asking for IDs.
"""
        
        dynamic_system_prompt = VOX_SYSTEM_PROMPT + date_context
        
        # Send message using emergentintegrations
        logger.info(f"🤖 Sending to LLM with context length: {len(enhanced_message)} chars")
        response_text = await chat_with_llm(dynamic_system_prompt, enhanced_message, request.session_id)
        logger.info(f"🤖 LLM Response: {response_text[:300]}{'...' if len(response_text) > 300 else ''}")

        # Check if Vox wants to create a task
        clean_response, task_data = parse_task_from_response(response_text)
        task_added = None
        task_deleted = None
        task_completed = None

        if task_data:
            task_obj = Task(
                title=task_data["title"],
                priority=task_data["priority"],
                energy_level=task_data["energy_level"],
                status="pending",
            )
            doc = task_obj.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            await db.tasks.insert_one(doc)
            task_added = {"id": task_obj.id, "title": task_obj.title}
            logger.info(f"📋 Task created via chat: {task_obj.title}")

        # Check if Vox wants to delete task(s)
        clean_response, delete_task_ids = parse_delete_task_from_response(clean_response)
        if delete_task_ids:
            if delete_task_ids == ["__ALL__"]:
                # Delete all tasks
                result = await db.tasks.delete_many({})
                task_deleted = f"all ({result.deleted_count} tasks)"
                logger.info(f"📋 All tasks deleted via chat: {result.deleted_count} tasks")
            else:
                # Delete specific task(s)
                deleted_count = 0
                for task_id in delete_task_ids:
                    result = await db.tasks.delete_one({"id": task_id})
                    if result.deleted_count > 0:
                        deleted_count += 1
                        logger.info(f"📋 Task deleted via chat: {task_id}")
                    else:
                        logger.warning(f"📋 Task not found for deletion: {task_id}")
                if deleted_count > 0:
                    task_deleted = f"{deleted_count} task(s)"

        # Check if Vox wants to complete a task
        clean_response, complete_task_id = parse_complete_task_from_response(clean_response)
        if complete_task_id:
            result = await db.tasks.update_one(
                {"id": complete_task_id},
                {"$set": {"status": "completed"}}
            )
            if result.modified_count > 0:
                task_completed = complete_task_id
                logger.info(f"📋 Task completed via chat: {complete_task_id}")
            else:
                logger.warning(f"📋 Task not found for completion: {complete_task_id}")

        # Check if Vox wants to create a memory
        clean_response, memory_data = parse_memory_from_response(clean_response)
        memory_added = None

        if memory_data:
            memory_obj = Memory(
                content=memory_data["content"],
                category=memory_data["category"]
            )
            doc = memory_obj.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            await db.memories.insert_one(doc)
            memory_added = {"id": memory_obj.id, "content": memory_obj.content}
            logger.info(f"Memory created via chat: {memory_obj.content}")

        # Check if Vox wants to create a calendar event
        clean_response, event_data = parse_calendar_event_from_response(clean_response)
        event_added = None

        if event_data and calendar_status.get("connected"):
            result = await create_calendar_event(
                db,
                title=event_data["title"],
                start_time=event_data["start_time"],
                end_time=event_data["end_time"],
                description=event_data.get("description", ""),
                location=event_data.get("location", "")
            )
            if result.get("success"):
                event_added = result.get("event")
                logger.info(f"Calendar event created via chat: {event_data['title']}")
            else:
                logger.error(f"Failed to create calendar event: {result.get('error')}")
        elif event_data and not calendar_status.get("connected"):
            logger.warning("Vox tried to create calendar event but calendar not connected")

        # Check if Vox wants to delete a calendar event
        clean_response, delete_event_id = parse_delete_event_from_response(clean_response)
        event_deleted = None

        if delete_event_id and calendar_status.get("connected"):
            result = await delete_calendar_event(db, delete_event_id)
            if result.get("success"):
                event_deleted = True
                logger.info(f"Calendar event deleted via chat: {delete_event_id}")
            else:
                logger.error(f"Failed to delete calendar event: {result.get('error')}")

        # Store messages in DB (with clean response)
        user_msg = Message(role="user", content=request.message)
        assistant_msg = Message(role="assistant", content=clean_response)

        user_doc = user_msg.model_dump()
        user_doc["timestamp"] = user_doc["timestamp"].isoformat()
        user_doc["session_id"] = request.session_id

        assistant_doc = assistant_msg.model_dump()
        assistant_doc["timestamp"] = assistant_doc["timestamp"].isoformat()
        assistant_doc["session_id"] = request.session_id

        await db.messages.insert_many([user_doc, assistant_doc])

        return ChatResponse(
            response=clean_response, 
            session_id=request.session_id, 
            task_added=task_added,
            task_deleted=task_deleted,
            task_completed=task_completed,
            memory_added=memory_added,
            event_added=event_added,
            event_deleted=event_deleted
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/chat/history/{session_id}", response_model=List[Message])
async def get_chat_history(session_id: str):
    """Get chat history for a session"""
    messages = (
        await db.messages.find({"session_id": session_id}, {"_id": 0})
        .sort("timestamp", 1)
        .to_list(100)
    )

    for msg in messages:
        if isinstance(msg.get("timestamp"), str):
            msg["timestamp"] = datetime.fromisoformat(msg["timestamp"])

    return messages


@api_router.delete("/chat/history/{session_id}")
async def clear_chat_history(session_id: str):
    """Clear chat history for a session"""
    await db.messages.delete_many({"session_id": session_id})
    if session_id in chat_sessions:
        del chat_sessions[session_id]
    return {"message": "Chat history cleared"}


# ==================== VOICE TRANSCRIPTION ====================


@api_router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio file to text using OpenAI Whisper"""
    logger.info(f"🎤 TRANSCRIBE REQUEST - Filename: {file.filename}, Content-Type: {file.content_type}")
    
    # Validate file type
    allowed_types = ["audio/webm", "audio/wav", "audio/mp3", "audio/mpeg", "audio/mp4", "audio/m4a", "audio/ogg"]
    allowed_extensions = [".webm", ".wav", ".mp3", ".mpeg", ".mp4", ".m4a", ".ogg"]
    
    file_ext = Path(file.filename).suffix.lower() if file.filename else ""
    
    if file.content_type not in allowed_types and file_ext not in allowed_extensions:
        logger.warning(f"🎤 Invalid audio format: {file.content_type}, extension: {file_ext}")
        raise HTTPException(status_code=400, detail=f"Invalid audio format. Supported: {', '.join(allowed_extensions)}")
    
    try:
        # Read file content
        content = await file.read()
        logger.info(f"🎤 Audio file size: {len(content)} bytes")
        
        # Check file size (25MB limit)
        if len(content) > 25 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Audio file too large. Maximum size is 25MB.")
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext or ".webm") as tmp_file:
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        logger.info(f"🎤 Saved temp file: {tmp_path}")
        
        # Initialize Whisper STT
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
        
        stt = OpenAISpeechToText(api_key=api_key)
        
        # Transcribe
        logger.info("🎤 Starting transcription with Whisper...")
        with open(tmp_path, "rb") as audio_file:
            response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="json",
                language="en"
            )
        
        # Clean up temp file
        os.unlink(tmp_path)
        
        transcribed_text = response.text.strip()
        logger.info(f"🎤 Transcription result: {transcribed_text[:100]}...")
        
        return {"text": transcribed_text, "success": True}
        
    except Exception as e:
        logger.error(f"🎤 Transcription error: {e}", exc_info=True)
        # Clean up temp file if it exists
        if 'tmp_path' in locals():
            try:
                os.unlink(tmp_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


# ==================== MEMORIES ====================


@api_router.get("/memories/categories")
async def get_memory_categories():
    """Get available memory categories"""
    return {"categories": MEMORY_CATEGORIES}

@api_router.get("/memories", response_model=List[Memory])
async def get_memories():
    """Get all memories"""
    memories = await db.memories.find({}, {"_id": 0}).to_list(100)
    for mem in memories:
        if isinstance(mem.get("created_at"), str):
            mem["created_at"] = datetime.fromisoformat(mem["created_at"])
    return memories


@api_router.post("/memories", response_model=Memory)
async def create_memory(memory: MemoryCreate):
    """Create a new memory"""
    logger.info(f"🧠 CREATE MEMORY - Category: {memory.category}, Content: {memory.content[:50]}...")
    mem_obj = Memory(**memory.model_dump())
    doc = mem_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.memories.insert_one(doc)
    logger.info(f"🧠 Memory created with ID: {mem_obj.id}")
    return mem_obj


class MemoryUpdate(BaseModel):
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None

@api_router.put("/memories/{memory_id}", response_model=Memory)
async def update_memory(memory_id: str, memory_update: MemoryUpdate):
    """Update a memory"""
    logger.info(f"🧠 UPDATE MEMORY - ID: {memory_id}, Updates: {memory_update.model_dump()}")
    update_data = {k: v for k, v in memory_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.memories.find_one_and_update(
        {"id": memory_id},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Memory not found")
    
    del result['_id']
    if isinstance(result.get('created_at'), str):
        result['created_at'] = datetime.fromisoformat(result['created_at'])
    return Memory(**result)

@api_router.delete("/memories/{memory_id}")
async def delete_memory(memory_id: str):
    """Delete a memory"""
    logger.info(f"🧠 DELETE MEMORY - ID: {memory_id}")
    result = await db.memories.delete_one({"id": memory_id})
    if result.deleted_count == 0:
        logger.warning(f"🧠 Memory not found: {memory_id}")
        raise HTTPException(status_code=404, detail="Memory not found")
    logger.info(f"🧠 Memory deleted: {memory_id}")
    return {"message": "Memory deleted"}


# ==================== TASKS ====================


@api_router.get("/tasks", response_model=List[Task])
async def get_tasks():
    """Get all tasks"""
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(100)
    for task in tasks:
        if isinstance(task.get("created_at"), str):
            task["created_at"] = datetime.fromisoformat(task["created_at"])
    return tasks


@api_router.post("/tasks", response_model=Task)
async def create_task(task: TaskCreate):
    """Create a new task"""
    logger.info(f"📋 CREATE TASK - Title: {task.title}, Priority: {task.priority}")
    task_obj = Task(**task.model_dump())
    doc = task_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.tasks.insert_one(doc)
    logger.info(f"📋 Task created with ID: {task_obj.id}")
    return task_obj


@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_update: TaskUpdate):
    """Update a task"""
    logger.info(f"📋 UPDATE TASK - ID: {task_id}, Updates: {task_update.model_dump()}")
    update_data = {k: v for k, v in task_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")

    result = await db.tasks.find_one_and_update(
        {"id": task_id},
        {"$set": update_data},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")

    del result["_id"]
    if isinstance(result.get("created_at"), str):
        result["created_at"] = datetime.fromisoformat(result["created_at"])
    return Task(**result)


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete a task"""
    logger.info(f"📋 DELETE TASK - ID: {task_id}")
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        logger.warning(f"📋 Task not found: {task_id}")
        raise HTTPException(status_code=404, detail="Task not found")
    logger.info(f"📋 Task deleted: {task_id}")
    return {"message": "Task deleted"}


# ==================== CALENDAR (LOCAL) ====================


@api_router.get("/calendar", response_model=List[CalendarEvent])
async def get_calendar_events():
    """Get all local calendar events"""
    events = await db.calendar_events.find({}, {"_id": 0}).to_list(100)
    return events


@api_router.get("/calendar/{date}", response_model=List[CalendarEvent])
async def get_events_by_date(date: str):
    """Get local events for a specific date"""
    events = await db.calendar_events.find({"date": date}, {"_id": 0}).to_list(50)
    return events


@api_router.post("/calendar", response_model=CalendarEvent)
async def create_local_calendar_event(event: CalendarEventCreate):
    """Create a new local calendar event"""
    event_obj = CalendarEvent(**event.model_dump())
    doc = event_obj.model_dump()
    await db.calendar_events.insert_one(doc)
    return event_obj


@api_router.delete("/calendar/{event_id}")
async def delete_local_calendar_event(event_id: str):
    """Delete a local calendar event"""
    result = await db.calendar_events.delete_one({"id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}


# ==================== BRIEFINGS ====================


@api_router.get("/briefing/{briefing_type}")
async def get_briefing(briefing_type: str):
    """Generate a briefing (morning or evening)"""
    if briefing_type not in ["morning", "evening"]:
        raise HTTPException(status_code=400, detail="Invalid briefing type")

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    calendar_status = await get_calendar_connection_status(db)
    calendar_connected = calendar_status.get("connected", False)

    if calendar_connected:
        google_events = await get_today_events(db)
        events_text = (
            format_events_for_vox(google_events, include_details=True)
            if google_events
            else "No events scheduled for today."
        )
        calendar_source = "Google Calendar"
    else:
        events = await db.calendar_events.find({"date": today}, {"_id": 0}).to_list(20)
        events_text = (
            "\n".join([f"- {e['title']} ({e['start_time']} - {e['end_time']})" for e in events])
            or "No events scheduled."
        )
        calendar_source = "local"

    tasks = await db.tasks.find({"status": {"$ne": "completed"}}, {"_id": 0}).to_list(20)
    tasks_text = "\n".join([f"- {t['title']} (Priority: {t['priority']})" for t in tasks[:5]]) or "No pending tasks."

    if briefing_type == "morning":
        calendar_note = f"(From {calendar_source})" if calendar_connected else "(Calendar not connected - using local data)"
        prompt = f"""Morning briefing for {today}. {calendar_note}

Calendar: {events_text}
Tasks: {tasks_text}

Respond in EXACTLY this format (3-4 short sentences total):
- Line 1: Shape of day (e.g. "Mixed day with solid meeting blocks and open afternoon.")
- Line 2: Key items - mention specific times and events from the calendar
- Line 3: One suggestion for task timing based on calendar gaps

Be concrete and time-aware. STOP after 3-4 sentences. No frameworks or lists."""
    else:
        prompt = f"""Evening briefing for {today}.

Events: {events_text}
Tasks: {tasks_text}

Respond in EXACTLY 2 sentences:
- Sentence 1: Brief acknowledgment of the day
- Sentence 2: One thought for tomorrow if relevant, or just "Rest well."

STOP there. No frameworks, no reflection prompts, no lists."""

    try:
        response = await chat_with_llm(VOX_SYSTEM_PROMPT, prompt, f"briefing-{today}-{briefing_type}")

        briefing = Briefing(type=briefing_type, content=response, date=today)
        doc = briefing.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.briefings.insert_one(doc)

        return {"type": briefing_type, "content": response, "date": today}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Briefing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== SEED DATA ====================


@api_router.post("/seed")
async def seed_demo_data():
    """Seed demo data for demonstration"""
    today = datetime.now(timezone.utc)
    today_str = today.strftime("%Y-%m-%d")
    tomorrow_str = (today + timedelta(days=1)).strftime("%Y-%m-%d")

    events = [
        {"id": str(uuid.uuid4()), "title": "Team standup", "description": "Daily sync with team", "start_time": "09:00", "end_time": "09:30", "date": today_str, "color": "cyan"},
        {"id": str(uuid.uuid4()), "title": "Project review", "description": "Q4 progress review", "start_time": "14:00", "end_time": "15:00", "date": today_str, "color": "magenta"},
        {"id": str(uuid.uuid4()), "title": "Lunch with Alex", "description": "Catch up at Cafe Luna", "start_time": "12:30", "end_time": "13:30", "date": today_str, "color": "orange"},
        {"id": str(uuid.uuid4()), "title": "Focus time", "description": "Deep work block", "start_time": "10:00", "end_time": "12:00", "date": today_str, "color": "purple"},
        {"id": str(uuid.uuid4()), "title": "Dentist appointment", "description": "Regular checkup", "start_time": "11:00", "end_time": "12:00", "date": tomorrow_str, "color": "cyan"},
    ]

    tasks = [
        {"id": str(uuid.uuid4()), "title": "Review pull requests", "description": "Check team PRs for the sprint", "priority": "high", "status": "pending", "due_date": today_str, "energy_level": "medium", "created_at": today.isoformat()},
        {"id": str(uuid.uuid4()), "title": "Write project documentation", "description": "Update README and API docs", "priority": "normal", "status": "in_progress", "due_date": tomorrow_str, "energy_level": "high", "created_at": today.isoformat()},
        {"id": str(uuid.uuid4()), "title": "Reply to emails", "description": "Clear inbox backlog", "priority": "low", "status": "pending", "due_date": today_str, "energy_level": "low", "created_at": today.isoformat()},
        {"id": str(uuid.uuid4()), "title": "Plan next sprint", "description": "Outline goals and tasks", "priority": "normal", "status": "pending", "due_date": tomorrow_str, "energy_level": "medium", "created_at": today.isoformat()},
        {"id": str(uuid.uuid4()), "title": "Exercise", "description": "30 min workout", "priority": "normal", "status": "pending", "due_date": today_str, "energy_level": "high", "created_at": today.isoformat()},
    ]

    memories = [
        {"id": str(uuid.uuid4()), "content": "Prefers morning meetings over afternoon ones", "category": "preference", "created_at": today.isoformat(), "tags": ["schedule", "meetings"]},
        {"id": str(uuid.uuid4()), "content": "Works best in 90-minute focus blocks", "category": "habit", "created_at": today.isoformat(), "tags": ["productivity", "focus"]},
        {"id": str(uuid.uuid4()), "content": "Project deadline is end of month", "category": "fact", "created_at": today.isoformat(), "tags": ["project", "deadline"]},
        {"id": str(uuid.uuid4()), "content": "Feeling more energetic in mornings", "category": "context", "created_at": today.isoformat(), "tags": ["energy", "time"]},
    ]

    await db.calendar_events.delete_many({})
    await db.tasks.delete_many({})
    await db.memories.delete_many({})

    await db.calendar_events.insert_many(events)
    await db.tasks.insert_many(tasks)
    await db.memories.insert_many(memories)

    return {"message": "Demo data seeded successfully", "events": len(events), "tasks": len(tasks), "memories": len(memories)}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
