import pytest
from httpx import AsyncClient
from app.core.security import get_current_user
from app.main import app


@pytest.mark.asyncio
async def test_unauthenticated_profile_rejected(async_client: AsyncClient):
    resp = await async_client.get("/api/v1/farmer/profile")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_farmer_profile_returns_opaque_id(async_client: AsyncClient, override_auth):
    resp = await async_client.get("/api/v1/farmer/profile")
    assert resp.status_code == 200
    data = resp.json()
    assert "farmer_id" in data
    assert data["farmer_id"].startswith("AGRI-")
    assert len(data["farmer_id"].split("-")) == 3


@pytest.mark.asyncio
async def test_farmer_profile_update(async_client: AsyncClient, override_auth):
    update_payload = {
        "full_name": "Balasaheb Vikhe",
        "district": "Ahmednagar",
        "preferred_language": "mr",
        "pincode": "413736"
    }
    resp = await async_client.put("/api/v1/farmer/profile", json=update_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["full_name"] == "Balasaheb Vikhe"
    assert data["district"] == "Ahmednagar"
    assert data["preferred_language"] == "mr"
    assert data["pincode"] == "413736"


@pytest.mark.asyncio
async def test_farmer_settings_update(async_client: AsyncClient, override_auth):
    settings_payload = {
        "theme_preference": "dark",
        "notification_push": True,
        "notification_whatsapp": True,
        "preferred_distance_unit": "km"
    }
    resp = await async_client.put("/api/v1/farmer/settings", json=settings_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["theme_preference"] == "dark"
    assert data["notification_whatsapp"] is True


@pytest.mark.asyncio
async def test_farm_crud_operations(async_client: AsyncClient, override_auth):
    # 1. Create Farm
    farm_payload = {
        "farm_name": "Godavari Green Farm",
        "latitude": 19.9975,
        "longitude": 73.7898,
        "address": "Gat No 102, Nashik",
        "total_acreage": 6.5,
        "soil_type": "Alluvial Loam",
        "irrigation_type": "Sprinkler"
    }
    create_resp = await async_client.post("/api/v1/farmer/farms", json=farm_payload)
    assert create_resp.status_code == 201
    farm = create_resp.json()
    farm_id = farm["id"]
    assert farm["farm_name"] == "Godavari Green Farm"
    assert farm["total_acreage"] == 6.5

    # 2. List Farms
    list_resp = await async_client.get("/api/v1/farmer/farms")
    assert list_resp.status_code == 200
    farms = list_resp.json()
    assert any(f["id"] == farm_id for f in farms)

    # 3. Update Farm
    update_resp = await async_client.put(
        f"/api/v1/farmer/farms/{farm_id}",
        json={"total_acreage": 7.5, "irrigation_type": "Drip + Sprinkler"}
    )
    assert update_resp.status_code == 200
    updated_farm = update_resp.json()
    assert updated_farm["total_acreage"] == 7.5
    assert updated_farm["irrigation_type"] == "Drip + Sprinkler"

    # 4. Delete Farm
    del_resp = await async_client.delete(f"/api/v1/farmer/farms/{farm_id}")
    assert del_resp.status_code == 200


@pytest.mark.asyncio
async def test_cross_farmer_access_protection(async_client: AsyncClient):
    # User A creates a farm
    user_a = {"id": "user-a-uuid", "email": "farmer.a@agri.in", "role": "authenticated"}
    async def _mock_user_a(): return user_a
    app.dependency_overrides[get_current_user] = _mock_user_a

    create_resp = await async_client.post(
        "/api/v1/farmer/farms",
        json={"farm_name": "Farmer A Farm", "total_acreage": 5.0}
    )
    assert create_resp.status_code == 201
    farm_id = create_resp.json()["id"]

    # User B attempts to update or delete User A's farm
    user_b = {"id": "user-b-uuid", "email": "farmer.b@agri.in", "role": "authenticated"}
    async def _mock_user_b(): return user_b
    app.dependency_overrides[get_current_user] = _mock_user_b

    malicious_update = await async_client.put(
        f"/api/v1/farmer/farms/{farm_id}",
        json={"farm_name": "Hacked Farm"}
    )
    assert malicious_update.status_code == 403

    malicious_delete = await async_client.delete(f"/api/v1/farmer/farms/{farm_id}")
    assert malicious_delete.status_code == 403

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_dashboard_summary_endpoint(async_client: AsyncClient, override_auth):
    resp = await async_client.get("/api/v1/farmer/dashboard")
    assert resp.status_code == 200
    data = resp.json()
    assert "farmer_profile" in data
    assert "crops_by_status" in data
    assert "total_acreage" in data
    assert "recommended_action_summary" in data
    assert data["farmer_profile"]["farmer_id"].startswith("AGRI-")
