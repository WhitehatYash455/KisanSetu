from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from app.models.schemas import (
    ProfitCalculatorRequest,
    ProfitCalculatorResponse,
    QuantityUnitEnum,
)
from app.services.recommendation_engine import convert_to_quintals
from app.services.mandi_service import VERIFIED_HISTORICAL_DATA, STANDARD_MARKETS, calculate_haversine_distance

router = APIRouter(prefix="/calculator", tags=["Profit and Selling Cost Calculator"])


@router.post("", response_model=ProfitCalculatorResponse, summary="Calculate gross revenue, selling expenses, and net realization")
async def calculate_selling_profit(payload: ProfitCalculatorRequest):
    """
    Focused profit and selling-cost calculator helping farmers compare selling options.
    Validates all inputs, measurement units, and itemized selling deductions.
    Never includes non-selling elements (e.g. crop input calculators, fertilizer BOM).
    """
    gross_revenue = round(payload.quantity * payload.selling_price_per_unit, 2)
    
    total_selling_expenses = round(
        payload.transport_cost
        + payload.loading_unloading_cost
        + payload.market_fees
        + payload.storage_cost
        + payload.other_expenses,
        2
    )
    
    net_realization = round(gross_revenue - total_selling_expenses, 2)
    net_realization_per_unit = round(net_realization / payload.quantity, 2)
    profit_margin_pct = round((net_realization / gross_revenue) * 100, 2) if gross_revenue > 0 else 0.0

    # Optional comparative net realization across nearby eligible APMC mandis
    market_comparisons = None
    if payload.include_market_comparisons:
        market_comparisons = []
        c_low = payload.crop_name.lower()
        matched = [
            o for o in VERIFIED_HISTORICAL_DATA
            if c_low in o["commodity_name"].lower() or "onion" in o["commodity_name"].lower()
        ]
        q_qtl = convert_to_quintals(payload.quantity, payload.quantity_unit)
        f_lat = payload.farmer_latitude if payload.farmer_latitude is not None else 18.4975
        f_lon = payload.farmer_longitude if payload.farmer_longitude is not None else 73.8647

        for obs in matched:
            m_id = obs["market_id"]
            meta = next((
                m for m in STANDARD_MARKETS 
                if m["id"] == m_id 
                or m["code"].lower() in m_id.lower()
                or m_id.lower().startswith(m["code"].lower())
                or m["name"].lower().startswith(m_id.split("-")[0].lower())
                or m["district"].lower() in m_id.lower()
            ), None)
            dist_km = 30.0
            if meta and meta.get("latitude") and meta.get("longitude"):
                dist_km = calculate_haversine_distance(f_lat, f_lon, meta["latitude"], meta["longitude"])

            mkt_gross = round(q_qtl * obs["modal_price"], 2)
            mkt_trans = round(dist_km * 0.75 * q_qtl, 2)
            mkt_fee = round(mkt_gross * 0.015, 2)
            mkt_handling = round(15.0 * q_qtl, 2)
            mkt_net = round(mkt_gross - (mkt_trans + mkt_fee + mkt_handling), 2)
            
            market_comparisons.append({
                "market_name": obs["market_name"],
                "market_district": obs["market_district"],
                "distance_km": dist_km,
                "verified_modal_price": obs["modal_price"],
                "estimated_transport_cost": mkt_trans,
                "expected_gross_revenue": mkt_gross,
                "expected_net_realization": mkt_net,
                "net_per_unit": round(mkt_net / q_qtl, 2)
            })

        market_comparisons.sort(key=lambda x: x["expected_net_realization"], reverse=True)

    return ProfitCalculatorResponse(
        crop_name=payload.crop_name,
        quantity_sold=payload.quantity,
        quantity_unit=payload.quantity_unit,
        gross_revenue=gross_revenue,
        total_selling_expenses=total_selling_expenses,
        net_realization=net_realization,
        net_realization_per_unit=net_realization_per_unit,
        expense_breakdown={
            "transport_cost": payload.transport_cost,
            "loading_unloading_cost": payload.loading_unloading_cost,
            "market_fees": payload.market_fees,
            "storage_cost": payload.storage_cost,
            "other_expenses": payload.other_expenses,
        },
        profit_margin_percentage=profit_margin_pct,
        market_comparisons=market_comparisons,
    )


class ProfitCalculatorInteractiveRequest(BaseModel):
    commodity_id: str
    quantity: float = Field(50.0, gt=0)
    unit: str = "QUINTAL"
    distance_km: float = Field(35.0, ge=0)
    transport_rate_per_km_quintal: float = Field(0.75, ge=0)
    handling_cost_per_quintal: float = Field(15.0, ge=0)
    market_fee_pct: float = Field(0.015, ge=0)
    storage_days: int = Field(0, ge=0)
    daily_storage_cost_per_quintal: float = Field(1.20, ge=0)
    daily_spoilage_rate_pct: float = Field(0.0015, ge=0)
    farmer_lat: Optional[float] = None
    farmer_lng: Optional[float] = None


