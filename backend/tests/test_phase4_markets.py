import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_commodities(async_client: AsyncClient):
    resp = await async_client.get("/api/v1/markets/commodities")
    assert resp.status_code == 200
    commodities = resp.json()
    assert len(commodities) >= 5
    onion = next((c for c in commodities if c["code"] == "ONION"), None)
    assert onion is not None
    assert onion["name_en"] == "Onion"
    assert onion["name_hi"] == "प्याज"
    assert onion["name_mr"] == "कांदा"


@pytest.mark.asyncio
async def test_market_search_and_haversine_distance(async_client: AsyncClient):
    # Search mandis near Nashik (lat 20.0, lon 74.0)
    resp = await async_client.get("/api/v1/markets?farmer_lat=20.0&farmer_lon=74.0")
    assert resp.status_code == 200
    markets = resp.json()
    assert len(markets) > 0
    # Pimpalgaon and Lasalgaon should have valid distance calculated
    lasalgaon = next((m for m in markets if m["code"] == "LASALGAON"), None)
    assert lasalgaon is not None
    assert lasalgaon["distance_km"] is not None
    assert lasalgaon["distance_km"] > 0
    assert lasalgaon["distance_km"] < 50.0  # Lasalgaon is within 50km of 20.0, 74.0


@pytest.mark.asyncio
async def test_mandi_prices_modal_constraints(async_client: AsyncClient):
    resp = await async_client.get("/api/v1/markets/prices")
    assert resp.status_code == 200
    prices = resp.json()
    assert len(prices) > 0
    for p in prices:
        # Enforce mathematical consistency: min <= modal <= max
        assert p["min_price"] <= p["modal_price"]
        assert p["modal_price"] <= p["max_price"]
        assert p["price_unit"] == "INR/Quintal"
        assert p["data_freshness_status"] in ["live", "cached", "historical", "sample"]


@pytest.mark.asyncio
async def test_mandi_historical_price_series(async_client: AsyncClient):
    resp = await async_client.get(
        "/api/v1/markets/history?commodity_id=c0010000-0000-0000-0000-000000000001&market_id=m0010000-0000-0000-0000-000000000001&days=30"
    )
    assert resp.status_code == 200
    series = resp.json()
    assert len(series) >= 30
    for point in series:
        assert "date" in point
        assert "modal_price" in point
        assert "min_price" in point
        assert "max_price" in point
        assert point["min_price"] <= point["modal_price"] <= point["max_price"]


@pytest.mark.asyncio
async def test_market_comparison(async_client: AsyncClient):
    # Test POST with multiple query params
    resp = await async_client.post(
        "/api/v1/markets/compare?market_ids=m0010000-0000-0000-0000-000000000001&market_ids=m0010000-0000-0000-0000-000000000002"
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["markets_compared"]) == 2
    assert "price_differential" in data
    assert "best_market_by_price" in data

    # Test GET with comma-separated market_ids (frontend format)
    resp_get = await async_client.get(
        "/api/v1/markets/compare?market_ids=m0010000-0000-0000-0000-000000000001,m0010000-0000-0000-0000-000000000002"
    )
    assert resp_get.status_code == 200
    data_get = resp_get.json()
    assert len(data_get["markets_compared"]) == 2
    assert "price_differential" in data_get


@pytest.mark.asyncio
async def test_non_existent_commodity_returns_empty_never_fabricates(async_client: AsyncClient):
    # Searching for a crop with zero records should return an empty array, NOT fabricated prices
    resp = await async_client.get("/api/v1/markets/prices?commodity_id=nonexistent-exotic-fruit-xyz")
    assert resp.status_code == 200
    prices = resp.json()
    assert prices == []  # Strictly empty, no manufactured figures
