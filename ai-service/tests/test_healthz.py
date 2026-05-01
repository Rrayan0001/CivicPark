import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock


@pytest.fixture
def client():
    # Patch Supabase so we don't need a real connection
    with patch("app.db.supabase_client.create_client", return_value=MagicMock()):
        from app.main import app
        return TestClient(app)


def test_healthz_returns_ok(client):
    res = client.get("/healthz")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "version" in body
    assert "environment" in body


def test_healthz_version_format(client):
    res = client.get("/healthz")
    version = res.json()["version"]
    parts = version.split(".")
    assert len(parts) == 3
    assert all(p.isdigit() for p in parts)
