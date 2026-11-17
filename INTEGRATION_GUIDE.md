# Shaker & Nada AI - Laravel Integration Guide

## 1. Purpose

This document explains how the Software Engineering
team can integrate the Shaker & Nada chatbot
components into the OptiFit Laravel website.

The AI component has been developed independently.

Laravel integration and website deployment are the
responsibility of the Software Engineering team.

## 2. Delivered Components

### AI Backend

Directory: ai-backend/

Main files:

- main.py: FastAPI, Gemini API, chatbot logic
- storage.py: SQLite conversation memory
- requirements.txt: Python dependencies
- .env.example: Backend environment variable template

### Frontend Widget

Directory: widget/

Main files:

- src/assistant/Robot3D.js
- src/assistant/ChatWidget.js
- src/assistant/PersonaManager.js
- src/assistant/robot3d.css
- src/assistant/chat-widget.css
- src/main.js
- src/style.css
- package.json
- package-lock.json
- vite.config.js

The widget uses JavaScript, CSS, and Three.js.

It includes:
- Shaker male persona
- Nada female persona
- Interactive 3D robot
- Dragging and animation behavior
- Responsive chat interface
- Glass-style chat panel
- Gemini-generated responses

## 3. Required Architecture

Browser
   |
   v
Laravel Website
   |
   v
Authenticated Laravel Chat Route
   |
   v
FastAPI POST /internal/chat
   |
   v
Gemini API + SQLite

The browser must communicate with Laravel.

Laravel must communicate with FastAPI securely.

Do not send Gemini credentials or the internal
API token to the browser.

## 4. Local Backend Setup

From the project root:

cd ai-backend

Create a Python virtual environment.

Install dependencies:

pip install -r requirements.txt

Create a local .env file using .env.example.

Set real credentials privately:

GEMINI_API_KEY
INTERNAL_API_TOKEN

Keep:

ENABLE_LEGACY_CHAT=false

Start FastAPI:

python -m uvicorn main:app --host 127.0.0.1 --port 8000

Local health check:

GET http://127.0.0.1:8000/health

The database is initialized by the backend
startup configuration used in the application.

Do not copy a developer's private SQLite
database into the production environment.

## 5. Local Widget Setup

From the widget directory:

npm ci

npm run dev

The standalone development widget runs through
Vite, typically at:

http://127.0.0.1:5173/

The Vite configuration contains a development-only
chat proxy.

That proxy forwards /api/chat requests to FastAPI
and supplies the internal authentication token.

Important:

The development proxy uses the fixed identity:

local-development-user

It must NOT be used as production authentication.

## 6. Laravel Chat Gateway

The Software Engineering team should implement
an authenticated Laravel chat endpoint.

Expected browser flow:

1. User signs in to the Laravel website.
2. User opens the Shaker or Nada widget.
3. Browser submits a message to Laravel.
4. Laravel verifies the authenticated session.
5. Laravel determines the user's real identity.
6. Laravel adds owner_id on the server.
7. Laravel attaches X-Internal-Token.
8. Laravel forwards the request to FastAPI.
9. Laravel returns the response to the browser.

The browser must never choose the authoritative
owner_id.

The exact Laravel route name and URL are to be
decided by the Software Engineering team.

## 7. FastAPI Connection

Protected endpoint:

POST /internal/chat

Required HTTP header:

X-Internal-Token: server-side-secret

Request body fields:

- owner_id: authenticated Laravel user identifier
- message: user message
- gender: male or female
- conversation_id: existing ID or null
- profile: optional fitness information

Example body:

{
  "owner_id": "user:42",
  "message": "I want to improve my fitness.",
  "gender": "male",
  "conversation_id": null,
  "profile": {
    "age": 23,
    "height_cm": 175,
    "weight_kg": 75,
    "fitness_goal": "muscle_gain",
    "activity_level": "beginner"
  }
}

Response format:

{
  "reply": "Generated assistant response",
  "conversation_id": "conversation-id"
}

For full validation and error responses,
refer to API_CONTRACT.md.

