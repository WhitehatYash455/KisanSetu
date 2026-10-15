import pytest
from app.services.ml_pipeline import forecasting_pipeline, NumericalARIMAModel, VectorizedNumPyLSTM
import numpy as np


def test_numerical_arima_model_mechanics():
    """Validates pure mathematical ARIMA(1, 1, 1) model."""
    series = np.array([2100, 2120, 2140, 2135, 2160, 2190, 2185, 2220, 2240, 2260], dtype=float)
    arima = NumericalARIMAModel(p=1, d=1, q=1)
    arima.fit(series)
    forecasts = arima.forecast(steps=5)
    
    assert len(forecasts) == 5
    assert all(isinstance(f, float) for f in forecasts)
    # Price should trend positively given historical trajectory
    assert forecasts[-1] > series[0]


def test_vectorized_lstm_recurrent_cell_mechanics():
    """Validates vector LSTM forward sequence and gate outputs."""
    series = np.array([2100, 2120, 2140, 2135, 2160, 2190, 2185, 2220, 2240, 2260, 2280, 2300, 2320, 2350, 2380], dtype=float)
    lstm = VectorizedNumPyLSTM(input_dim=1, hidden_dim=16, seed=42)
    preds = lstm.fit_and_predict(series, steps=7, window_size=5)

    assert len(preds) == 7
    assert all(p > 0 for p in preds)


def test_hybrid_arima_lstm_multi_horizon_forecasting():
    """Tests the full Hybrid pipeline with decomposition metadata."""
    points, metrics, decomposition = forecasting_pipeline.generate_multi_horizon_forecast(
        commodity_id="c0010000-0000-0000-0000-000000000001",
        market_id="m0010000-0000-0000-0000-000000000001",
        current_modal_price=2420.0,
        horizon_days=30,
        available_history_count=120
    )

    assert len(points) == 5  # 1, 3, 7, 15, 30
    for pt in points:
        assert pt.predicted_modal_price > 0
        assert pt.lower_bound <= pt.predicted_modal_price
        assert pt.upper_bound >= pt.predicted_modal_price
        assert pt.arima_price is not None
        assert pt.lstm_price is not None
        assert pt.hybrid_price is not None

    assert "weights" in decomposition
    assert "arima_weight" in decomposition["weights"]
    assert "lstm_weight" in decomposition["weights"]
    assert abs((decomposition["weights"]["arima_weight"] + decomposition["weights"]["lstm_weight"]) - 1.0) < 0.01
