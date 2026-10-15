# API Contracts Specification

Base URL: `/api/v1`
Interactive OpenAPI Docs: `/docs`
ReDoc: `/redoc`

---

## 1. System Health

### `GET /api/v1/health`
**Description**: Returns service health, version, active environment, and connection status for Supabase, Mandi provider, and Weather API.

**Response (200 OK)**:
```json
{
  "status": "healthy",
  "service": "Farmer Price Prediction & Market Recommendation API",
  "version": "1.0.0",
  "environment": "development",
  "timestamp": "2026-10-09T09:40:00Z",
  "database": {
    "status": "connected",
    "provider": "Supabase PostgreSQL"
  },
  "services": {
    "mandi_data_provider": "data.gov.in / Agmarknet (Verified)",
    "weather_provider": "Open-Meteo Agricultural API",
    "ml_engine": "scikit-learn / pandas chronological time-series"
  }
}
```

---

## 2. Farmer Profile & Settings

### `GET /api/v1/farmer/profile`
**Headers**: `Authorization: Bearer <SUPABASE_JWT>`
**Response (200 OK)**:
```json
{
  "id": "uuid-farmer-sub",
  "farmer_id": "AGRI-9M2K-7P4W",
  "full_name": "Ramesh Patil",
  "phone_number": "+919876543210",
  "preferred_language": "mr",
  "state": "Maharashtra",
  "district": "Nashik",
  "sub_district": "Niphad",
  "village": "Lasalgaon",
  "pincode": "422306",
  "created_at": "2026-10-01T08:00:00Z",
  "updated_at": "2026-10-09T08:00:00Z"
}
```

### `PUT /api/v1/farmer/profile`
**Headers**: `Authorization: Bearer <SUPABASE_JWT>`
**Request Body**:
```json
{
  "full_name": "Ramesh Patil",
  "phone_number": "+919876543210",
  "preferred_language": "hi",
  "state": "Maharashtra",
  "district": "Nashik",
  "village": "Lasalgaon",
  "pincode": "422306"
}
```

---

## 3. Crop Management

### `POST /api/v1/crops`
**Headers**: `Authorization: Bearer <SUPABASE_JWT>`
**Request Body**:
```json
{
  "crop_name": "Onion",
  "commodity_id": "c0010000-0000-0000-0000-000000000001",
  "variety": "Nashik Red",
  "acreage": 3.5,
  "quantity": 120.0,
  "quantity_unit": "Quintal",
  "sowing_date": "2026-06-10",
  "expected_harvest_date": "2026-10-20",
  "status": "Growing",
  "notes": "Drip irrigated"
}
```

### `GET /api/v1/crops?status={status}`
**Headers**: `Authorization: Bearer <SUPABASE_JWT>`
**Query Parameters**: `status` (Optional: `Growing`, `Ready to Harvest`, `Stored`, `Partially Sold`, `Completed`)

### `PATCH /api/v1/crops/{crop_id}/status?new_status={new_status}`
**Headers**: `Authorization: Bearer <SUPABASE_JWT>`

---

## 4. Mandi Prices & Markets

### `GET /api/v1/markets`
**Query Parameters**: `state`, `district`, `farmer_lat`, `farmer_lon`
**Response (200 OK)**:
```json
[
  {
    "id": "m0010000-0000-0000-0000-000000000001",
    "code": "LASALGAON",
    "name": "Lasalgaon APMC",
    "state": "Maharashtra",
    "district": "Nashik",
    "market_type": "APMC",
    "latitude": 20.1477,
    "longitude": 74.2284,
    "contact_phone": "02550-266023",
    "distance_km": 32.5
  }
]
```

