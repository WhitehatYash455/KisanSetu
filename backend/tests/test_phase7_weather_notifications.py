import pytest
from httpx import AsyncClient
from app.services.weather_service import evaluate_transit_risk, evaluate_harvest_risk


@pytest.mark.asyncio
async def test_weather_endpoint(async_client: AsyncClient):
    """Verify agro-weather endpoint returns real or baseline 7-day forecast with risk ratings."""
    response = await async_client.get("/api/v1/weather?latitude=20.0063&longitude=74.0022&location_name=Nashik")
    assert response.status_code == 200
    data = response.json()
    assert "location_name" in data
    assert data["latitude"] == 20.0063
    assert data["longitude"] == 74.0022
    assert "current_temperature_c" in data
    assert "current_humidity_pct" in data
    assert "forecast_days" in data
    assert len(data["forecast_days"]) >= 5
    # Verify first day risk fields
    first_day = data["forecast_days"][0]
    assert first_day["harvest_risk_level"] in ["Low", "Moderate", "High"]
    assert first_day["transport_risk_level"] in ["Low", "Moderate", "High"]
    assert "source_provider" in data


def test_transit_risk_evaluation_logic():
    """Verify road transport risk rules for perishable agricultural produce."""
    assert evaluate_transit_risk(precip_mm=0.0, wind_kmh=10.0, weather_code=0) == "Low"
    assert evaluate_transit_risk(precip_mm=4.0, wind_kmh=15.0, weather_code=61) == "Moderate"
    assert evaluate_transit_risk(precip_mm=1.0, wind_kmh=30.0, weather_code=1) == "Moderate"
    assert evaluate_transit_risk(precip_mm=20.0, wind_kmh=15.0, weather_code=65) == "High"
    assert evaluate_transit_risk(precip_mm=2.0, wind_kmh=50.0, weather_code=95) == "High"


def test_harvest_risk_evaluation_logic():
    """Verify field harvest risk logic based on precipitation probability."""
    assert evaluate_harvest_risk(precip_prob=10.0, precip_mm=0.0) == "Low"
    assert evaluate_harvest_risk(precip_prob=40.0, precip_mm=3.0) == "Moderate"
    assert evaluate_harvest_risk(precip_prob=75.0, precip_mm=12.0) == "High"


@pytest.mark.asyncio
async def test_notifications_list_and_unread_count(async_client: AsyncClient, override_auth):
    """Verify fetching notifications and unread counter."""
    # Get list
    res = await async_client.get("/api/v1/notifications")
    assert res.status_code == 200
    notifs = res.json()
    assert isinstance(notifs, list)
    assert len(notifs) >= 1

    # Check unread count endpoint
    count_res = await async_client.get("/api/v1/notifications/unread-count")
    assert count_res.status_code == 200
    assert "unread_count" in count_res.json()


@pytest.mark.asyncio
async def test_mark_notification_as_read(async_client: AsyncClient, override_auth):
    """Verify marking single notification as read."""
    # List to get an id
    res = await async_client.get("/api/v1/notifications")
    assert res.status_code == 200
    notifs = res.json()
    assert len(notifs) > 0
    notif_id = notifs[0]["id"]

    patch_res = await async_client.patch(f"/api/v1/notifications/{notif_id}/read")
    assert patch_res.status_code == 200
    assert patch_res.json()["message"] == "Notification marked as read"


@pytest.mark.asyncio
async def test_price_alert_lifecycle_and_evaluation(async_client: AsyncClient, override_auth):
    """Verify creating, listing, checking/evaluating, and deleting price alerts."""
    # 1. Create alert for Onion: target price ₹2000 (below current modal ~2420)
    create_payload = {
        "commodity_id": "c0010000-0000-0000-0000-000000000001",
        "market_id": "m0010000-0000-0000-0000-000000000001",
        "target_price": 2000.0,
        "condition": "ABOVE"
    }
    create_res = await async_client.post("/api/v1/notifications/alerts", json=create_payload)
    assert create_res.status_code == 201
    created_alert = create_res.json()
    alert_id = created_alert["id"]
    assert created_alert["target_price"] == 2000.0

    # 2. List alerts
    list_res = await async_client.get("/api/v1/notifications/alerts")
    assert list_res.status_code == 200
    alerts = list_res.json()
    assert any(a["id"] == alert_id for a in alerts)

    # 3. Check and evaluate alerts
    eval_res = await async_client.post("/api/v1/notifications/alerts/check")
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    assert eval_data["status"] == "success"
    assert eval_data["evaluated_alerts_count"] >= 1
    # Since 2420 >= 2000, it should trigger at least 1 notification
    assert eval_data["triggered_count"] >= 1

    # 4. Delete alert
    del_res = await async_client.delete(f"/api/v1/notifications/alerts/{alert_id}")
    assert del_res.status_code == 200
    assert del_res.json()["message"] == "Price alert deleted successfully"
