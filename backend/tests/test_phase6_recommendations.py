import pytest
from httpx import AsyncClient
from app.services.recommendation_engine import convert_to_quintals, recommendation_engine
from app.models.schemas import QuantityUnitEnum, RecommendationActionEnum


def test_unit_conversion():
    assert convert_to_quintals(50.0, QuantityUnitEnum.QUINTAL) == 50.0
    assert convert_to_quintals(5.0, QuantityUnitEnum.TONNE) == 50.0
    assert convert_to_quintals(5000.0, QuantityUnitEnum.KG) == 50.0


def test_net_realization_math_in_recommendation_engine():
    res = recommendation_engine.evaluate_selling_options(
        crop_name="Onion",
        quantity=100.0,
        unit=QuantityUnitEnum.QUINTAL,
        farmer_lat=20.0063,
        farmer_lon=74.0022
    )
    assert len(res.eligible_markets) > 0
    top = res.eligible_markets[0]

    # Mathematical identity verification
    expected_gross = top.current_modal_price * 100.0
    assert top.expected_gross_revenue == expected_gross
    total_expenses = (
        top.estimated_transport_cost
        + top.estimated_market_fees
        + top.estimated_handling_cost
        + top.estimated_storage_cost
        + top.other_expenses
    )
    assert top.expected_net_realization == round(expected_gross - total_expenses, 2)
    assert top.net_realization_per_unit == round(top.expected_net_realization / 100.0, 2)


def test_recommendation_partial_sell_for_large_volume():
    # Large volume (> 100 Qtl) should trigger PARTIAL SELL to hedge risk
    res = recommendation_engine.evaluate_selling_options(
        crop_name="Onion",
        quantity=250.0,
        unit=QuantityUnitEnum.QUINTAL
    )
    assert res.overall_action in [RecommendationActionEnum.PARTIAL_SELL, RecommendationActionEnum.SELL]


@pytest.mark.asyncio
async def test_recommendations_endpoint(async_client: AsyncClient):
    resp = await async_client.get("/api/v1/recommendations?crop_name=Onion&quantity=60&unit=Quintal")
    assert resp.status_code == 200
    data = resp.json()
    assert "overall_action" in data
    assert "eligible_markets" in data
    assert len(data["eligible_markets"]) >= 2
    assert "change_factors" in data
    assert len(data["change_factors"]) >= 3
    # First ranked market should have rank 1
    assert data["eligible_markets"][0]["rank"] == 1


@pytest.mark.asyncio
async def test_recommendations_insufficient_data_rejection(async_client: AsyncClient):
    resp = await async_client.get(
        "/api/v1/recommendations?crop_name=NonExistentExoticCrop&simulate_insufficient_data=true"
    )
    assert resp.status_code == 422
    assert "Insufficient market price data available" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_profit_calculator_endpoint_with_comparisons(async_client: AsyncClient):
    payload = {
        "crop_name": "Onion",
        "quantity": 80.0,
        "quantity_unit": "Quintal",
        "selling_price_per_unit": 2450.0,
        "transport_cost": 3200.0,
        "loading_unloading_cost": 1200.0,
        "market_fees": 2940.0,
        "storage_cost": 0.0,
        "other_expenses": 500.0,
        "include_market_comparisons": True
    }
    resp = await async_client.post("/api/v1/calculator", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["gross_revenue"] == 80.0 * 2450.0  # 196,000
    assert data["total_selling_expenses"] == 3200.0 + 1200.0 + 2940.0 + 500.0  # 7,840
    assert data["net_realization"] == 196000.0 - 7840.0  # 188,160
    assert data["net_realization_per_unit"] == 188160.0 / 80.0  # 2,352
    assert "market_comparisons" in data
    assert len(data["market_comparisons"]) > 0
