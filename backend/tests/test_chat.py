import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_chat_history_24h():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/chat/history")
        assert res.status_code == 200
        data = res.json()
        assert "messages" in data
        assert data["window_hours"] == 24
        assert data["total_count"] >= 1
        assert "server_time" in data


@pytest.mark.asyncio
async def test_chat_send_and_forecast_intent():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "message": "What is the 7-day price forecast for Onion?",
            "crop_name": "Onion",
            "quantity": 50.0
        }
        res = await client.post("/api/v1/chat/send", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        response_obj = data["response"]
        assert response_obj["sender"] == "advisor"
        assert "Onion" in response_obj["crop_name"]
        assert "ARIMA" in response_obj["message"] or "Forecast" in response_obj["message"]
        assert len(response_obj["suggested_followups"]) > 0


@pytest.mark.asyncio
async def test_chat_send_and_recommendation_intent():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "message": "Where should I sell 50 quintals of Onion to get highest net profit?",
            "crop_name": "Onion",
            "quantity": 50.0
        }
        res = await client.post("/api/v1/chat/send", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        response_obj = data["response"]
        assert "Net Pocket Realization" in response_obj["message"] or "Top Choice" in response_obj["message"]


@pytest.mark.asyncio
async def test_chat_quick_prompts():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/chat/quick-prompts")
        assert res.status_code == 200
        data = res.json()
        assert "quick_prompts" in data
        assert len(data["quick_prompts"]) >= 4
