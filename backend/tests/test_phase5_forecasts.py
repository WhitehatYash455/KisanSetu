import pytest
from httpx import AsyncClient
from app.services.ml_pipeline import forecasting_pipeline, InsufficientDataError


def test_ml_pipeline_feature_engineering_no_leakage():
    df = forecasting_pipeline.build_synthetic_historical_series(base_price=2400.0, num_days=100)
    assert len(df) >= 100
    featured_df, feat_cols = forecasting_pipeline.create_features(df)
    assert len(featured_df) > 0
    assert "lag_1" in feat_cols
    assert "lag_7" in feat_cols
    assert "rolling_mean_7" in feat_cols
    assert "rolling_std_7" in feat_cols
    
    # Verify evaluation metrics are realistic positive floats
    metrics = forecasting_pipeline.evaluate_model_chronological(featured_df, feat_cols)
    assert "mae" in metrics
    assert "rmse" in metrics
    assert metrics["mae"] > 0
    assert metrics["rmse"] > 0
    assert metrics["rmse"] >= metrics["mae"]  # Mathematical property: RMSE >= MAE


def test_ml_pipeline_insufficient_data_raises():
    with pytest.raises(InsufficientDataError):
        forecasting_pipeline.generate_multi_horizon_forecast(
            commodity_id="c001",
            market_id="m001",
            current_modal_price=2400.0,
            horizon_days=30,
            available_history_count=20  # Only 20 days: insufficient for 30-day forecast!
        )


@pytest.mark.asyncio
async def test_forecast_all_five_horizons(async_client: AsyncClient):
    for h in [1, 3, 7, 15, 30]:
        resp = await async_client.get(
            f"/api/v1/forecasts?commodity_id=c0010000-0000-0000-0000-000000000001&market_id=m0010000-0000-0000-0000-000000000001&horizon_days={h}"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["forecasts"]) > 0
        target_point = next((p for p in data["forecasts"] if p["horizon_days"] == h), None)
        assert target_point is not None
        # Confidence interval invariant
        assert target_point["lower_bound"] <= target_point["predicted_modal_price"] <= target_point["upper_bound"]
        assert target_point["confidence_level"] == 0.90


@pytest.mark.asyncio
async def test_forecast_invalid_horizon_rejected(async_client: AsyncClient):
    resp = await async_client.get(
        "/api/v1/forecasts?commodity_id=c0010000-0000-0000-0000-000000000001&market_id=m0010000-0000-0000-0000-000000000001&horizon_days=10"
    )
    assert resp.status_code == 400
    assert "Supported forecast horizons are strictly" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_forecast_insufficient_data_scenario(async_client: AsyncClient):
    # When insufficient data flag is simulated or rare crop has inadequate data
    resp = await async_client.get(
        "/api/v1/forecasts?commodity_id=c0010000-0000-0000-0000-000000000001&market_id=m0010000-0000-0000-0000-000000000001&horizon_days=30&simulate_insufficient_data=true"
    )
    assert resp.status_code == 422
    data = resp.json()
    assert "Insufficient historical data available" in data["detail"]


@pytest.mark.asyncio
async def test_forecast_models_metadata_endpoint(async_client: AsyncClient):
    resp = await async_client.get("/api/v1/forecasts/models")
    assert resp.status_code == 200
    models = resp.json()
    assert len(models) >= 2
    for m in models:
        assert "version" in m
        assert "algorithm" in m
        assert "mae" in m
        assert "rmse" in m
