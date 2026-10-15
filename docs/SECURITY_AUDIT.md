# Security & Data Integrity Audit Report

## 1. Executive Summary

This document presents the security, authorization, and data-integrity audit for the **Farmer Price Prediction & Market Recommendation System (KrishiSetu)**. All components have been evaluated against OWASP Top 10 standards, multi-tenant row-level isolation requirements, and strict agricultural data veracity guidelines.

---

## 2. Multi-Tenant Isolation & Row Level Security (RLS)

All 14 core database tables in Supabase PostgreSQL have Row Level Security enabled with dedicated policies:

| Table Name | RLS Status | Tenant Isolation Policy | Access Restrictions |
|---|---|---|---|
| `farmers` | **Enabled** | `auth.uid() = id` | Farmer can only view and mutate their own profile |
| `farmer_settings` | **Enabled** | `auth.uid() = farmer_id` | Private notification & language preferences |
| `farms` | **Enabled** | `auth.uid() = farmer_id` | GPS farm parcel boundaries isolated |
| `crops` | **Enabled** | `auth.uid() = farmer_id` | Sowing, acreage, and harvest yields private |
| `commodities` | **Enabled** | Public Read / Admin Write | Read-only reference table |
| `markets` | **Enabled** | Public Read / Admin Write | Verified APMC mandis reference data |
| `market_price_observations` | **Enabled** | Public Read / Ingestion Worker Write | Official Agmarknet / data.gov.in verified observations |
| `price_forecasts` | **Enabled** | Public Read / Pipeline Write | Statistical ML forecast projections |
| `recommendations` | **Enabled** | `auth.uid() = farmer_id` | Farmer-specific net realization recommendations |
| `price_alerts` | **Enabled** | `auth.uid() = farmer_id` | Private price threshold alert triggers |
| `notifications` | **Enabled** | `auth.uid() = farmer_id` | Private localized alert feed |
| `weather_observations` | **Enabled** | Public Read / Ingestion Worker Write | Open-Meteo agro-meteorological records |
| `audit_logs` | **Enabled** | Admin Read / System Append Only | Tamper-evident audit trail |
| `api_ingestion_runs` | **Enabled** | Ingestion Worker Write / Admin Read | Data ingestion telemetry |

---

## 3. Opaque Identifier Architecture

To prevent enumeration attacks, scraping, and accidental tenant identity leakage:
* **Farmer Identifiers**: Generated using high-entropy opaque random format: `AGRI-XXXX-XXXX` (e.g., `AGRI-9F2B-78A1`). Sequential auto-incrementing integers are strictly forbidden in public APIs.
* **Crop Identifiers**: Generated using opaque structured format: `CROP-XXXX-XXXX` (e.g., `CROP-3E1A-89CF`).
* **Observation & Market IDs**: Use UUIDv4 standard identifiers.

---

## 4. API Authentication & Cross-Farmer Protection

* **JWT Verification**: Backend verifies Supabase Bearer JWT tokens in `app.core.security.get_current_user`.
* **Cross-Tenant Attack Resistance**:
  * Any attempt by Farmer A to read, update, or delete Farmer B's farm parcel or crop records returns an immediate `403 Forbidden` or `404 Not Found`.
  * Verified in unit tests: `test_cross_farmer_access_protection`, `test_cross_farmer_crop_protection`, and `test_unauthorized_crop_access`.

---

## 5. Input Validation & Bounds Enforcement

All client payloads are strictly validated using Pydantic v2 models before reaching business logic:
* **Geographical Coordinates**: Latitude constrained to `[-90.0, 90.0]`, Longitude to `[-180.0, 180.0]`.
* **Acreage & Yield Volumes**: Strict positive constraints (`gt=0.0`). Negative or zero acreage is rejected with HTTP 422.
* **Temporal Consistency**: `expected_harvest_date` must not precede `sowing_date`. Validated via `@model_validator(mode="after")`.
* **Forecast Horizons**: Restricted strictly to supported horizons: `[1, 3, 7, 15, 30]` days. Arbitrary horizons return HTTP 400.

---

## 6. Strict Non-Fabrication Guarantee

* **No Hallucinated Market Data**: When government mandi data is unavailable for a requested commodity or region, the system never interpolates or creates synthetic numbers.
* **Fallback Contract**: Returns exact standard disclosure: `"Current reliable market data is unavailable."` with empty arrays.
* **Model Limitation Disclosure**: Plain-language disclaimers are persistently attached to price forecasts emphasizing that forecasts are statistical estimates and not guaranteed market rates.

---

## 7. Environment Hygiene & Secrets Management

* **No Hardcoded Secrets**: All Supabase keys, JWT secrets, and external URLs are sourced through environment variables (`.env`).
* **CORS Policy**: Configured to restrict allowed origins to designated frontend origins in production.
* **Audit Trail**: Sensitive state updates trigger immutable audit records in the database.
