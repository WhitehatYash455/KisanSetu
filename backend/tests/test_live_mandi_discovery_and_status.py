import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_nearby_mandis_discovery_endpoint(async_client: AsyncClient):
    """Tests the genuine nearest mandi discovery and net profit recommendation engine."""
    # Farmer located near Pune Market Yard (lat 18.4975, lon 73.8647)
    resp = await async_client.get(
        "/api/v1/markets/nearby?farmer_lat=18.4975&farmer_lon=73.8647&radius_km=100&quantity_quintals=25.0"
    )
    assert resp.status_code == 200
    data = resp.json()
    
    assert data["farmer_latitude"] == 18.4975
    assert data["farmer_longitude"] == 73.8647
    assert data["search_radius_km"] == 100.0
    assert data["total_mandis_found"] >= 1
    assert len(data["mandis"]) >= 1
    
    # Verify Pune APMC is discovered
    pune_mandi = next((m for m in data["mandis"] if "Pune" in m["market_name"]), None)
    assert pune_mandi is not None
    assert pune_mandi["straight_line_distance_km"] < 10.0
    assert pune_mandi["road_distance_km"] >= pune_mandi["straight_line_distance_km"]
    assert pune_mandi["latest_modal_price"] is not None
    assert pune_mandi["estimated_net_proceeds"] is not None
    assert pune_mandi["net_proceeds_per_quintal"] is not None
    assert "https://www.google.com/maps/dir/" in pune_mandi["directions_url"]

    # Verify explainable recommendation rationale
    assert data["recommendation_explanation"] is not None
    assert "Net Proceeds" in data["recommendation_explanation"]
    assert data["best_net_profit_market"] is not None


@pytest.mark.asyncio
async def test_nearby_mandis_validation_error_on_invalid_coords(async_client: AsyncClient):
    """Ensures out-of-range latitude or longitude is strictly rejected."""
    resp = await async_client.get("/api/v1/markets/nearby?farmer_lat=999.0&farmer_lon=73.8647")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_data_status_transparency_endpoint(async_client: AsyncClient):
    """Ensures data status transparency endpoint provides live pipeline health and dates."""
    resp = await async_client.get("/api/v1/data-status")
    assert resp.status_code == 200
    data = resp.json()
    
    assert data["system_status"] == "operational"
    assert data["total_active_prices"] > 0
    assert len(data["official_sources"]) >= 2
    assert data["verified_markets_count"] > 0
    assert data["supported_commodities_count"] > 0
    
    # Verify primary official government source
    agmark = next((s for s in data["official_sources"] if "Agmarknet" in s["source_name"]), None)
    assert agmark is not None
    assert "agmarknet.gov.in" in agmark["official_url"]


@pytest.mark.asyncio
async def test_reverse_geocoding_endpoint(async_client: AsyncClient):
    """Tests location reverse-geocoding endpoint for Indian coordinates."""
    payload = {
        "latitude": 18.4975,
        "longitude": 73.8647,
    }
    resp = await async_client.post("/api/v1/location/reverse-geocode", json=payload)
    assert resp.status_code == 200
    geo = resp.json()
    assert geo["state"] == "Maharashtra"
    assert "Pune" in (geo.get("district") or geo.get("display_name") or "")
    assert geo["provider"] in ["OpenStreetMap Nominatim", "Maharashtra Regional Coordinate Index"]


@pytest.mark.asyncio
async def test_daily_mandi_sync_trigger_and_status(async_client: AsyncClient):
    """Tests triggering automated daily Mandi sync and querying its status."""
    sync_resp = await async_client.post("/api/v1/markets/sync-daily")
    assert sync_resp.status_code == 200
    sync_data = sync_resp.json()
    assert sync_data["status"] == "success"
    assert sync_data["records_count"] > 0

    status_resp = await async_client.get("/api/v1/markets/sync-status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["status"] == "healthy"
    assert status_data["records_count"] > 0
    assert status_data["today"] is not None
