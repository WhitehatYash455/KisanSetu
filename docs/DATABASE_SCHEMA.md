# Database Schema Specification

The database utilizes PostgreSQL 14+ hosted via Supabase, normalized to 3NF with comprehensive constraints, triggers, indexes, and Row Level Security (RLS) policies.

## 1. Tables and Relations Summary

| # | Table Name | Purpose | Primary Key | Foreign Keys / Relations | RLS Protection |
|---|------------|---------|-------------|--------------------------|----------------|
| 1 | `user_profiles` | Farmer profile, opaque Farmer ID, location | `id` (UUID) | `id` -> `auth.users(id)` | Owner read/write (`auth.uid() = id`) |
| 2 | `farmer_settings` | Theme, notification channels, distance unit | `id` (UUID) | `farmer_id` -> `user_profiles(id)` | Owner read/write |
| 3 | `farms` | Farm parcels, acreage, coordinates, soil | `id` (UUID) | `farmer_id` -> `user_profiles(id)` | Owner read/write |
| 4 | `commodities` | Standard crop catalog (EN, HI, MR) | `id` (UUID) | None | Public read, service-role write |
| 5 | `crops` | Farmer's active/harvested/stored crops | `id` (UUID) | `farmer_id` -> `user_profiles(id)`, `farm_id`, `commodity_id` | Owner read/write |
| 6 | `markets` | Mandis/APMCs, locations, phone numbers | `id` (UUID) | None | Public read, service-role write |
| 7 | `market_price_observations` | Verified daily mandi modal, min, max prices | `id` (UUID) | `market_id`, `commodity_id` | Public read, service-role write |
| 8 | `ml_models` | ML model metadata, version, MAE, RMSE | `id` (UUID) | None | Public read, service-role write |
| 9 | `price_forecasts` | 1, 3, 7, 15, 30 day predictions & intervals | `id` (UUID) | `commodity_id`, `market_id`, `model_id` | Public read, service-role write |
| 10 | `market_recommendations` | Explainable SELL/WAIT recommendations | `id` (UUID) | `farmer_id`, `crop_id`, `market_id` | Farmer-specific read |
| 11 | `weather_observations` | Farm agro-weather forecasts & alerts | `id` (UUID) | None | Public read, service-role write |
| 12 | `saved_markets` | Farmer's bookmarked mandis | `id` (UUID) | `farmer_id`, `market_id` | Owner read/write |
| 13 | `price_alerts` | Price alert triggers configured by farmer | `id` (UUID) | `farmer_id`, `commodity_id`, `market_id` | Owner read/write |
| 14 | `notifications` | Alert history with multilingual text | `id` (UUID) | `farmer_id` -> `user_profiles(id)` | Owner read/write |

## 2. Integrity Constraints & Business Logic

- **Non-Sequential Farmer ID**: `user_profiles.farmer_id` is unique and formatted as `AGRI-XXXX-XXXX`.
- **Crop Lifecycles**: Restricted to `('Growing', 'Ready to Harvest', 'Stored', 'Partially Sold', 'Completed')`.
- **Date Constraints**: `expected_harvest_date >= sowing_date` and `actual_harvest_date >= sowing_date`.
- **Price Consistency**: Mandi observations require `modal_price >= min_price AND modal_price <= max_price`.
- **Forecast Horizons**: Validated at database level to `CHECK (horizon_days IN (1, 3, 7, 15, 30))`.
- **Updated Timestamps**: Automatically updated via `BEFORE UPDATE` trigger on all mutable tables.
