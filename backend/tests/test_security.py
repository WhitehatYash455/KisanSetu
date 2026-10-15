import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_unauthorized_crop_access(async_client: AsyncClient):
    # Unauthenticated request to /api/v1/crops should be rejected with 401
    response = await async_client.get("/api/v1/crops")
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data


@pytest.mark.asyncio
async def test_authorized_crop_crud(async_client: AsyncClient, override_auth):
    # With auth override, creating a crop should succeed
    payload = {
        "crop_name": "Soybean",
        "variety": "JS 335",
        "acreage": 4.0,
        "quantity": 32.0,
        "quantity_unit": "Quintal",
        "sowing_date": "2026-06-15",
        "expected_harvest_date": "2026-10-25",
        "status": "Growing",
        "notes": "Healthy crop with organic manure application"
    }
    create_resp = await async_client.post("/api/v1/crops", json=payload)
    assert create_resp.status_code == 201
    crop_data = create_resp.json()
    crop_id = crop_data["id"]
    assert crop_data["crop_name"] == "Soybean"
    assert crop_data["status"] == "Growing"

    # List crops
    list_resp = await async_client.get("/api/v1/crops")
    assert list_resp.status_code == 200
    crops = list_resp.json()
    assert len(crops) >= 1

    # Update crop status
    patch_resp = await async_client.patch(f"/api/v1/crops/{crop_id}/status?new_status=Ready%20to%20Harvest")
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "Ready to Harvest"

    # Delete crop
    del_resp = await async_client.delete(f"/api/v1/crops/{crop_id}")
    assert del_resp.status_code == 200


@pytest.mark.asyncio
async def test_demo_token_authentication_succeeds(async_client: AsyncClient):
    # Verifies that demo tokens like demo-jwt-token-farmer-nashik authenticate seamlessly
    headers = {"Authorization": "Bearer demo-jwt-token-farmer-nashik"}
    resp = await async_client.get("/api/v1/farmer/profile", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["farmer_id"].startswith("AGRI-")

    crops_resp = await async_client.get("/api/v1/crops", headers=headers)
    assert crops_resp.status_code == 200
    assert isinstance(crops_resp.json(), list)
