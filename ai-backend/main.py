
import os
from storage import init_db, save_turn, get_conversation
from pathlib import Path
from typing import Literal
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from google import genai
from google.genai import types, errors


# ==================================
# 1. Environment Configuration
# ==================================

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY is missing")


client = genai.Client(api_key=API_KEY)

MODEL_NAME = "gemini-3.5-flash-lite"


# ==================================
# 2. FastAPI Application
# ==================================

app = FastAPI(
    title="Shaker & Nada AI Assistant",
    version="0.4.0"
)


# Initialize SQLite database
init_db()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "ai_provider": "gemini"
    }


# ==================================
# 3. Temporary Conversation Memory
# ==================================

# In-memory storage for development only
conversations = {}


# ==================================
# 4. Request and Response Models
# ==================================

class ChatRequest(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=2000
    )

    gender: Literal["male", "female"] = "male"

    conversation_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
    conversation_id: str


# ==================================
# 5. AI System Instructions
# ==================================

SYSTEM_INSTRUCTIONS = """
You are an intelligent AI fitness companion.

Your specialization includes:
- Fitness and physical exercise
- Building muscle
- Healthy weight management
- Nutrition and healthy eating
- Calories and macronutrients
- Sleep and recovery
- General health and wellness

Rules:
1. Respond in the user's language.
2. Be friendly, clear, and practical.
3. Remember information from the provided
   conversation history.
4. Do not invent personal information.
5. Do not provide medical diagnoses.
6. Consider exercise safety.
7. Ask questions when important data is missing.
8. Do not claim to have access to user records
   unless they were actually provided.
"""


# ==================================
# 6. Chat Endpoint
# ==================================


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):

    message = request.message.strip()

    if not message:
        raise HTTPException(
            status_code=422,
            detail="Message cannot be empty"
        )

    # 1. Identify conversation
    conversation_id = (
        request.conversation_id or str(uuid4())
    )

    # 2. Load previous messages from SQLite
    if request.conversation_id:

        session = get_conversation(conversation_id)

        if session is None:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found"
            )

        if session["gender"] != request.gender:
            raise HTTPException(
                status_code=409,
                detail="Conversation persona mismatch"
            )

        history = session["history"]

    else:
        history = []

    # 3. Select assistant persona
    persona_name = (
        "Shaker (شاكر)"
        if request.gender == "male"
        else "Nada (ندى)"
    )

    persona_instructions = (
        f"Your name is {persona_name}. "
        "Use this identity when speaking about yourself. "
        + SYSTEM_INSTRUCTIONS
    )

    # 4. Convert SQLite messages to Gemini format
    contents = []

    for item in history:
        contents.append(
            types.Content(
                role=item["role"],
                parts=[
                    types.Part(text=item["content"])
                ]
            )
        )

    # 5. Add the new user message
    contents.append(
        types.Content(
            role="user",
            parts=[types.Part(text=message)]
        )
    )

    # 6. Send conversation to Gemini
    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=persona_instructions
            )
        )

    except errors.APIError as error:

        print("GEMINI ERROR CODE:", error.code)
        print(
            "GEMINI ERROR DETAILS:",
            str(error)[:500]
        )

        if error.code == 429:
            raise HTTPException(
                status_code=429,
                detail="Gemini quota or rate limit exceeded"
            )

        if error.code == 503:
            raise HTTPException(
                status_code=503,
                detail="Gemini temporarily unavailable"
            )

        raise HTTPException(
            status_code=502,
            detail="Gemini API request failed"
        )

    # 7. Extract AI response
    reply = response.text

    if not reply:
        raise HTTPException(
            status_code=502,
            detail="Gemini returned an empty response"
        )

    # 8. Save conversation to SQLite
    save_turn(
        conversation_id=conversation_id,
        gender=request.gender,
        user_message=message,
        assistant_reply=reply
    )

    # 9. Return response
    return ChatResponse(
        reply=reply,
        conversation_id=conversation_id
    )
