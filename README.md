# Shaker & Nada AI Chatbot

## 1. Project Overview

Shaker & Nada is an AI-powered fitness chatbot
developed as an independent component for the
OptiFit graduation project.

The project provides two interactive 3D assistants:

- Shaker: Male assistant with a blue theme
- Nada: Female assistant with a pink theme

Both assistants provide text-based fitness guidance
using the Google Gemini Large Language Model.

The chatbot and robot are delivered separately
from the Laravel website.

The Software Engineering team is responsible
for integrating these components into Laravel.

## 2. Main Features

- Interactive 3D robot built with Three.js
- Shaker and Nada character selection
- Robot dragging and animated reactions
- Responsive desktop and mobile interface
- Glass-style chat window
- Animated typing indicator
- Gemini-powered text conversations
- Fitness profile context
- SQLite conversation memory
- Conversation ownership validation
- Protected internal API for Laravel integration

## 3. Technology Stack

### AI Backend

- Python
- FastAPI
- Google Gemini API
- Pydantic
- SQLite
- Uvicorn

### Frontend

- JavaScript
- HTML and CSS
- Three.js
- Vite

### Integration Target

- Laravel website
- Authenticated server-to-server communication

## 4. Project Structure

Shaker-Nada-AI/
|
|-- ai-backend/
|   |-- main.py
|   |-- storage.py
|   |-- requirements.txt
|   |-- .env.example
|
|-- widget/
|   |-- src/
|   |   |-- assistant/
|   |   |   |-- Robot3D.js
|   |   |   |-- ChatWidget.js
|   |   |   |-- PersonaManager.js
|   |   |   |-- robot3d.css
|   |   |   |-- chat-widget.css
|   |   |-- main.js
|   |   |-- style.css
|   |-- index.html
|   |-- package.json
|   |-- package-lock.json
|   |-- vite.config.js
|
|-- API_CONTRACT.md
|-- INTEGRATION_GUIDE.md
|-- README.md

## 5. Prerequisites

For the standalone development environment:

- Python compatible with requirements.txt
- Node.js and npm compatible with the installed Vite
- A valid Google Gemini API key
- A private internal API token

Install the required Python and JavaScript
dependencies before starting the project.

## 6. Backend Setup - Windows PowerShell

Open PowerShell in the project directory.

Navigate to the backend:

cd ai-backend

Create a virtual environment:

python -m venv .venv

Install the dependencies:

.\.venv\Scripts\python.exe -m pip install -r requirements.txt

Create the environment configuration:

Copy .env.example .env

Edit .env and configure:

GEMINI_API_KEY=YOUR_REAL_GEMINI_KEY
INTERNAL_API_TOKEN=YOUR_PRIVATE_RANDOM_SECRET
ENABLE_LEGACY_CHAT=false

Do not commit or share the real .env file.

Run the backend:

.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000

Backend address:

http://127.0.0.1:8000

Health endpoint:

http://127.0.0.1:8000/health

API documentation:

http://127.0.0.1:8000/docs

The SQLite database is initialized when
the backend application module loads.

## 7. Frontend Setup - Windows PowerShell

Open a separate PowerShell terminal.

Navigate to the widget directory:

cd widget

Install dependencies:

npm.cmd ci

Start the development server:

npm.cmd run dev

Open the displayed local URL, normally:

http://127.0.0.1:5173/

The backend must be running for AI chat requests
to succeed.

The local Vite proxy reads INTERNAL_API_TOKEN
from ai-backend/.env.

The standalone widget is intended for development
and demonstration.

## 8. Build the Widget

From widget/ run:

npm.cmd run build

The build output is generated in:

widget/dist/

A successful build verifies frontend bundling,
but does not verify integration with Laravel.

## 9. Chat API

Protected chat endpoint:

POST /internal/chat

Authentication header:

X-Internal-Token

Request data includes:

- owner_id
- message
- gender
- conversation_id
- profile

The response includes:

- reply
- conversation_id

For the complete API contract, read:

API_CONTRACT.md

## 10. Laravel Integration

The Laravel team must implement an authenticated
server-side gateway to FastAPI.

Expected communication flow:

Browser
   |
   v
Laravel Authenticated Endpoint
   |
   v
FastAPI /internal/chat
   |
   v
Gemini + SQLite
   |
   v
Laravel
   |
   v
Browser Chat Widget

Laravel must derive owner_id from the
authenticated user account.

Never trust a browser-provided owner_id
as the authoritative user identity.

The existing Vite proxy uses a fixed development
identity and is not suitable for production.

The frontend currently uses /api/chat.
Laravel must implement a compatible route
or adapt the frontend request URL.

For integration instructions, read:

INTEGRATION_GUIDE.md

## 11. Security Notes

- Never expose Gemini API keys in frontend code.
- Never expose INTERNAL_API_TOKEN to the browser.
- Keep ENABLE_LEGACY_CHAT=false.
- Do not publish real .env files.
- Do not publish private conversation databases.
- Do not deploy the local Vite proxy as an
  authentication solution.
- Protect access to FastAPI internal endpoints.
- Use secure server-to-server communication.
- Preserve conversation ownership checks.

## 12. Project Scope

The delivered AI component includes:

- Shaker and Nada 3D robot
- Robot animations and interactions
- Chat interface
- FastAPI chatbot backend
- Gemini API integration
- SQLite conversation memory
- Technical integration documentation

The following are outside this component's scope:

- Laravel website implementation
- Laravel user authentication
- Website page development
- Production hosting and deployment
- Final Laravel integration implementation
- Gym recommendation engine

The gym recommendation engine is a separate
AI component developed independently.

## 13. Handoff Documents

Read these documents before integration:

1. README.md
   Project overview and local setup.

2. API_CONTRACT.md
   API endpoints, request fields, responses,
   authentication, and error handling.

3. INTEGRATION_GUIDE.md
   Laravel integration requirements and
   responsibility boundaries.

4. ai-backend/.env.example
   Required environment variable names.

## 14. Integration Status

The AI chatbot and robot have undergone
standalone development testing.

The Laravel integration must be completed
and tested by the Software Engineering team.

Passing standalone tests does not guarantee
correct behavior inside the Laravel website.