### `GET /api/v1/markets/prices`
**Query Parameters**: `commodity_id`, `market_id`, `state`
**Response (200 OK)**:
```json
[
  {
    "id": "po-001",
    "market_id": "m0010000-0000-0000-0000-000000000001",
    "market_name": "Lasalgaon APMC",
    "market_state": "Maharashtra",
    "market_district": "Nashik",
    "commodity_id": "c0010000-0000-0000-0000-000000000001",
    "commodity_name": "Onion",
    "variety": "Red Onion",
    "grade": "FAQ",
    "min_price": 1850.0,
    "max_price": 2650.0,
    "modal_price": 2420.0,
    "price_unit": "INR/Quintal",
    "observation_date": "2026-10-09",
    "source_name": "Agmarknet / data.gov.in (Verified)",
    "is_live_api": true,
    "data_freshness_status": "live",
    "created_at": "2026-10-09T08:00:00Z"
  }
]
```

---

## 5. Machine Learning Price Forecasts

### `GET /api/v1/forecasts?commodity_id={cid}&market_id={mid}&horizon_days={1|3|7|15|30}`
**Response (200 OK)**:
```json
{
  "commodity_id": "c0010000-0000-0000-0000-000000000001",
  "commodity_name": "Onion",
  "market_id": "m0010000-0000-0000-0000-000000000001",
  "market_name": "Lasalgaon APMC",
  "current_modal_price": 2420.0,
  "forecasts": [
    {
      "horizon_days": 1,
      "target_date": "2026-10-10",
      "predicted_modal_price": 2427.26,
      "lower_bound": 2366.58,
      "upper_bound": 2487.94,
      "confidence_level": 0.9,
      "uncertainty_notes": "90% prediction interval based on 1-day lag variance and historical arrivals."
    },
    {
      "horizon_days": 7,
      "target_date": "2026-10-16",
      "predicted_modal_price": 2470.82,
      "lower_bound": 2388.75,
      "upper_bound": 2552.89,
      "confidence_level": 0.9,
      "uncertainty_notes": "90% prediction interval based on 7-day lag variance and historical arrivals."
    }
  ],
  "model_version": "1.0.0-ridge-baseline",
  "model_algorithm": "Ridge Regression + Multi-day Autoregressive Lags",
  "training_period": "2023-01-01 to 2024-06-30",
  "metrics": {
    "mae": 42.5,
    "rmse": 58.3,
    "mape": 2.85
  },
  "generated_at": "2026-10-09T09:40:00Z",
  "data_sufficiency_status": "sufficient",
  "disclaimer": "Price forecasts are statistical estimates based on historical mandi patterns and must not be interpreted as guaranteed selling prices."
}
```

---

## 6. Market Recommendation Engine

### `GET /api/v1/recommendations?crop_name=Onion&quantity=50&unit=Quintal&farmer_lat=20.0&farmer_lon=74.0`
**Response (200 OK)**:
```json
{
  "crop_id": null,
  "crop_name": "Onion",
  "quantity": 50.0,
  "quantity_unit": "Quintal",
  "overall_action": "SELL",
  "top_recommendation_summary": "Recommended to SELL at Pimpalgaon Baswant APMC. Net expected realization is ₹121,080.00 after accounting for ₹900.00 transport and local market fees.",
  "eligible_markets": [
    {
      "market_id": "m0010000-0000-0000-0000-000000000002",
      "market_name": "Pimpalgaon Baswant APMC",
      "market_district": "Nashik",
      "market_state": "Maharashtra",
      "distance_km": 24.0,
      "current_modal_price": 2480.0,
      "forecast_modal_price": 2510.0,
      "expected_gross_revenue": 124000.0,
      "estimated_transport_cost": 900.0,
      "estimated_market_fees": 1860.0,
      "estimated_handling_cost": 750.0,
      "estimated_storage_cost": 0.0,
      "other_expenses": 0.0,
      "expected_net_realization": 120490.0,
      "net_realization_per_unit": 2409.8,
      "weather_risk": "Clear, no rain expected in next 48 hours.",
      "data_freshness": "live",
      "rank": 1,
      "recommendation_action": "SELL",
      "explanation": "Rank 1: Pimpalgaon Baswant APMC yields the highest Net Realization...",
      "assumptions": {
        "transport_rate_per_km_quintal": 0.75,
        "market_fee_rate": "1.5%",
        "handling_charge_per_quintal": 15.0
      }
    }
  ],
  "change_factors": [
    "Sudden increase in daily mandi arrival volumes may lower spot modal price.",
    "Diesel price fluctuations affecting per-km transport rates.",
    "Forecasted rain along transport corridor could delay delivery."
  ],
  "generated_at": "2026-10-09T09:40:00Z",
  "data_sufficiency": "sufficient"
}
```

