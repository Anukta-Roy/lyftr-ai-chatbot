import os
os.environ.setdefault("LLM_API_KEYS", "test-key-one,test-key-two")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_app.db")
os.environ.setdefault("ENABLE_FAILURE_SIMULATION", "true")

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["keys_configured"] == 2


def test_validation_rejects_blank_message():
    response = client.post("/chat", json={"session_id": "test-session", "message": " "})
    assert response.status_code == 422


def test_history_unknown_session():
    response = client.get("/sessions/this-session-does-not-exist/messages")
    assert response.status_code == 404