@router.post("/profit", summary="Interactive multi-factor net realization calculation")
async def calculate_interactive_profit(payload: ProfitCalculatorInteractiveRequest):
    unit_enum = QuantityUnitEnum(payload.unit) if payload.unit in QuantityUnitEnum.__members__ else QuantityUnitEnum.QUINTAL
    q_qtl = convert_to_quintals(payload.quantity, unit_enum)
    if q_qtl <= 0:
        q_qtl = 1.0

    f_lat = payload.farmer_lat if payload.farmer_lat is not None else 18.4975
    f_lon = payload.farmer_lng if payload.farmer_lng is not None else 73.8647

    from app.services.daily_sync_service import daily_sync_service
    active_records = daily_sync_service.get_active_records()
    c_id = payload.commodity_id.lower()
    matched = [
        o for o in active_records
        if c_id in o.get("commodity_id", "").lower() or c_id in o.get("commodity_name", "").lower()
    ]
    if not matched:
        matched = [o for o in active_records if "onion" in o.get("commodity_name", "").lower()]
    if not matched:
        matched = [o for o in VERIFIED_HISTORICAL_DATA if "onion" in o.get("commodity_name", "").lower()]

    def resolve_market_meta(m_id: str, m_name: str = ""):
        return next((
            m for m in STANDARD_MARKETS 
            if m["id"] == m_id 
            or m["code"].lower() in m_id.lower()
            or m_id.lower().startswith(m["code"].lower())
            or m["name"].lower().startswith(m_id.split("-")[0].lower())
            or m["district"].lower() in m_id.lower()
            or (m_name and m["name"].lower() == m_name.lower())
        ), None)

    def calc_dist(obs):
        meta = resolve_market_meta(obs.get("market_id", ""), obs.get("market_name", ""))
        if meta and meta.get("latitude") and meta.get("longitude"):
            return calculate_haversine_distance(f_lat, f_lon, meta["latitude"], meta["longitude"])
        return 35.0

    # Pick the closest mandi to the farmer as primary baseline
    matched_by_proximity = sorted(matched, key=calc_dist)
    primary_obs = matched_by_proximity[0] if matched_by_proximity else (matched[0] if matched else None)

    base_modal = primary_obs["modal_price"] if primary_obs else 3594.90
    primary_market_name = primary_obs["market_name"] if primary_obs else "Pune APMC (Gultekdi Market Yard)"
    computed_primary_dist = calc_dist(primary_obs) if primary_obs else 7.1

    # If payload distance_km is custom (not default 35.0), honor user input; else use calculated distance
    active_distance_km = payload.distance_km if payload.distance_km != 35.0 else computed_primary_dist

    gross_revenue = round(q_qtl * base_modal, 2)
    transport_cost = round(active_distance_km * payload.transport_rate_per_km_quintal * q_qtl, 2)
    handling_cost = round(payload.handling_cost_per_quintal * q_qtl, 2)
    market_cess = round(gross_revenue * payload.market_fee_pct, 2)
    storage_cost = round(payload.storage_days * payload.daily_storage_cost_per_quintal * q_qtl, 2)
    spoilage_loss = round(gross_revenue * (payload.storage_days * payload.daily_spoilage_rate_pct), 2)
    
    total_expenses = round(transport_cost + handling_cost + market_cess + storage_cost + spoilage_loss, 2)
    net_realization = round(gross_revenue - total_expenses, 2)
    net_per_qtl = round(net_realization / q_qtl, 2)
    profit_margin_pct = round((net_realization / gross_revenue) * 100, 2) if gross_revenue > 0 else 0.0

    # Comparative mandis with accurate distances from farmer GPS
    comparisons = []
    for obs in matched:
        m_id = obs["market_id"]
        dist_km = calc_dist(obs)
        m_gross = round(q_qtl * obs["modal_price"], 2)
        m_trans = round(dist_km * payload.transport_rate_per_km_quintal * q_qtl, 2)
        m_cess = round(m_gross * payload.market_fee_pct, 2)
        m_net = round(m_gross - (m_trans + handling_cost + m_cess + storage_cost + spoilage_loss), 2)
        comparisons.append({
            "market_id": m_id,
            "market_name": obs["market_name"],
            "distance_km": dist_km,
            "modal_price": obs["modal_price"],
            "gross_revenue": m_gross,
            "transport_cost": m_trans,
            "net_realization": m_net,
            "net_realization_per_quintal": round(m_net / q_qtl, 2),
            "is_current_selection": obs["market_name"] == primary_market_name
        })

    comparisons.sort(key=lambda x: x["net_realization"], reverse=True)

    return {
        "quantity_entered": payload.quantity,
        "quantity_unit": payload.unit,
        "quantity_quintals": round(q_qtl, 2),
        "market_name": primary_market_name,
        "distance_km": active_distance_km,
        "mandi_price_per_quintal": base_modal,
        "gross_revenue": gross_revenue,
        "transport_cost": transport_cost,
        "handling_cost": handling_cost,
        "market_cess": market_cess,
        "storage_cost": storage_cost,
        "spoilage_loss": spoilage_loss,
        "total_expenses": total_expenses,
        "net_realization": net_realization,
        "net_realization_per_quintal": net_per_qtl,
        "profit_margin_pct": profit_margin_pct,
        "mandi_comparisons": comparisons,
    }

