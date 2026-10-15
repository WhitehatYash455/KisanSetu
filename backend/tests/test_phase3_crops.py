from datetime import date
import pytest
from httpx import AsyncClient
from app.core.security import get_current_user
from app.main import app


@pytest.mark.asyncio
async def test_create_crop_generates_consistent_code(async_client: AsyncClient, override_auth):
    payload = {
        "crop_name": "Wheat",
        "variety": "Lokwan (लोकवन)",
        "acreage": 3.0,
        "quantity": 45.0,
        "quantity_unit": "Quintal",
        "sowing_date": "2026-11-01",
        "expected_harvest_date": "2027-03-15",
        "status": "Growing",
        "notes": "Timely winter sowing."
    }
    resp = await async_client.post("/api/v1/crops", json=payload)
    assert resp.status_code == 201
    crop = resp.json()
    assert "crop_code" in crop
    assert crop["crop_code"].startswith("CROP-")
    assert len(crop["crop_code"].split("-")) == 3
    assert crop["aliases"]["en"] == "Wheat"
    assert crop["aliases"]["hi"] == "गेहूं"
    assert crop["aliases"]["mr"] == "गहू"


@pytest.mark.asyncio
async def test_crop_status_lifecycle_transitions(async_client: AsyncClient, override_auth):
    # 1. Create crop in 'Growing' status
    payload = {
        "crop_name": "Tomato",
        "variety": "Abhinav",
        "acreage": 1.5,
        "quantity": 120.0,
        "quantity_unit": "Quintal",
        "sowing_date": "2026-07-01",
        "expected_harvest_date": "2026-10-10",
        "status": "Growing",
    }
    create_resp = await async_client.post("/api/v1/crops", json=payload)
    assert create_resp.status_code == 201
    crop_id = create_resp.json()["id"]

    # 2. Transition to 'Ready to Harvest'
    r2 = await async_client.patch(f"/api/v1/crops/{crop_id}/status?new_status=Ready%20to%20Harvest")
    assert r2.status_code == 200
    assert r2.json()["status"] == "Ready to Harvest"
    assert r2.json()["actual_harvest_date"] is not None

    # 3. Transition to 'Stored'
    r3 = await async_client.patch(f"/api/v1/crops/{crop_id}/status?new_status=Stored")
    assert r3.status_code == 200
    assert r3.json()["status"] == "Stored"

    # 4. Transition to 'Partially Sold'
    r4 = await async_client.patch(f"/api/v1/crops/{crop_id}/status?new_status=Partially%20Sold")
    assert r4.status_code == 200
    assert r4.json()["status"] == "Partially Sold"

    # 5. Transition to 'Completed'
    r5 = await async_client.patch(f"/api/v1/crops/{crop_id}/status?new_status=Completed")
    assert r5.status_code == 200
    assert r5.json()["status"] == "Completed"


@pytest.mark.asyncio
async def test_filter_crops_by_status(async_client: AsyncClient, override_auth):
    # Query with status filter
    resp = await async_client.get("/api/v1/crops?status=Growing")
    assert resp.status_code == 200
    crops = resp.json()
    for c in crops:
        assert c["status"] == "Growing"


@pytest.mark.asyncio
async def test_cross_farmer_crop_protection(async_client: AsyncClient):
    # Farmer 1 creates crop
    farmer_1 = {"id": "farmer-user-1", "email": "farmer1@agri.in", "role": "authenticated"}
    async def _f1(): return farmer_1
    app.dependency_overrides[get_current_user] = _f1

    create_resp = await async_client.post(
        "/api/v1/crops",
        json={
            "crop_name": "Gram",
            "acreage": 2.0,
            "quantity": 15.0,
            "sowing_date": "2026-10-01",
            "expected_harvest_date": "2027-01-15",
            "status": "Growing"
        }
    )
    assert create_resp.status_code == 201
    crop_id = create_resp.json()["id"]

    # Farmer 2 tries to tamper with Farmer 1's crop
    farmer_2 = {"id": "farmer-user-2", "email": "farmer2@agri.in", "role": "authenticated"}
    async def _f2(): return farmer_2
    app.dependency_overrides[get_current_user] = _f2

    tamper_resp = await async_client.put(
        f"/api/v1/crops/{crop_id}",
        json={"crop_name": "Stolen Crop"}
    )
    assert tamper_resp.status_code == 403

    del_resp = await async_client.delete(f"/api/v1/crops/{crop_id}")
    assert del_resp.status_code == 403

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_delete_crop_confirmation_message(async_client: AsyncClient, override_auth):
    # Create and delete
    c_resp = await async_client.post(
        "/api/v1/crops",
        json={
            "crop_name": "Cotton",
            "acreage": 4.0,
            "quantity": 28.0,
            "sowing_date": "2026-06-01",
            "expected_harvest_date": "2026-11-20",
            "status": "Growing"
        }
    )
    crop_id = c_resp.json()["id"]

    del_resp = await async_client.delete(f"/api/v1/crops/{crop_id}?confirmed=true")
    assert del_resp.status_code == 200
    msg = del_resp.json()["message"]
    assert "deleted successfully" in msg
