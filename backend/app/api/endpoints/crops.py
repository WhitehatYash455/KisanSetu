import uuid
import secrets
from datetime import datetime, date, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.security import get_current_user
from app.models.schemas import (
    CropCreate,
    CropUpdate,
    CropResponse,
    CropStatusEnum,
    QuantityUnitEnum,
)

router = APIRouter(prefix="/crops", tags=["Crop Management"])


def generate_opaque_crop_id() -> str:
    """Generates a consistent, readable, non-sequential opaque Crop ID, e.g. CROP-8K2M-4P9L"""
    alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    part1 = "".join(secrets.choice(alphabet) for _ in range(4))
    part2 = "".join(secrets.choice(alphabet) for _ in range(4))
    return f"CROP-{part1}-{part2}"


# Default commodity aliases lookup
COMMODITY_ALIASES_MAP = {
    "onion": {"en": "Onion", "hi": "प्याज", "mr": "कांदा"},
    "soybean": {"en": "Soybean", "hi": "सोयाबीन", "mr": "सोयाबीन"},
    "cotton": {"en": "Cotton", "hi": "कपास", "mr": "कापूस"},
    "wheat": {"en": "Wheat", "hi": "गेहूं", "mr": "गहू"},
    "rice": {"en": "Paddy (Dhan)", "hi": "धान (चावल)", "mr": "भात (धान)"},
    "gram": {"en": "Bengal Gram (Chana)", "hi": "चना", "mr": "हरभरा (चना)"},
    "tomato": {"en": "Tomato", "hi": "टमाटर", "mr": "टोमॅटो"},
    "potato": {"en": "Potato", "hi": "आलू", "mr": "बटाटा"},
}


def resolve_aliases(crop_name: str, provided_aliases: Optional[Dict[str, str]] = None) -> Dict[str, str]:
    if provided_aliases and len(provided_aliases) > 0:
        return provided_aliases
    
    clean_name = crop_name.lower().strip()
    for key, val in COMMODITY_ALIASES_MAP.items():
        if key in clean_name:
            return val
            
    return {"en": crop_name, "hi": crop_name, "mr": crop_name}


# Pre-seeded sample crops store for isolated test/dev execution
_CROPS_STORE: Dict[str, Dict[str, Any]] = {
    "crop-demo-001": {
        "id": "crop-demo-001",
        "crop_code": "CROP-7R9K-2M4P",
        "farmer_id": "00000000-0000-0000-0000-000000000001",
        "farm_id": "farm-00000000",
        "farm_location": "Lasalgaon, Nashik, Maharashtra",
        "commodity_id": "c0010000-0000-0000-0000-000000000001",
        "crop_name": "Onion",
        "variety": "Nashik Red (गरवा कांदा)",
        "acreage": 2.5,
        "quantity": 85.0,
        "quantity_unit": QuantityUnitEnum.QUINTAL,
        "sowing_date": date(2026, 6, 15),
        "expected_harvest_date": date(2026, 10, 20),
        "actual_harvest_date": None,
        "status": CropStatusEnum.GROWING,
        "notes": "Drip irrigated; good bulb formation.",
        "aliases": {"en": "Onion", "hi": "प्याज", "mr": "कांदा"},
        "created_at": datetime(2026, 6, 15, 10, 0, tzinfo=timezone.utc),
        "updated_at": datetime(2026, 6, 15, 10, 0, tzinfo=timezone.utc),
    },
    "crop-demo-002": {
        "id": "crop-demo-002",
        "crop_code": "CROP-3X5L-9W1Q",
        "farmer_id": "00000000-0000-0000-0000-000000000001",
        "farm_id": "farm-00000000",
        "farm_location": "Lasalgaon, Nashik, Maharashtra",
        "commodity_id": "c0010000-0000-0000-0000-000000000002",
        "crop_name": "Soybean",
        "variety": "JS 335 (पिवळा सोयाबीन)",
        "acreage": 2.0,
        "quantity": 30.0,
        "quantity_unit": QuantityUnitEnum.QUINTAL,
        "sowing_date": date(2026, 6, 20),
        "expected_harvest_date": date(2026, 10, 5),
        "actual_harvest_date": date(2026, 10, 5),
        "status": CropStatusEnum.READY_TO_HARVEST,
        "notes": "Matured pods ready for thrashing and mandi evaluation.",
        "aliases": {"en": "Soybean", "hi": "सोयाबीन", "mr": "सोयाबीन"},
        "created_at": datetime(2026, 6, 20, 11, 0, tzinfo=timezone.utc),
        "updated_at": datetime(2026, 10, 5, 9, 30, tzinfo=timezone.utc),
    }
}


