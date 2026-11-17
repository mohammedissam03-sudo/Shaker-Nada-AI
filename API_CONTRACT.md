# Shaker & Nada AI - API Contract

## 1. Overview

This document describes the API contract between
the Laravel application and the Shaker & Nada
FastAPI chatbot backend.

The Laravel team is responsible for authenticating
website users and forwarding their chat requests
to FastAPI.

The chatbot backend handles:
- Gemini LLM integration
- Shaker and Nada personas
- Fitness profile context
- SQLite conversation memory
- Conversation ownership validation

## 2. Local Development URL

Base URL:

http://127.0.0.1:8000

The deployment URL must be configured by the
Software Engineering team.

## 3. Authentication

Protected endpoints require:

X-Internal-Token: <server-side-secret>

The token must be stored securely on the server.

NEVER expose the internal token or Gemini API key
in frontend JavaScript or browser requests.

Laravel must obtain owner_id from the authenticated
user session, not from untrusted browser input.

## 4. Health Check

GET /health

Authentication: Not required.

Example response:

{
  "status": "ok",
  "ai_provider": "gemini"
}

This endpoint checks application health but does
not guarantee that Gemini is currently available.

## 5. Internal Authentication Check

GET /internal/check

Authentication: Required.

Successful response:

{
  "status": "authorized"
}

## 6. Chat Endpoint

POST /internal/chat

Authentication: Required.

Content-Type: application/json

### Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| owner_id | string | Yes | Authenticated user ID, 1-128 characters |
| message | string | Yes | User message, 1-2000 characters |
| gender | string | No | male or female; defaults to male |
| conversation_id | string/null | No | Existing conversation ID or null |
| profile | object/null | No | Optional fitness profile |

Allowed owner_id characters:

A-Z, a-z, 0-9, colon (:), underscore (_), hyphen (-).

### Fitness profile fields

All profile fields are optional.

| Field | Type | Validation |
| --- | --- | --- |
| age | integer | 13-120 |
| height_cm | number | 80-250 |
| weight_kg | number | 20-350 |
| fitness_goal | string | Maximum 80 characters |
| activity_level | string | beginner, intermediate, advanced |

Laravel should calculate age if its database stores
date_of_birth instead.

### Example request

{
  "owner_id": "user:42",
  "message": "Hello Shaker, I want to start exercising.",
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

### Successful response

HTTP 200

{
  "reply": "AI-generated response",
  "conversation_id": "generated-conversation-id"
}

Laravel must retain conversation_id for subsequent
messages in the same conversation.

## 7. Conversation Rules

- A new chat starts with conversation_id = null.
- Continue a chat using the returned conversation_id.
- Conversations belong to a specific owner_id.
- A user cannot retrieve another user's conversation
  through the protected chat API.
- Shaker uses gender = male.
- Nada uses gender = female.
- Changing persona requires a new conversation.
- Existing conversations must retain their persona.
- Fitness profile information is sent as context
  for the current request.
- Fitness profile data is not automatically persisted
  as structured profile fields by the chat backend.
- Laravel should supply current profile data whenever
  the assistant needs it.

## 8. Error Handling

Possible HTTP responses include:

| Status | Meaning |
| --- | --- |
| 200 | Chat completed successfully |
| 401 | Internal authentication failed |
| 404 | Conversation not found or inaccessible |
| 409 | Conversation persona mismatch |
| 413 | Request exceeds development proxy size limit |
| 422 | Invalid request fields or empty message |
| 429 | Gemini quota or rate limit exceeded |
| 502 | Gemini API failure or empty AI response |
| 503 | Gemini service or connection unavailable |

HTTP 413 refers to the local Vite development proxy,
not a documented FastAPI /internal/chat limit.

FastAPI errors normally use a JSON detail field.

Example:

{
  "detail": "Conversation not found"
}

Laravel must handle API errors without exposing
internal configuration or secret tokens.

## 9. Laravel Integration Architecture

Browser / Chat Widget
        |
        v
Laravel Authenticated Endpoint
        |
        |  Resolve authenticated owner_id
        |  Attach X-Internal-Token
        v
FastAPI POST /internal/chat
        |
        v
Gemini LLM + SQLite
        |
        v
FastAPI JSON Response
        |
        v
Laravel
        |
        v
Browser / Chat Widget

## 10. Important Deployment Notes

- The Vite development proxy is for local testing only.
- Its owner_id is hardcoded as local-development-user.
- Do not use that proxy as production authentication.
- Keep ENABLE_LEGACY_CHAT=false.
- Protect the internal FastAPI endpoint from
  unauthorized network access.
- Use HTTPS or a protected private network for
  server-to-server traffic.
- Do not commit real .env files or API secrets.
- Concurrent requests to the same conversation may
  require request serialization for ordered history.
- Deployment and Laravel integration are handled
  by the Software Engineering team.

## 11. Responsibilities

AI Team:
- Provide FastAPI chatbot backend
- Provide Gemini integration
- Provide SQLite conversation memory
- Provide Shaker/Nada 3D widget and UI
- Provide API and integration documentation

Software Engineering Team:
- Authenticate website users
- Integrate the widget into Laravel
- Supply real user identity and fitness profile
- Implement the authenticated Laravel API gateway
- Configure deployment and production hosting
- Test integration within the website

The gym recommendation engine is a separate component
and is not part of this chatbot API contract.
