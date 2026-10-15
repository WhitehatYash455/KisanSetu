import pytest
from httpx import AsyncClient
from app.services.sms_service import sms_service
from app.services.maps_service import maps_service


@pytest.mark.asyncio
async def test_sms_service_generation_and_dispatch():
    """Validates localized SMS generation and multi-language dispatch."""
    res_en = await sms_service.send_sms(
        phone_number="+919876543210",
        message_type="PRICE_ALERT",
        language="en",
        crop_name="Onion",
        market_name="Pimpalgaon Baswant APMC",
        price=2480.0
    )
    assert res_en["delivery_status"] in ["DELIVERED", "SENT"]
    assert "₹2,480" in res_en["message_body"]
    assert "Onion" in res_en["message_body"]

    res_mr = await sms_service.send_sms(
        phone_number="+919876543210",
        message_type="PRICE_ALERT",
        language="mr",
        crop_name="कांदा",
        market_name="पिंपळगाव",
        price=2480.0
    )
    assert "कृषीसेतू" in res_mr["message_body"]
    assert "कांदा" in res_mr["message_body"]


@pytest.mark.asyncio
async def test_maps_routing_service_calculations():
    """Validates road driving calculations, duration, and logistics deductions."""
    # From Niphad farm (20.08, 74.11) to Pimpalgaon APMC (20.1687, 73.9856)
    route = await maps_service.get_driving_route(
        origin_lat=20.08,
        origin_lon=74.11,
        dest_lat=20.1687,
        dest_lon=73.9856,
        quantity_quintals=50.0
    )
    assert route["road_distance_km"] > 0
    assert route["estimated_duration_minutes"] > 0
    assert route["estimated_diesel_cost"] > 0
    assert route["estimated_hamali_cost"] == 50.0 * 18.0
    assert route["total_transport_cost"] > 0
    assert len(route["route_geometry"]) >= 2


@pytest.mark.asyncio
async def test_market_route_endpoint(async_client: AsyncClient):
    """Tests the GET /markets/{market_id}/route REST endpoint."""
    resp = await async_client.get(
        "/api/v1/markets/m0010000-0000-0000-0000-000000000001/route",
        params={"farmer_lat": 20.00, "farmer_lon": 74.00, "quantity_quintals": 30.0}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["market_name"] == "Lasalgaon APMC"
    assert data["road_distance_km"] > 0
    assert "route_geometry" in data
    assert data["total_transport_cost"] > 0


@pytest.mark.asyncio
async def test_send_sms_api_endpoint(async_client: AsyncClient):
    """Tests the POST /notifications/send-sms endpoint."""
    resp = await async_client.post(
        "/api/v1/notifications/send-sms",
        headers={"Authorization": "Bearer demo-token-farmer-01"},
        json={
            "phone_number": "+919876543210",
            "message_type": "RECOMMENDATION",
            "language": "hi",
            "crop_name": "सोयाबीन",
            "market_name": "इंदौर मंडी",
            "price": 4650.0
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "message_id" in data
    assert "इंदौर मंडी" in data["message_body"]
