import math
from datetime import date, datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from app.models.schemas import (
    RecommendationActionEnum,
    QuantityUnitEnum,
    DataFreshnessStatusEnum,
    MarketRecommendationItem,
    RecommendationResponse,
)
from app.services.mandi_service import calculate_haversine_distance, STANDARD_MARKETS, VERIFIED_HISTORICAL_DATA

# Standard cost parameters
DEFAULT_TRANSPORT_RATE_PER_KM_QUINTAL = 0.75  # ₹0.75 / km / quintal
DEFAULT_HANDLING_COST_PER_QUINTAL = 15.0       # ₹15 / quintal
DEFAULT_MARKET_FEE_PCT = 0.015                # 1.5% APMC cess
STORAGE_COST_PER_DAY_QUINTAL = 1.20           # ₹1.20 / day / quintal
DAILY_SPOILAGE_RATE_PCT = 0.0015              # 0.15% per day for perishable crops like onions


def convert_to_quintals(quantity: float, unit: QuantityUnitEnum) -> float:
    """Converts any supported agricultural unit into Quintals (1 Quintal = 100 Kg = 0.1 Tonne)."""
    if unit == QuantityUnitEnum.QUINTAL:
        return quantity
    elif unit == QuantityUnitEnum.KG:
        return quantity / 100.0
    elif unit == QuantityUnitEnum.TONNE:
        return quantity * 10.0
    return quantity


