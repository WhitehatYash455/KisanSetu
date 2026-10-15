# Farmer Price Prediction & Market Recommendation System (KrishiSetu)

A production-grade, full-stack, responsive web application for Indian farmers to manage crops, monitor verified mandi prices, predict future prices with machine learning, compare nearby markets by net pocket profit, and evaluate transit weather risks.

---

## 1. Project Overview & Features

* **Crop Lifecycle Management**: Track produce across 5 strict agronomic stages (`Growing`, `Ready to Harvest`, `Stored`, `Partially Sold`, `Completed`) with automated multilingual aliases in English, Hindi, and Marathi.
* **Verified Mandi Price Integration**: Real Indian APMC mandi observations (`Agmarknet` / `data.gov.in`) across 12 major crops and 12+ mandis (Lasalgaon, Pimpalgaon, Indore, Ujjain, Pune Gultekdi, Nagpur Kalamna, Gondal, Khanna, Azadpur).
* **Hybrid ML Price Prediction (ARIMA + LSTM)**: Statsmodels ARIMA(1, 1, 1) combined with Deep Sequential LSTM Neural Network across 5 horizons (1, 3, 7, 15, and 30 days) with dynamic inverse-RMSE weighting, 90% confidence bands, and visual model decomposition.
* **External Maps & Road Routing Engine**: Live OpenStreetMap / OSRM routing calculating real road driving distance (km), travel duration (hours/mins), diesel fuel expense, highway tolls, and hamali labor.
* **Live Device GPS Geolocation**: Hardware GPS integration (`navigator.geolocation`) across Markets, Weather observatory, and Recommendation engines to auto-detect farmer field coordinates with single-tap accuracy.
* **Multi-Gateway SMS Dispatcher**: Dispatches instant localized SMS alerts (Twilio / Fast2SMS / Live Gateway Simulator) directly to the farmer's mobile phone in English, हिन्दी, and मराठी.
* **Voice Speech Synthesizer**: Text-to-speech advisory audio readout in regional languages for semi-literate farmers.
* **Explainable Market Recommendation Engine**: Net selling realization algorithm evaluating Gross Revenue minus freight, labor, APMC cess, and storage loss to provide actionable `SELL`, `WAIT`, or `PARTIAL SELL` decisions.
* **Interactive Selling Profit Calculator**: Dynamic expense simulator supporting Quintals, Kg, and Metric Tonnes with itemized deductions and multi-mandi ranking matrix.
* **Agro-Weather & Produce Transit Risk**: Open-Meteo meteorological telemetry with 7-day agricultural forecasts and road moisture/wind hazard classifications.
* **Price Alerts & Notifications**: Farmer price threshold monitoring engine with multilingual notification dispatching and unread badge management.
* **Trilingual Localization & Accessibility**: Complete native language switching (English, हिन्दी, मराठी) and light/dark theme toggling.
* **Security & Multi-Tenant Isolation**: Row Level Security (RLS) on all 14 PostgreSQL tables, non-sequential opaque Farmer IDs (`AGRI-XXXX-XXXX`), and cross-farmer authorization guards.

---

## 2. Technology Stack

* **Frontend**: Next.js 16 (App Router with Turbopack), React 19, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Leaflet / OpenStreetMap.
* **Backend**: Python 3.14, FastAPI, Pydantic v2, TensorFlow / Keras, Statsmodels, Scikit-learn, Pandas, NumPy, Twilio, httpx, uvicorn.
* **Database & Auth**: Supabase PostgreSQL (14 normalized tables, triggers, indexes, and RLS policies), JWT authentication.
* **External APIs**: OSRM (Open Source Routing Machine on OpenStreetMap), Open-Meteo Agro-Weather API, Agmarknet / data.gov.in Verified Mandi Registry.

---

## 3. Directory Structure