@router.post("", response_model=CropResponse, status_code=status.HTTP_201_CREATED, summary="Add a new crop record")
async def create_crop(
    crop_in: CropCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    crop_id = str(uuid.uuid4())
    crop_code = generate_opaque_crop_id()
    now = datetime.now(timezone.utc)
    aliases = resolve_aliases(crop_in.crop_name, crop_in.aliases)
    
    new_crop = {
        "id": crop_id,
        "crop_code": crop_code,
        "farmer_id": current_user["id"],
        "farm_id": crop_in.farm_id,
        "farm_location": crop_in.farm_location or "Lasalgaon, Nashik, Maharashtra",
        "commodity_id": crop_in.commodity_id,
        "crop_name": crop_in.crop_name,
        "variety": crop_in.variety,
        "acreage": crop_in.acreage,
        "quantity": crop_in.quantity,
        "quantity_unit": crop_in.quantity_unit,
        "sowing_date": crop_in.sowing_date,
        "expected_harvest_date": crop_in.expected_harvest_date,
        "actual_harvest_date": crop_in.actual_harvest_date,
        "status": crop_in.status,
        "notes": crop_in.notes,
        "aliases": aliases,
        "created_at": now,
        "updated_at": now,
    }
    
    _CROPS_STORE[crop_id] = new_crop
    return new_crop


@router.get("", response_model=List[CropResponse], summary="List farmer's crops with optional status filter")
async def list_crops(
    status_filter: Optional[CropStatusEnum] = Query(None, alias="status", description="Filter by crop status"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_crops = [
        crop for crop in _CROPS_STORE.values()
        if crop["farmer_id"] == current_user["id"]
    ]
    if status_filter:
        user_crops = [c for c in user_crops if c["status"] == status_filter]
    
    # Sort by created_at descending
    user_crops.sort(key=lambda x: x["created_at"], reverse=True)
    return user_crops


@router.get("/{crop_id}", response_model=CropResponse, summary="Get details of a specific crop")
async def get_crop(
    crop_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    crop = _CROPS_STORE.get(crop_id)
    if not crop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crop record not found")
    if crop["farmer_id"] != current_user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this crop record")
    return crop


@router.put("/{crop_id}", response_model=CropResponse, summary="Update crop details")
async def update_crop(
    crop_id: str,
    crop_update: CropUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    crop = await get_crop(crop_id, current_user)
    
    update_data = crop_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            crop[key] = value

    if "crop_name" in update_data and update_data["crop_name"]:
        crop["aliases"] = resolve_aliases(update_data["crop_name"], crop.get("aliases"))
            
    crop["updated_at"] = datetime.now(timezone.utc)
    _CROPS_STORE[crop_id] = crop
    return crop


@router.patch("/{crop_id}/status", response_model=CropResponse, summary="Update crop lifecycle status")
async def update_crop_status(
    crop_id: str,
    new_status: CropStatusEnum = Query(..., description="Target lifecycle status"),
    actual_harvest_date: Optional[str] = Query(None, description="Optional actual harvest date YYYY-MM-DD"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    crop = await get_crop(crop_id, current_user)
    crop["status"] = new_status
    if actual_harvest_date:
        crop["actual_harvest_date"] = date.fromisoformat(actual_harvest_date)
    elif new_status in [CropStatusEnum.READY_TO_HARVEST, CropStatusEnum.STORED, CropStatusEnum.PARTIALLY_SOLD, CropStatusEnum.COMPLETED]:
        if not crop.get("actual_harvest_date"):
            crop["actual_harvest_date"] = date.today()

    crop["updated_at"] = datetime.now(timezone.utc)
    _CROPS_STORE[crop_id] = crop
    return crop


@router.delete("/{crop_id}", status_code=status.HTTP_200_OK, summary="Delete a crop record")
async def delete_crop(
    crop_id: str,
    confirmed: bool = Query(True, description="Confirmation before deletion"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    if not confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation required to delete crop record."
        )
    crop = await get_crop(crop_id, current_user)
    del _CROPS_STORE[crop_id]
    return {
        "message": f"Crop '{crop['crop_name']}' ({crop['crop_code']}) deleted successfully",
        "deleted_id": crop_id,
        "deleted_code": crop["crop_code"]
    }
