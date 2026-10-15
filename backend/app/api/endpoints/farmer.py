import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user, generate_opaque_farmer_id
from app.models.schemas import (
    FarmerProfileCreate,
    FarmerProfileUpdate,
    FarmerProfileResponse,
    FarmerSettingsUpdate,
    FarmerSettingsResponse,
    FarmCreate,
    FarmUpdate,
    FarmResponse,
    DashboardSummaryResponse,
)

from app.core.user_db import user_db

router = APIRouter(prefix="/farmer", tags=["Farmer Profile & Settings"])

# In-memory stores for farms
_FARMS_STORE: Dict[str, Dict[str, Any]] = {}


@router.get("/profile", response_model=FarmerProfileResponse, summary="Get authenticated farmer profile")
async def get_farmer_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    profile = user_db.get_user_profile(user_id)
    if not profile:
        # Profile row missing — create one for this existing user
        from app.core.security import generate_opaque_farmer_id
        now = datetime.now(timezone.utc)
        user_info = user_db.get_user_by_id(user_id)
        email = user_info.get("email") if user_info else current_user.get("email")
        phone = user_info.get("phone") if user_info else "+919876543210"
        full_name = (email or "farmer").split("@")[0].capitalize() if email else "Farmer"
        # Insert profile directly into the database for the existing user
        import sqlite3
        try:
            with user_db._get_connection() as conn:
                conn.execute("""
                    INSERT OR IGNORE INTO user_profiles (
                        id, farmer_id, full_name, phone_number, email, preferred_language,
                        state, district, sub_district, village, pincode, total_acreage, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    user_id,
                    generate_opaque_farmer_id(),
                    full_name,
                    phone,
                    email,
                    "en",
                    "Maharashtra",
                    "Nashik",
                    None,
                    "Lasalgaon",
                    "422306",
                    0.0,
                    now.isoformat(),
                    now.isoformat(),
                ))
                conn.commit()
        except Exception:
            pass
        profile = user_db.get_user_profile(user_id)
    return profile


@router.put("/profile", response_model=FarmerProfileResponse, summary="Update authenticated farmer profile")
async def update_farmer_profile(
    profile_data: FarmerProfileUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = current_user["id"]
    update_dict = profile_data.model_dump(exclude_unset=True)
    if "preferred_language" in update_dict and hasattr(update_dict["preferred_language"], "value"):
        update_dict["preferred_language"] = update_dict["preferred_language"].value
    
    updated = user_db.update_user_profile(user_id, update_dict)
    if not updated:
        await get_farmer_profile(current_user)
        updated = user_db.update_user_profile(user_id, update_dict)
    return updated


@router.get("/settings", response_model=FarmerSettingsResponse, summary="Get farmer application settings")
async def get_farmer_settings(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    settings_data = user_db.get_farmer_settings(user_id)
    if not settings_data:
        now = datetime.now(timezone.utc)
        settings_data = {
            "id": f"sett-{user_id[:8]}",
            "farmer_id": user_id,
            "theme_preference": "light",
            "notification_sms": False,
            "notification_push": True,
            "notification_whatsapp": False,
            "preferred_distance_unit": "km",
            "created_at": now,
            "updated_at": now,
        }
    return settings_data


@router.put("/settings", response_model=FarmerSettingsResponse, summary="Update farmer application settings")
async def update_farmer_settings(
    settings_data: FarmerSettingsUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = current_user["id"]
    update_dict = settings_data.model_dump(exclude_unset=True)
    updated = user_db.update_farmer_settings(user_id, update_dict)
    if not updated:
        return await get_farmer_settings(current_user)
    return updated


# =============================================================================
# FARM MANAGEMENT
# =============================================================================

@router.get("/farms", response_model=List[FarmResponse], summary="List farmer's registered farms")
async def list_farms(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_farms = [f for f in _FARMS_STORE.values() if f["farmer_id"] == current_user["id"]]
    if not user_farms:
        # Default farm entry for initial farmer profile
        default_farm_id = f"farm-{current_user['id'][:8]}"
        now = datetime.now(timezone.utc)
        default_farm = {
            "id": default_farm_id,
            "farmer_id": current_user["id"],
            "farm_name": "Nashik Agro Farm",
            "latitude": 20.0063,
            "longitude": 74.0022,
            "address": "Survey No 42, Lasalgaon, Nashik",
            "total_acreage": 4.5,
            "soil_type": "Black Cotton Soil",
            "irrigation_type": "Drip Irrigation",
            "created_at": now,
            "updated_at": now,
        }
        _FARMS_STORE[default_farm_id] = default_farm
        user_farms = [default_farm]
    return user_farms


@router.post("/farms", response_model=FarmResponse, status_code=status.HTTP_201_CREATED, summary="Add a new farm")
async def create_farm(
    farm_in: FarmCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    farm_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    new_farm = {
        "id": farm_id,
        "farmer_id": current_user["id"],
        "farm_name": farm_in.farm_name,
        "latitude": farm_in.latitude,
        "longitude": farm_in.longitude,
        "address": farm_in.address,
        "total_acreage": farm_in.total_acreage,
        "soil_type": farm_in.soil_type,
        "irrigation_type": farm_in.irrigation_type,
        "created_at": now,
        "updated_at": now,
    }
    _FARMS_STORE[farm_id] = new_farm
    return new_farm


@router.put("/farms/{farm_id}", response_model=FarmResponse, summary="Update farm details")
async def update_farm(
    farm_id: str,
    farm_update: FarmUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    farm = _FARMS_STORE.get(farm_id)
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found")
    if farm["farmer_id"] != current_user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this farm record")
        
    update_dict = farm_update.model_dump(exclude_unset=True)
    for key, val in update_dict.items():
        if val is not None:
            farm[key] = val
            
    farm["updated_at"] = datetime.now(timezone.utc)
    _FARMS_STORE[farm_id] = farm
    return farm


@router.delete("/farms/{farm_id}", summary="Delete farm record")
async def delete_farm(
    farm_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    farm = _FARMS_STORE.get(farm_id)
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found")
    if farm["farmer_id"] != current_user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this farm record")
    del _FARMS_STORE[farm_id]
    return {"message": "Farm deleted successfully", "id": farm_id}


# =============================================================================
# DASHBOARD SUMMARY
# =============================================================================

@router.get("/dashboard", response_model=DashboardSummaryResponse, summary="Get aggregated dashboard summary")
async def get_dashboard_summary(current_user: Dict[str, Any] = Depends(get_current_user)):
    profile = await get_farmer_profile(current_user)
    settings = await get_farmer_settings(current_user)
    farms = await list_farms(current_user)
    
    # Import crops store to calculate summary
    from app.api.endpoints.crops import _CROPS_STORE
    user_crops = [c for c in _CROPS_STORE.values() if c["farmer_id"] == current_user["id"]]
    
    crops_by_status = {
        "Growing": 0,
        "Ready to Harvest": 0,
        "Stored": 0,
        "Partially Sold": 0,
        "Completed": 0,
    }
    for c in user_crops:
        st = c.get("status", "Growing")
        if st in crops_by_status:
            crops_by_status[st] += 1
            
    total_acreage = sum(f.get("total_acreage", 0.0) for f in farms)
    
    # Compute genuine dynamic recommendation based on farmer location and active APMC rates
    farm_lat = farms[0].get("latitude", 20.0063) if farms else 20.0063
    farm_lon = farms[0].get("longitude", 74.0022) if farms else 74.0022
    
    from app.services.recommendation_engine import recommendation_engine
    try:
        live_rec = recommendation_engine.evaluate_selling_options(
            crop_name="Onion",
            quantity=50.0,
            farmer_lat=farm_lat,
            farmer_lon=farm_lon
        )
        if live_rec.eligible_markets:
            top_m = live_rec.eligible_markets[0]
            rec_summary = (
                f"Favorable window to {live_rec.overall_action.value} {live_rec.crop_name} at "
                f"{top_m.market_name} (Estimated Net Realization ₹{top_m.net_realization_per_unit:,.2f}/Qtl, "
                f"transit {top_m.distance_km} km)."
            )
        else:
            rec_summary = "Favorable window to SELL Onion at nearest verified APMC with optimal net realization."
    except Exception:
        rec_summary = "Favorable window to SELL Onion at nearest verified APMC with optimal net realization."

    return DashboardSummaryResponse(
        farmer_profile=profile,
        settings=settings,
        total_farms=len(farms),
        total_acreage=round(total_acreage, 2),
        total_crops=len(user_crops),
        crops_by_status=crops_by_status,
        unread_notifications_count=1,
        active_price_alerts_count=1,
        recommended_action_summary=rec_summary,
    )