## 8. Frontend Integration

The Software Engineering team should:

- Install or bundle the required frontend
  JavaScript dependencies, including Three.js.
- Integrate the robot and chat widget modules
  with the Laravel frontend build system.
- Load the required CSS files.
- Mount the robot and chat components.
- Use authenticated Laravel chat requests.
- Pass the selected persona to the widget.
- Pass the relevant fitness profile data.
- Preserve the existing animation behavior.
- Test the widget on desktop and mobile.

The standalone widget's src/main.js is a
development entry point and a useful reference.

It should not be assumed that copying
widget/index.html into Laravel is sufficient.

The widget currently submits chat requests to:

/api/chat

The Laravel team must provide a compatible
authenticated route or adapt the frontend API URL.

The standalone Vite proxy is not a production
Laravel authentication gateway.

## 9. Persona Selection

Shaker:
gender = male

Nada:
gender = female

The robot appearance and colors depend on the
selected persona.

A conversation belongs to one persona.

If the user switches persona, start a new
conversation by setting conversation_id to null.

Do not continue an existing conversation using
a different gender.

## 10. Fitness Profile

The current FastAPI profile model supports:

- age
- height_cm
- weight_kg
- fitness_goal
- activity_level

The Laravel team should map the actual website
database fields to these API field names.

If Laravel stores date_of_birth instead of age,
calculate age before submitting the request.

The chatbot uses profile information as context.

The current backend does not persist these
profile fields as a separate user profile record.

For personalized responses, provide relevant
current profile data with each request.

Do not trust arbitrary profile data or user
identity fields supplied by an unauthenticated
browser request.

## 11. Conversation Memory

Conversation history is stored in SQLite.

A new conversation starts with:

conversation_id = null

FastAPI returns a conversation_id.

The frontend should preserve that identifier
for additional messages in the same conversation.

Laravel must always use the authenticated user's
owner_id when forwarding conversation requests.

Conversation ownership is checked in the backend.

The Software Engineering team is responsible for
production data storage, backups, and hosting.

## 12. Errors

Laravel should handle errors returned by FastAPI.

Examples:

401 - Internal authentication failure
404 - Conversation not found or inaccessible
409 - Conversation persona mismatch
422 - Invalid request data
429 - Gemini quota or rate limit
502 - Gemini API error
503 - Gemini temporarily unavailable

Do not expose internal secrets or raw server
configuration in browser-facing error messages.

See API_CONTRACT.md for additional details.

## 13. Security Requirements

- Keep Gemini API keys server-side.
- Keep INTERNAL_API_TOKEN server-side.
- Never expose credentials in JavaScript.
- Do not deploy the Vite development proxy as
  the production authentication mechanism.
- Keep legacy unauthenticated chat disabled.
- Authenticate users in Laravel.
- Resolve owner_id from Laravel authentication.
- Restrict access to the internal FastAPI API.
- Use HTTPS or protected private networking.
- Do not commit .env or conversations.db.
- Consider sequencing simultaneous requests
  from the same conversation.

## 14. Integration Acceptance Tests

The Software Engineering team should verify:

- Shaker appears for male users.
- Nada appears for female users.
- Robot animations still work.
- Robot dragging works on supported devices.
- The chat interface opens and closes.
- Messages reach FastAPI through Laravel.
- Gemini replies appear correctly.
- Conversation history is preserved.
- Users cannot access other users' conversations.
- Persona switching starts a new conversation.
- Fitness data is passed correctly.
- Mobile layout works.
- API errors are displayed safely.
- API secrets remain inaccessible to browsers.

Successful standalone testing does not replace
testing inside the Laravel website.

## 15. Responsibility Boundaries

AI Developer:

Deliver the working Shaker/Nada robot,
chat interface, FastAPI backend, and
technical integration documentation.

Software Engineering Team:

Implement Laravel-side integration,
user authentication, frontend mounting,
server configuration, deployment,
and integration acceptance testing.

The gym recommendation system is a separate
AI component and is not included in this
chatbot handoff.
