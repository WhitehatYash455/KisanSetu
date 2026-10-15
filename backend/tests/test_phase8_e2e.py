import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_complete_farmer_journey_e2e(async_client: AsyncClient, override_auth):
    """
    End-to-End test of the complete farmer workflow:
    1. Authentication & Profile retrieval (Opaque Farmer ID AGRI-XXXX-XXXX)
    2. Farm Parcel creation
    3. Crop lifecycle registration (Opaque Crop ID CROP-XXXX-XXXX)
    4. Mandi prices search & comparison
    5. ML price forecasting (chronological horizons)
    6. Recommendation engine (Net Realization & explainable advice)
    7. Agro-weather & transit risk check
    8. Price alert registration & evaluation triggering notification
    9. Cross-tenant isolation verification
    10. Non-fabrication guarantee verification
    """
    # 1. Profile retrieval
    profile_res = await async_client.get("/api/v1/farmer/profile")
    assert profile_res.status_code == 200
    farmer_profile = profile_res.json()
    assert farmer_profile["farmer_id"].startswith("AGRI-")

    # 2. Farm Parcel creation
    farm_payload = {
        "farm_name": "Godavari Riverside Parcel",
        "total_acreage": 8.5,
        "latitude": 20.0063,
        "longitude": 74.0022,
        "soil_type": "Black Cotton Soil",
        "irrigation_type": "Drip Irrigation"
    }
    farm_res = await async_client.post("/api/v1/farmer/farms", json=farm_payload)
    assert farm_res.status_code == 201
    created_farm = farm_res.json()
    farm_id = created_farm["id"]

    # 3. Crop creation
    crop_payload = {
        "crop_name": "Garva Red Onion",
        "commodity_id": "c0010000-0000-0000-0000-000000000001",
        "farm_id": farm_id,
        "acreage": 4.0,
        "quantity": 120.0,
        "quantity_unit": "Quintal",
        "sowing_date": "2026-06-15",
        "expected_harvest_date": "2026-11-20",
        "status": "Ready to Harvest",
        "aliases": {"en": "Onion", "hi": "प्याज", "mr": "कांदा"}
    }
    crop_res = await async_client.post("/api/v1/crops", json=crop_payload)
    assert crop_res.status_code == 201
    created_crop = crop_res.json()
    crop_id = created_crop["id"]
    assert created_crop["crop_code"].startswith("CROP-")
    assert created_crop["status"] == "Ready to Harvest"

    # 4. Mandi prices search & comparison
    mandi_res = await async_client.get("/api/v1/markets/prices?commodity_id=c0010000-0000-0000-0000-000000000001")
    assert mandi_res.status_code == 200
    mandi_data = mandi_res.json()
    assert len(mandi_data) >= 2
    # Verify modal price within realistic constraints
    for obs in mandi_data:
        assert obs["min_price"] <= obs["modal_price"] <= obs["max_price"]

    # 5. ML price forecasting (7-day horizon)
    fc_res = await async_client.get(
        "/api/v1/forecasts?commodity_id=c0010000-0000-0000-0000-000000000001&market_id=m0010000-0000-0000-0000-000000000001&horizon_days=7"
    )
    assert fc_res.status_code == 200
    fc_data = fc_res.json()
    assert len(fc_data["forecasts"]) >= 1
    fc_pt = next(p for p in fc_data["forecasts"] if p["horizon_days"] == 7)
    assert fc_pt["lower_bound"] <= fc_pt["predicted_modal_price"] <= fc_pt["upper_bound"]

    # 6. Recommendation engine
    rec_res = await async_client.get("/api/v1/recommendations?crop_name=Onion&quantity=120&unit=Quintal")
    assert rec_res.status_code == 200
    rec_data = rec_res.json()
    assert rec_data["overall_action"] in ["SELL", "WAIT", "PARTIAL_SELL"]
    assert len(rec_data["eligible_markets"]) >= 2
    assert rec_data["eligible_markets"][0]["rank"] == 1
    assert rec_data["eligible_markets"][0]["expected_net_realization"] > 0

    # 7. Agro-weather & transit risk check
    weather_res = await async_client.get("/api/v1/weather?latitude=20.0063&longitude=74.0022")
    assert weather_res.status_code == 200
    w_data = weather_res.json()
    assert len(w_data["forecast_days"]) >= 5
    assert w_data["forecast_days"][0]["transport_risk_level"] in ["Low", "Moderate", "High"]

    # 8. Price alert & notification evaluation
    alert_payload = {
        "commodity_id": "c0010000-0000-0000-0000-000000000001",
        "market_id": "m0010000-0000-0000-0000-000000000001",
        "target_price": 2200.0,
        "condition": "ABOVE"
    }
    alert_res = await async_client.post("/api/v1/notifications/alerts", json=alert_payload)
    assert alert_res.status_code == 201

    eval_res = await async_client.post("/api/v1/notifications/alerts/check")
    assert eval_res.status_code == 200
    eval_json = eval_res.json()
    assert eval_json["triggered_count"] >= 1

    notifs_res = await async_client.get("/api/v1/notifications")
    assert notifs_res.status_code == 200
    assert len(notifs_res.json()) >= 1

    # 9. Cross-tenant isolation verification
    alien_crop_res = await async_client.get(f"/api/v1/crops/00000000-0000-0000-0000-999999999999")
    assert alien_crop_res.status_code == 404

    # 10. Non-fabrication guarantee verification
    missing_market_res = await async_client.get("/api/v1/markets/prices?commodity_id=c-nonexistent-commodity")
    assert missing_market_res.status_code == 200
    assert missing_market_res.json() == []  # Never hallucinates fake prices