---

## 7. Profit & Cost Calculator

### `POST /api/v1/calculator`
**Request Body**:
```json
{
  "crop_name": "Onion",
  "quantity": 50.0,
  "quantity_unit": "Quintal",
  "selling_price_per_unit": 2400.0,
  "transport_cost": 2500.0,
  "loading_unloading_cost": 750.0,
  "market_fees": 1800.0,
  "storage_cost": 0.0,
  "other_expenses": 0.0
}
```
**Response (200 OK)**:
```json
{
  "crop_name": "Onion",
  "quantity_sold": 50.0,
  "quantity_unit": "Quintal",
  "gross_revenue": 120000.0,
  "total_selling_expenses": 5050.0,
  "net_realization": 114950.0,
  "net_realization_per_unit": 2299.0,
  "expense_breakdown": {
    "transport_cost": 2500.0,
    "loading_unloading_cost": 750.0,
    "market_fees": 1800.0,
    "storage_cost": 0.0,
    "other_expenses": 0.0
  },
  "profit_margin_percentage": 95.79
}
```

---

## 8. Agro-Meteorological Weather & Transit Risk

### `GET /api/v1/weather`
**Query Parameters**:
* `latitude` (float, required): Farm or mandi latitude coordinate.
* `longitude` (float, required): Farm or mandi longitude coordinate.
* `location_name` (string, optional): Human-readable location identifier.

**Response (200 OK)**:
```json
{
  "location_name": "Nashik, Maharashtra",
  "latitude": 20.0063,
  "longitude": 74.0022,
  "current_temperature_c": 28.5,
  "current_humidity_pct": 52.0,
  "current_precipitation_mm": 0.0,
  "wind_speed_kmh": 12.4,
  "condition": "Clear Sky",
  "active_alerts": [],
  "forecast_days": [
    {
      "date": "2026-10-09",
      "temp_max_c": 32.0,
      "temp_min_c": 19.5,
      "precipitation_probability": 5.0,
      "condition": "Sunny / Dry",
      "harvest_risk_level": "Low",
      "transport_risk_level": "Low"
    }
  ],
  "source_provider": "Open-Meteo Real-Time Agro Meteorological API",
  "updated_at": "2026-10-09T10:00:00Z"
}
```

---

## 9. Price Alerts & Notifications

### `GET /api/v1/notifications`
**Headers**: `Authorization: Bearer <SUPABASE_JWT>`
**Query Parameters**: `unread_only` (bool, default `false`)
**Response (200 OK)**: List of farmer notifications with localized titles and messages.

### `GET /api/v1/notifications/unread-count`
**Headers**: `Authorization: Bearer <SUPABASE_JWT>`
**Response (200 OK)**: `{"unread_count": 2}`

### `PATCH /api/v1/notifications/{notification_id}/read`
**Headers**: `Authorization: Bearer <SUPABASE_JWT>`
**Response (200 OK)**: `{"message": "Notification marked as read", "id": "notif-001"}`

### `POST /api/v1/notifications/alerts`
**Headers**: `Authorization: Bearer <SUPABASE_JWT>`
**Request Body**:
```json
{
  "commodity_id": "c0010000-0000-0000-0000-000000000001",
  "market_id": "m0010000-0000-0000-0000-000000000001",
  "target_price": 2500.0,
  "condition": "ABOVE"
}
```
**Response (201 Created)**: Created price alert object with unique ID.

### `POST /api/v1/notifications/alerts/check`
**Headers**: `Authorization: Bearer <SUPABASE_JWT>`
**Description**: Evaluates active price alerts against latest mandi modal observations and dispatches notifications if conditions are met.
**Response (200 OK)**:
```json
{
  "status": "success",
  "evaluated_alerts_count": 1,
  "triggered_count": 1,
  "triggered_notifications": [...]
}
```
