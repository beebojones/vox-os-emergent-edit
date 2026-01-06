from fastapi import FastAPI, APIRouter, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from typing import Dict, List, Any
from datetime import datetime
import os
import json

from openai import OpenAI

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
# OPENAI
# ====================

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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

def create_task(title: str) -> Dict[str, Any]:
    task = {
        "id": f"tsk-{datetime.utcnow().timestamp()}",
        "title": title,
        "status": "open",
    }
    TASKS.append(task)
    return task

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

# ====================
# CHAT HISTORY
# ====================

@router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    return CHAT_HISTORY.get(session_id, [])

@router.delete("/chat/history/{session_id}")
async def clear_chat_history(session_id: str):
    CHAT_HISTORY[session_id] = []
    return {"ok": True}

# ====================
# VOX TOOLS
# ====================

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": "Create a new task for the user",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "The task title",
                    }
                },
                "required": ["title"],
            },
        },
    }
]

# ====================
# CHAT SEND
# ====================

@router.post("/chat/send")
async def chat_send(payload: Dict[str, Any]):
    session_id = payload.get("session_id", "default")
    user_content = payload.get("content", "").strip()

    if not user_content:
        raise HTTPException(status_code=400, detail="Empty message")

    # Store user message
    user_msg = {
        "id": str(datetime.utcnow().timestamp()),
        "role": "user",
        "content": user_content,
    }
    CHAT_HISTORY.setdefault(session_id, []).append(user_msg)

    # Build conversation
    conversation = [
        {
            "role": "system",
            "content": (
                "You are Vox, a calm, intelligent personal AI assistant. "
                "You help manage tasks, memories, and plans. "
                "When the user asks to add a task, you should do it."
            ),
        }
    ]

    for msg in CHAT_HISTORY[session_id][-20:]:
        conversation.append(
            {
                "role": msg["role"],
                "content": msg["content"],
            }
        )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=conversation,
        tools=TOOLS,
        tool_choice="auto",
        temperature=0.6,
    )

    msg = response.choices[0].message

    # ====================
    # TOOL EXECUTION
    # ====================

    if msg.tool_calls:
        for call in msg.tool_calls:
            if call.function.name == "create_task":
                args = json.loads(call.function.arguments)
                title = args.get("title")

                if not title:
                    raise HTTPException(status_code=400, detail="Missing task title")

                task = create_task(title)

                assistant_msg = {
                    "id": str(datetime.utcnow().timestamp()),
                    "role": "assistant",
                    "content": f"✅ Task added: {task['title']}",
                }

                CHAT_HISTORY[session_id].append(assistant_msg)
                return assistant_msg

    # ====================
    # NORMAL RESPONSE
    # ====================

    assistant_content = msg.content or "Okay."

    assistant_msg = {
        "id": str(datetime.utcnow().timestamp()),
        "role": "assistant",
        "content": assistant_content,
    }

    CHAT_HISTORY[session_id].append(assistant_msg)
    return assistant_msg

# ====================
# STATUS
# ====================

@router.get("/status")
async def status():
    return {"status": "ok"}

# ====================
# MOUNT
# ====================

app.include_router(router)