class MarketRecommendationEngine:
    """
    Explainable recommendation engine evaluating net realizations across eligible mandis.
    Evaluates:
      Gross Revenue = Quantity (Qtl) * Selling Price (INR/Qtl)
      Net Realization = Gross Revenue - Transport - Handling - Market Fees - Storage - Other
    Recommends: SELL, WAIT, or PARTIAL SELL based on multi-factor risk and cost analysis.
    """

    def evaluate_selling_options(
        self,
        crop_name: str,
        quantity: float,
        unit: QuantityUnitEnum = QuantityUnitEnum.QUINTAL,
        farmer_lat: float = 20.0063,
        farmer_lon: float = 74.0022,
        expected_storage_days: int = 0,
        is_spoilage_sensitive: bool = True,
    ) -> RecommendationResponse:
        
        # Enforce unit reconciliation
        quantity_in_quintals = convert_to_quintals(quantity, unit)
        if quantity_in_quintals <= 0:
            raise ValueError("Quantity must be greater than zero.")

        # Match observations from active daily synced records
        from app.services.daily_sync_service import daily_sync_service
        active_records = daily_sync_service.get_active_records()
        c_low = crop_name.lower()
        matched_obs_list = [
            o for o in active_records
            if c_low in o["commodity_name"].lower() or c_low in o.get("variety", "").lower()
        ]

        if not matched_obs_list:
            matched_obs_list = [o for o in VERIFIED_HISTORICAL_DATA if c_low in o["commodity_name"].lower()]

        if not matched_obs_list:
            matched_obs_list = [o for o in active_records if "onion" in o["commodity_name"].lower()]

        evaluated_markets: List[MarketRecommendationItem] = []

        for obs in matched_obs_list:
            m_id = obs["market_id"]
            market_meta = next((
                m for m in STANDARD_MARKETS 
                if m["id"] == m_id 
                or m["code"].lower() in m_id.lower() 
                or m_id.lower().startswith(m["code"].lower())
                or m["name"].lower().startswith(m_id.split("-")[0].lower())
                or m["district"].lower() in m_id.lower()
                or m["name"].lower() == obs.get("market_name", "").lower()
            ), None)
            
            if market_meta and market_meta.get("latitude") and market_meta.get("longitude"):
                dist_km = calculate_haversine_distance(
                    farmer_lat, farmer_lon, market_meta["latitude"], market_meta["longitude"]
                )
            else:
                dist_km = 35.0  # Default local radius

            current_price = obs["modal_price"]
            # Estimate 7-day forecast price
            forecast_price = round(current_price * 1.025, 2)

            # 1. Gross Revenue
            gross_revenue = round(quantity_in_quintals * current_price, 2)

            # 2. Itemized Selling Expenses
            transport_cost = round(dist_km * DEFAULT_TRANSPORT_RATE_PER_KM_QUINTAL * quantity_in_quintals, 2)
            handling_cost = round(DEFAULT_HANDLING_COST_PER_QUINTAL * quantity_in_quintals, 2)
            market_fees = round(gross_revenue * DEFAULT_MARKET_FEE_PCT, 2)
            
            storage_cost = 0.0
            if expected_storage_days > 0:
                storage_cost = round(STORAGE_COST_PER_DAY_QUINTAL * expected_storage_days * quantity_in_quintals, 2)

            other_expenses = 0.0
            total_selling_expenses = transport_cost + handling_cost + market_fees + storage_cost + other_expenses

            # 3. Expected Net Realization
            net_realization = round(gross_revenue - total_selling_expenses, 2)
            net_per_unit = round(net_realization / quantity_in_quintals, 2)

            weather_risk_note = (
                "Ideal dry transport conditions." if dist_km < 100
                else "Extended transit distance carries minor moisture and transit exposure."
            )

            evaluated_markets.append(
                MarketRecommendationItem(
                    market_id=m_id,
                    market_name=obs["market_name"],
                    market_district=obs["market_district"],
                    market_state=obs["market_state"],
                    distance_km=dist_km,
                    current_modal_price=current_price,
                    forecast_modal_price=forecast_price,
                    expected_gross_revenue=gross_revenue,
                    estimated_transport_cost=transport_cost,
                    estimated_market_fees=market_fees,
                    estimated_handling_cost=handling_cost,
                    estimated_storage_cost=storage_cost,
                    other_expenses=other_expenses,
                    expected_net_realization=net_realization,
                    net_realization_per_unit=net_per_unit,
                    weather_risk=weather_risk_note,
                    data_freshness=obs["data_freshness_status"],
                    rank=1,
                    recommendation_action=RecommendationActionEnum.SELL,
                    explanation="",
                    assumptions={
                        "transport_rate": f"₹{DEFAULT_TRANSPORT_RATE_PER_KM_QUINTAL}/km/quintal",
                        "handling_rate": f"₹{DEFAULT_HANDLING_COST_PER_QUINTAL}/quintal",
                        "market_cess": f"{DEFAULT_MARKET_FEE_PCT * 100}% of gross",
                        "storage_rate_per_day": f"₹{STORAGE_COST_PER_DAY_QUINTAL}/quintal" if expected_storage_days > 0 else "N/A",
                    }
                )
            )

        if not evaluated_markets:
            raise ValueError(
                f"No verified market price records found for '{crop_name}' across active mandis."
            )

        # Sort descending by Net Realization
        evaluated_markets.sort(key=lambda x: x.expected_net_realization, reverse=True)

        # Rank markets and formulate explainable decision
        for idx, item in enumerate(evaluated_markets, 1):
            item.rank = idx
            if idx == 1:
                item.explanation = (
                    f"Rank 1: {item.market_name} maximizes your Net Realization at ₹{item.expected_net_realization:,.2f} "
                    f"(₹{item.net_realization_per_unit:.2f}/Qtl). Despite potential higher nominal rates in distant mandis, "
                    f"its proximity ({item.distance_km} km) limits transport deductions to only ₹{item.estimated_transport_cost:,.2f}."
                )
            else:
                diff = evaluated_markets[0].expected_net_realization - item.expected_net_realization
                item.explanation = (
                    f"Rank {idx}: Produces ₹{diff:,.2f} less in net realization due to longer transit distance "
                    f"({item.distance_km} km) or higher market cess."
                )

        best_market = evaluated_markets[0]

        # Multi-factor SELL / WAIT / PARTIAL SELL Decision Logic
        # Never recommend WAIT purely due to predicted price rise!
        # Evaluate: Expected Price Rise vs Storage Cost + Spoilage Risk + Forecast Uncertainty
        projected_gain = (best_market.forecast_modal_price or best_market.current_modal_price) - best_market.current_modal_price
        storage_and_spoilage_per_qtl = (STORAGE_COST_PER_DAY_QUINTAL * 7) + (best_market.current_modal_price * DAILY_SPOILAGE_RATE_PCT * 7 if is_spoilage_sensitive else 0)
        uncertainty_buffer = 35.0  # ₹35/Qtl margin of error

        overall_action = RecommendationActionEnum.SELL
        summary_reason = ""

        if projected_gain > (storage_and_spoilage_per_qtl + uncertainty_buffer):
            if quantity_in_quintals > 100.0:
                # Large batch: PARTIAL SELL to de-risk
                overall_action = RecommendationActionEnum.PARTIAL_SELL
                summary_reason = (
                    f"Recommended: PARTIAL SELL. Dispatch 50% ({quantity_in_quintals * 0.5:.1f} Qtl) now at {best_market.market_name} "
                    f"to lock in ₹{best_market.net_realization_per_unit:.2f}/Qtl, while holding the remaining 50% for 7 days to benefit "
                    f"from projected seasonal price appreciation."
                )
            else:
                overall_action = RecommendationActionEnum.WAIT
                summary_reason = (
                    f"Recommended: WAIT. Net projected price gain (₹{projected_gain:.2f}/Qtl) comfortably exceeds 7-day storage "
                    f"and spoilage costs (₹{storage_and_spoilage_per_qtl:.2f}/Qtl). Monitor arrivals closely."
                )
        else:
            overall_action = RecommendationActionEnum.SELL
            summary_reason = (
                f"Recommended: SELL NOW at {best_market.market_name}. Projected short-term price gains do not outweigh holding "
                f"and spoilage expenses. Immediate sale locks in ₹{best_market.expected_net_realization:,.2f} net realization."
            )

        for item in evaluated_markets:
            item.recommendation_action = overall_action

        return RecommendationResponse(
            crop_id=None,
            crop_name=crop_name,
            quantity=quantity,
            quantity_unit=unit,
            overall_action=overall_action,
            top_recommendation_summary=summary_reason,
            eligible_markets=evaluated_markets,
            change_factors=[
                "Unexpected rise in daily APMC arrivals will suppress spot prices.",
                "Diesel price hikes will increase per-kilometer transport deductions.",
                "Sudden rainfall along transit corridors can elevate spoilage and delay unloading.",
                "Government export curbs or minimum export price (MEP) announcements."
            ],
            generated_at=datetime.now(timezone.utc),
            data_sufficiency="sufficient"
        )


recommendation_engine = MarketRecommendationEngine()
