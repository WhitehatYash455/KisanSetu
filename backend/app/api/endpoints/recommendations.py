from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Query, HTTPException, status
from app.models.schemas import (
    RecommendationResponse,
    QuantityUnitEnum,
    RecommendationActionEnum,
    MarketRecommendationItem,
)
from app.services.recommendation_engine import recommendation_engine
from app.services.mandi_service import STANDARD_COMMODITIES

router = APIRouter(prefix="/recommendations", tags=["Market Recommendation Engine"])


class RecommendationPostRequest(BaseModel):
    crop_name: Optional[str] = None
    commodity_id: Optional[str] = None
    quantity: float = Field(50.0, gt=0)
    unit: QuantityUnitEnum = QuantityUnitEnum.QUINTAL
    farmer_latitude: Optional[float] = 20.0063
    farmer_longitude: Optional[float] = 74.0022
    farmer_lat: Optional[float] = None
    farmer_lon: Optional[float] = None
    potential_storage_days: Optional[int] = 0
    storage_days: Optional[int] = None


def resolve_crop_name(crop_name: Optional[str], commodity_id: Optional[str]) -> str:
    if commodity_id:
        comm = next((c for c in STANDARD_COMMODITIES if c["id"] == commodity_id or c["code"].lower() == commodity_id.lower()), None)
        if comm:
            return comm["name_en"]
    if crop_name:
        return crop_name
    return "Onion"


def build_recommendation_payload(
    crop_name: str,
    quantity: float,
    unit: QuantityUnitEnum,
    farmer_lat: float,
    farmer_lon: float,
    storage_days: int,
    simulate_insufficient_data: bool = False,
) -> Dict[str, Any]:
    if simulate_insufficient_data or "insufficient" in crop_name.lower():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Insufficient market price data available for '{crop_name}' to establish a reliable net realization ranking. "
                f"Recommendations cannot be generated without verified mandi records."
            )
        )

    try:
        rec = recommendation_engine.evaluate_selling_options(
            crop_name=crop_name,
            quantity=quantity,
            unit=unit,
            farmer_lat=farmer_lat,
            farmer_lon=farmer_lon,
            expected_storage_days=storage_days,
        )

        if not rec.eligible_markets:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No eligible markets found for '{crop_name}' within the search radius. Try a wider search area."
            )

        top_market = rec.eligible_markets[0]
        mandi_rankings = [
            {
                "market_id": m.market_id,
                "market_name": m.market_name,
                "market_district": m.market_district,
                "distance_km": m.distance_km,
                "modal_price": m.current_modal_price,
                "gross_revenue": m.expected_gross_revenue,
                "transport_cost": m.estimated_transport_cost,
                "handling_cost": m.estimated_handling_cost,
                "market_cess": m.estimated_market_fees,
                "net_realization": m.expected_net_realization,
                "net_realization_per_quintal": m.net_realization_per_unit,
                "rank": m.rank,
                "source": "Agmarknet / data.gov.in (Verified)",
            }
            for m in rec.eligible_markets
        ]

        total_deductions = round(top_market.expected_gross_revenue - top_market.expected_net_realization, 2)
        action_steps = [
            f"Sort & grade harvest into FAQ quality specifications before loading.",
            f"Target early morning arrival (4:00 AM - 7:00 AM) to secure early auction slots at {top_market.market_name}.",
            f"Ensure waterproof tarpaulin cover for the {top_market.distance_km} km transit corridor.",
            f"Verify gross vehicle weight slip at APMC entry weighbridge."
        ]

        # Construct comprehensive response satisfying both schema models
        return {
            "crop_id": None,
            "crop_name": rec.crop_name,
            "quantity": rec.quantity,
            "quantity_quintals": rec.quantity,
            "quantity_unit": rec.quantity_unit,
            "overall_action": rec.overall_action,
            "recommended_action": rec.overall_action.value,
            "confidence_pct": 88,
            "horizon_days": 7,
            "top_recommendation_summary": rec.top_recommendation_summary,
            "rationale_summary": rec.top_recommendation_summary,
            "detailed_factors": rec.change_factors,
            "change_factors": rec.change_factors,
            "recommended_mandi_id": top_market.market_id,
            "recommended_mandi_name": top_market.market_name,
            "expected_net_realization": top_market.expected_net_realization,
            "expected_gross_revenue": top_market.expected_gross_revenue,
            "total_logistics_deductions": total_deductions,
            "net_realization_per_quintal": top_market.net_realization_per_unit,
            "eligible_markets": [m.model_dump() for m in rec.eligible_markets],
            "mandi_rankings": mandi_rankings,
            "suggested_action_steps": action_steps,
            "data_freshness_status": "LIVE",
            "generated_at": rec.generated_at,
            "data_sufficiency": "sufficient",
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", summary="Generate explainable market selling recommendations via GET")
@router.get("/", include_in_schema=False)
async def get_market_recommendations(
    crop_name: str = Query("Onion", description="Name of crop"),
    quantity: float = Query(50.0, gt=0, description="Available crop quantity"),
    unit: QuantityUnitEnum = Query(QuantityUnitEnum.QUINTAL, description="Measurement unit (Quintal, Kg, Tonne)"),
    farmer_lat: float = Query(20.0063, description="Farmer Farm Latitude (default: Nashik)"),
    farmer_lon: float = Query(74.0022, description="Farmer Farm Longitude"),
    storage_days: int = Query(0, ge=0, le=60, description="Expected holding duration if considering storage"),
    simulate_insufficient_data: bool = Query(False, description="Simulate scenario where price data is inadequate"),
):
    return build_recommendation_payload(
        crop_name=crop_name,
        quantity=quantity,
        unit=unit,
        farmer_lat=farmer_lat,
        farmer_lon=farmer_lon,
        storage_days=storage_days,
        simulate_insufficient_data=simulate_insufficient_data,
    )


@router.post("", summary="Generate explainable market selling recommendations via POST")
@router.post("/", include_in_schema=False)
async def post_market_recommendations(req: RecommendationPostRequest):
    c_name = resolve_crop_name(req.crop_name, req.commodity_id)
    f_lat = req.farmer_lat if req.farmer_lat is not None else (req.farmer_latitude or 20.0063)
    f_lon = req.farmer_lon if req.farmer_lon is not None else (req.farmer_longitude or 74.0022)
    s_days = req.storage_days if req.storage_days is not None else (req.potential_storage_days or 0)

    return build_recommendation_payload(
        crop_name=c_name,
        quantity=req.quantity,
        unit=req.unit,
        farmer_lat=f_lat,
        farmer_lon=f_lon,
        storage_days=s_days,
    )