```
Mini-Project/
├── backend/                        # FastAPI Backend Application
│   ├── app/
│   │   ├── api/                    # REST API Endpoints
│   │   │   ├── endpoints/          # calculator, crops, farmer, forecasts, markets, notifications, weather
│   │   │   └── router.py           # Unified v1 API router
│   │   ├── core/                   # Configuration, security, database connectors
│   │   ├── models/                 # Pydantic v2 schemas and enums
│   │   ├── services/               # ml_pipeline, mandi_service, recommendation_engine, weather_service
│   │   └── main.py                 # FastAPI application entrypoint
│   ├── migrations/                 # PostgreSQL / Supabase SQL DDL & seeds
│   │   ├── 001_initial_schema.sql  # 14 normalized tables, constraints, RLS policies
│   │   └── 002_seed_reference_data.sql # Mandis & commodities seed data
│   ├── tests/                      # Automated test suite (pytest - 51 tests)
│   ├── requirements.txt            # Python dependencies
│   ├── pytest.ini                  # Pytest configuration
│   └── .env.example                # Backend environment configuration
├── frontend/                       # Next.js 16 (App Router) + React 19 + TypeScript
│   ├── src/
│   │   ├── app/                    # Next.js routes (/, /crops, /dashboard, /forecasts, /markets, /recommendations, /calculator, /weather, /profile)
│   │   ├── components/             # Reusable UI & layout components (Navbar, Footer)
│   │   └── lib/                    # Translations, Auth context, Language context, Theme context, API client
│   ├── package.json
│   └── .env.example                # Frontend environment configuration
├── docs/                           # Architecture, database schema, API contracts, security audit
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── API_CONTRACTS.md
│   └── SECURITY_AUDIT.md
└── README.md
```

---

## 4. Quick Start & Execution

### Prerequisites
* Python 3.10+ (tested with Python 3.14)
* Node.js 18+ (tested with Node.js v24)
* npm 9+

---

### Backend Setup

1. **Create and activate virtual environment**:
   ```powershell
   # Windows PowerShell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Configure environment**:
   ```bash
   cp backend/.env.example backend/.env
   ```

4. **Run backend development server**:
   ```powershell
   $env:PYTHONPATH="backend"
   .\venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
   ```
   * Live API: `http://localhost:8000`
   * OpenAPI Swagger Documentation: `http://localhost:8000/docs`

5. **Run backend test suite**:
   ```powershell
   .\venv\Scripts\pytest.exe backend\tests -v
   ```
   *All 51 tests run and pass synchronously.*

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env.local
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```
   * Application runs at: `http://localhost:3000`

5. **Validate production build**:
   ```bash
   npm run build
   ```
   *Compiles all 14 routes into optimized static/dynamic prerendered bundles.*

---

## 5. Development Phases Status

- [x] **Phase 1: Project Setup and Database** — Core schemas, 14 tables DDL with RLS, FastAPI skeleton, Next.js setup.
- [x] **Phase 2: Authentication and Farmer Profile** — Supabase Auth, opaque Farmer IDs (`AGRI-XXXX-XXXX`), farm parcel CRUD, settings.
- [x] **Phase 3: Crop Management** — Full CRUD, 5 lifecycle stages, multilingual aliases (`Onion/प्याज/कांदा`), delete safeguards.
- [x] **Phase 4: Market-Price Integration** — Verified APMC data ingestion, Haversine geodesic distance, comparison matrix.
- [x] **Phase 5: Machine-Learning Price Prediction** — Chronological train/test split, 5 horizons, uncertainty intervals, MAE/RMSE/MAPE.
- [x] **Phase 6: Profit and Recommendation Engine** — Net Realization formula, explainable SELL/WAIT/PARTIAL SELL advisor, interactive profit calculator.
- [x] **Phase 7: Weather and Notifications** — Open-Meteo agro-weather integration, transit road risk rules, price alerts, interactive notification popover.
- [x] **Phase 8: Quality Assurance and Deployment** — End-to-end integration test suite, comprehensive security audit, documentation finalization.

---

## 6. Strict Non-Fabrication Policy & Limitations

* **No Hallucinated Market Prices**: If government mandi data is unavailable for a requested commodity or region, the system strictly returns `"Current reliable market data is unavailable."` without fabricating artificial prices.
* **Statistical Limitation Disclosure**: Price forecasts are statistical projections based on historical pattern recognition and agro-climatic conditions; they must not be interpreted as guaranteed selling prices.
