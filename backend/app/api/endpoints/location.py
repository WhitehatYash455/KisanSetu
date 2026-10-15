import logging
from fastapi import APIRouter, HTTPException, status
from app.models.schemas import ReverseGeocodeRequest, ReverseGeocodeResponse
from app.services.maps_service import maps_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/location", tags=["Farmer Location & Reverse Geocoding"])


@router.post(
    "/reverse-geocode",
    response_model=ReverseGeocodeResponse,
    summary="Reverse geocode farmer GPS coordinates into address, village, taluka, district"
)
async def reverse_geocode_location(payload: ReverseGeocodeRequest):
    """
    Reverse geocodes live browser GPS coordinates (latitude, longitude) into human-readable
    village, taluka/subdistrict, district, state, and address using OpenStreetMap Nominatim.
    Does not persist or transmit private farmer coordinates.
    """
    try:
        result = await maps_service.reverse_geocode(lat=payload.latitude, lon=payload.longitude)
        return ReverseGeocodeResponse(**result)
    except Exception as e:
        logger.error(f"Reverse geocoding error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reverse-geocode coordinates."
        )
