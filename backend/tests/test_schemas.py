from datetime import date
import pytest
from pydantic import ValidationError
from app.models.schemas import (
    CropCreate,
    CropStatusEnum,
    QuantityUnitEnum,
    ProfitCalculatorRequest,
    ProfitCalculatorResponse,
    ForecastRequest,
    LanguageEnum,
)
from app.core.security import generate_opaque_farmer_id


def test_opaque_farmer_id_generation():
    farmer_id = generate_opaque_farmer_id()
    assert farmer_id.startswith("AGRI-")
    parts = farmer_id.split("-")
    assert len(parts) == 3
    assert len(parts[1]) == 4
    assert len(parts[2]) == 4
    # Ensure no easily confused characters (I, O, 0, 1)
    for part in parts[1:]:
        assert "I" not in part
        assert "O" not in part
        assert "0" not in part
        assert "1" not in part
    # Ensure uniqueness across multiple generations
    ids = {generate_opaque_farmer_id() for _ in range(100)}
    assert len(ids) == 100


def test_crop_schema_valid_dates():
    crop = CropCreate(
        crop_name="Onion",
        variety="Nashik Red",
        acreage=2.5,
        quantity=60.0,
        quantity_unit=QuantityUnitEnum.QUINTAL,
        sowing_date=date(2026, 6, 1),
        expected_harvest_date=date(2026, 10, 15),
        status=CropStatusEnum.GROWING,
    )
    assert crop.crop_name == "Onion"
    assert crop.acreage == 2.5


def test_crop_schema_invalid_dates_raises():
    with pytest.raises(ValidationError):
        CropCreate(
            crop_name="Onion",
            acreage=2.5,
            quantity=60.0,
            sowing_date=date(2026, 10, 15),
            expected_harvest_date=date(2026, 6, 1),  # earlier than sowing!
        )


def test_forecast_request_valid_horizons():
    for h in [1, 3, 7, 15, 30]:
        req = ForecastRequest(
            commodity_id="c001",
            market_id="m001",
            horizon_days=h
        )
        assert req.horizon_days == h


def test_forecast_request_invalid_horizon_raises():
    with pytest.raises(ValidationError):
        ForecastRequest(
            commodity_id="c001",
            market_id="m001",
            horizon_days=10  # 10 is not allowed, only 1, 3, 7, 15, 30
        )


def test_profit_calculator_calculations():
    # 50 Quintals at ₹2,400/Quintal = ₹120,000 Gross
    # Transport = ₹2,500, Loading = ₹750, Market Fee = ₹1,800, Storage = ₹0, Other = ₹0
    # Total Expenses = ₹5,050
    # Net Realization = ₹114,950
    # Net per unit = ₹2,299
    quantity = 50.0
    price = 2400.0
    transport = 2500.0
    handling = 750.0
    market_fees = 1800.0
    gross = quantity * price
    expenses = transport + handling + market_fees
    net = gross - expenses

    res = ProfitCalculatorResponse(
        crop_name="Onion",
        quantity_sold=quantity,
        quantity_unit=QuantityUnitEnum.QUINTAL,
        gross_revenue=gross,
        total_selling_expenses=expenses,
        net_realization=net,
        net_realization_per_unit=net / quantity,
        expense_breakdown={
            "transport_cost": transport,
            "loading_unloading_cost": handling,
            "market_fees": market_fees,
            "storage_cost": 0.0,
            "other_expenses": 0.0,
        },
        profit_margin_percentage=round((net / gross) * 100, 2),
    )
    assert res.gross_revenue == 120000.0
    assert res.total_selling_expenses == 5050.0
    assert res.net_realization == 114950.0
    assert res.net_realization_per_unit == 2299.0
    assert res.profit_margin_percentage == 95.79
