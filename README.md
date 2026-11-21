# Lyftr AI — LLM Chatbot with Key Failover and Response Caching

A full-stack AI chatbot built using React, FastAPI, LiteLLM, Google Gemini and SQLite.

## 1. Live URLs

- Frontend: Add deployed frontend URL.
- Backend: Add deployed backend URL.
- Health: `<backend-url>/health`
- API documentation: `<backend-url>/docs`

## 2. Technology Stack

- Frontend: React
- Backend: Python and FastAPI
- LLM provider: Google Gemini
- LLM integration and caching: LiteLLM
- Database: SQLite
- Containerization: Docker and Docker Compose

## 3. Run Locally

### Prerequisites

- Python 3.11
- Node.js and npm
- Docker Desktop
- Two valid Google Gemini API keys

### Environment setup

Copy the example environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Add two valid Gemini API keys to `LLM_API_KEYS`.

Never commit `.env` or expose API keys.

### Run with Docker

```bash
docker compose up --build -d
```

Frontend: http://localhost:3000

Backend: http://localhost:8000

Health: http://localhost:8000/health

API documentation: http://localhost:8000/docs

Stop the application:

```bash
docker compose down
```

The SQLite database is stored in a named Docker volume mounted at `/data`, allowing conversation history to survive backend container restarts.

### Run without Docker

Backend:

```bash
cd backend
python -m venv .venv
```

Activate the environment:

```powershell
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend, in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Configure `VITE_API_BASE_URL` to point to the backend.

## 4. Design Decisions

### API key failover

The backend reads multiple API keys from `LLM_API_KEYS`. Keys are identified internally as `key_1`, `key_2`, etc.

When a provider request encounters a retryable error such as HTTP 429 or 5xx, the backend attempts another configured key.

### Response caching

LiteLLM's built-in caching is used to avoid repeated model inference for identical requests.

The cache considers the model and complete message context, including conversation history and the new message.

A cache hit returns the cached response and usage information with:
- `resolution_source: LLM_CACHE`
- `key_id: null`
- `fallback_attempts: 0`

A new model inference returns:
- `resolution_source: LIVE_INFERENCE`

### Conversation history

SQLite stores user and assistant messages with associated metadata.

Each browser page load creates a new session. Follow-up messages in the same session use stored conversation history.

### Database persistence

Docker Compose mounts a named volume at `/data`.

The database URL is:

```text
sqlite:////data/app.db
```

This preserves database contents across backend container restarts.

## 5. API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Backend health and configuration status |
| POST | `/chat` | Send a message and receive an assistant response |
| GET | `/sessions/{session_id}/messages` | Retrieve session conversation history |

The chat response includes the assistant reply and metadata such as model, latency, token usage, key identifier, fallback attempts and resolution source.

## 6. Verification

### Health check

```bash
curl http://localhost:8000/health
```

### Live inference

Send a message through the frontend or `/chat` endpoint. The metadata should show `LIVE_INFERENCE`.

### Cache verification

Send the same initial message in a new session. The cached response should show `LLM_CACHE`.

### Key failover

Enable failure simulation locally using:

```text
ENABLE_FAILURE_SIMULATION=true
```

Restart the backend, then send a request with:

```text
X-Simulate-Failure: key_1=429
```

The backend should recover using `key_2`.

Other supported simulation examples:

```text
key_1=500
key_1=429,key_2=500
*=429
```

Failure simulation should only be enabled where required for assignment verification.

### Token tracking

Input and output token counts are reported for each individual request.

### Automated backend tests

The test file is located at:

```text
backend/tests/test_api.py
```

The tests cover:
- Health endpoint.
- Blank-message validation.
- Unknown-session history.

The production Docker image does not include the tests directory. To run the tests using Docker, copy the test file into the running backend container:

```powershell
docker cp .\backend\tests\test_api.py lyftr-ai-chatbot-backend-1:/app/test_api.py
docker compose exec backend pytest -v /app/test_api.py
```

## 7. Setup Used

- Editor: Visual Studio Code
- Programming languages: Python and JavaScript
- Frontend: React
- Backend: FastAPI
- LLM: Google Gemini through LiteLLM
- Database: SQLite
- Containerization: Docker and Docker Compose
- Testing: pytest and FastAPI TestClient

## 8. Bonus Features

- Responsive dark-themed interface.
- Custom system prompt field.
- Backend, API-key and cache status panel.
- Typing indicator.
- Suggested prompts.
- Markdown rendering for assistant responses.
- Per-message metadata display.

## 9. Deployment Configuration

For deployment:

- Set `VITE_API_BASE_URL` to the public backend URL during frontend build.
- Set `ALLOWED_ORIGINS` to the deployed frontend origin.
- Configure two valid Gemini API keys securely in the backend environment.
- Persist the SQLite database using a durable volume.
- Keep real API keys out of GitHub.

## 10. Security

- Never commit `.env` or real API keys.
- Use environment variables for secrets.
- Do not expose API keys in frontend code or API responses.
- Disable failure simulation in normal production operation.

