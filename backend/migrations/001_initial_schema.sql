-- =============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Core schema, tables, constraints, indexes, triggers, and RLS policies
-- Target: Supabase / PostgreSQL 14+
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. USER PROFILES (Farmers)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    farmer_id VARCHAR(32) UNIQUE NOT NULL, -- Non-sequential opaque ID (e.g. AGRI-X9K2-8M7P)
    full_name TEXT NOT NULL,
    phone_number VARCHAR(15),
    preferred_language VARCHAR(5) NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'hi', 'mr')),
    state TEXT,
    district TEXT,
    sub_district TEXT,
    village TEXT,
    pincode VARCHAR(10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. FARMER SETTINGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS farmer_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID UNIQUE NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    theme_preference VARCHAR(10) NOT NULL DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark')),
    notification_sms BOOLEAN NOT NULL DEFAULT false,
    notification_push BOOLEAN NOT NULL DEFAULT true,
    notification_whatsapp BOOLEAN NOT NULL DEFAULT false,
    preferred_distance_unit VARCHAR(5) NOT NULL DEFAULT 'km' CHECK (preferred_distance_unit IN ('km', 'mi')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 3. FARMS AND LOCATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    farm_name TEXT NOT NULL,
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    address TEXT,
    total_acreage NUMERIC(10,2) NOT NULL CHECK (total_acreage > 0),
    soil_type TEXT,
    irrigation_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 4. COMMODITIES (Crops catalog & multilingual aliases)
-- =============================================================================
CREATE TABLE IF NOT EXISTS commodities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name_en TEXT NOT NULL,
    name_hi TEXT NOT NULL,
    name_mr TEXT NOT NULL,
    category TEXT NOT NULL, -- Cereals, Pulses, Oilseeds, Vegetables, Fruits, Cash Crops
    standard_unit VARCHAR(20) NOT NULL DEFAULT 'Quintal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 5. CROPS (Farmer's Cultivated Produce)
-- =============================================================================
CREATE TABLE IF NOT EXISTS crops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
    commodity_id UUID REFERENCES commodities(id) ON DELETE SET NULL,
    crop_name TEXT NOT NULL,
    variety TEXT,
    acreage NUMERIC(10,2) NOT NULL CHECK (acreage > 0),
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity >= 0),
    quantity_unit VARCHAR(20) NOT NULL DEFAULT 'Quintal' CHECK (quantity_unit IN ('Quintal', 'Kg', 'Tonne')),
    sowing_date DATE NOT NULL,
    expected_harvest_date DATE NOT NULL,
    actual_harvest_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Growing' CHECK (status IN ('Growing', 'Ready to Harvest', 'Stored', 'Partially Sold', 'Completed')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_harvest_dates CHECK (expected_harvest_date >= sowing_date)
);

-- =============================================================================
-- 6. MARKETS (Indian Mandis / APMCs)
-- =============================================================================
CREATE TABLE IF NOT EXISTS markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    market_type VARCHAR(50) NOT NULL DEFAULT 'APMC',
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    contact_phone VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 7. MARKET PRICE OBSERVATIONS (Verified Mandi Price Observations)
-- =============================================================================
CREATE TABLE IF NOT EXISTS market_price_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
    variety TEXT,
    grade TEXT DEFAULT 'FAQ',
    min_price NUMERIC(10,2) NOT NULL CHECK (min_price >= 0),
    max_price NUMERIC(10,2) NOT NULL CHECK (max_price >= min_price),
    modal_price NUMERIC(10,2) NOT NULL CHECK (modal_price >= min_price AND modal_price <= max_price),
    price_unit VARCHAR(20) NOT NULL DEFAULT 'INR/Quintal',
    observation_date DATE NOT NULL,
    source_name TEXT NOT NULL, -- 'data.gov.in', 'Agmarknet', 'Enam'
    source_record_id TEXT,
    is_live_api BOOLEAN NOT NULL DEFAULT false,
    data_freshness_status VARCHAR(20) NOT NULL DEFAULT 'historical' CHECK (data_freshness_status IN ('live', 'cached', 'historical', 'sample')),
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_market_comm_date_var UNIQUE (market_id, commodity_id, observation_date, variety)
);

-- =============================================================================
-- 8. ML MODELS (Model Metadata & Evaluation Metrics)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ml_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_identifier VARCHAR(100) NOT NULL,
    version VARCHAR(20) NOT NULL,
    algorithm VARCHAR(50) NOT NULL,
    training_period_start DATE NOT NULL,
    training_period_end DATE NOT NULL,
    mae NUMERIC(10,4),
    rmse NUMERIC(10,4),
    mape NUMERIC(10,4),
    hyperparameters JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 9. PRICE FORECASTS (Predictions for Horizons 1, 3, 7, 15, 30 days)
-- =============================================================================
CREATE TABLE IF NOT EXISTS price_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    model_id UUID REFERENCES ml_models(id) ON DELETE SET NULL,
    horizon_days INT NOT NULL CHECK (horizon_days IN (1, 3, 7, 15, 30)),
    target_date DATE NOT NULL,
    predicted_modal_price NUMERIC(10,2) NOT NULL CHECK (predicted_modal_price > 0),
    lower_bound NUMERIC(10,2),
    upper_bound NUMERIC(10,2),
    confidence_level NUMERIC(4,2) DEFAULT 0.90,
    uncertainty_notes TEXT,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 10. MARKET RECOMMENDATIONS (Explainable SELL / WAIT / PARTIAL_SELL)
-- =============================================================================
CREATE TABLE IF NOT EXISTS market_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    recommendation_action VARCHAR(20) NOT NULL CHECK (recommendation_action IN ('SELL', 'WAIT', 'PARTIAL_SELL')),
    rank INT NOT NULL,
    current_modal_price NUMERIC(10,2) NOT NULL,
    forecast_price NUMERIC(10,2),
    gross_revenue NUMERIC(12,2) NOT NULL,
    transport_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    handling_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    market_fees NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    storage_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    other_expenses NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    net_realization NUMERIC(12,2) NOT NULL,
    net_realization_per_unit NUMERIC(10,2) NOT NULL,
    weather_risk_assessment TEXT,
    explanation TEXT NOT NULL,
    assumptions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 11. WEATHER OBSERVATIONS & FORECASTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS weather_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    latitude NUMERIC(9,6) NOT NULL,
    longitude NUMERIC(9,6) NOT NULL,
    location_name TEXT,
    observation_time TIMESTAMPTZ NOT NULL,
    temperature_celsius NUMERIC(5,2),
    precipitation_mm NUMERIC(6,2),
    wind_speed_kmh NUMERIC(5,2),
    weather_condition TEXT,
    forecast_json JSONB,
    alerts_json JSONB,
    source_provider TEXT NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 12. SAVED MARKETS
-- =============================================================================
CREATE TABLE IF NOT EXISTS saved_markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    priority INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_farmer_saved_market UNIQUE (farmer_id, market_id)
);

-- =============================================================================
-- 13. PRICE ALERTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
    market_id UUID REFERENCES markets(id) ON DELETE CASCADE,
    target_min_price NUMERIC(10,2),
    target_max_price NUMERIC(10,2),
    condition VARCHAR(10) NOT NULL CHECK (condition IN ('ABOVE', 'BELOW')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 14. NOTIFICATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    title_en TEXT NOT NULL,
    title_hi TEXT,
    title_mr TEXT,
    message_en TEXT NOT NULL,
    message_hi TEXT,
    message_mr TEXT,
    notification_type VARCHAR(30) NOT NULL CHECK (notification_type IN ('PRICE_ALERT', 'WEATHER_ALERT', 'RECOMMENDATION', 'SYSTEM')),
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_farmer_id ON user_profiles(farmer_id);
CREATE INDEX IF NOT EXISTS idx_crops_farmer_status ON crops(farmer_id, status);
CREATE INDEX IF NOT EXISTS idx_mkt_prices_comm_market_date ON market_price_observations(commodity_id, market_id, observation_date DESC);
CREATE INDEX IF NOT EXISTS idx_mkt_prices_freshness ON market_price_observations(data_freshness_status);
CREATE INDEX IF NOT EXISTS idx_forecasts_comm_market_target ON price_forecasts(commodity_id, market_id, target_date);
CREATE INDEX IF NOT EXISTS idx_recommendations_farmer_created ON market_recommendations(farmer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_farmer_read ON notifications(farmer_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(commodity_id, is_active);

-- =============================================================================
-- AUTOMATIC TIMESTAMP UPDATE TRIGGER
-- =============================================================================
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
CREATE TRIGGER trg_farmer_settings_updated_at BEFORE UPDATE ON farmer_settings FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
CREATE TRIGGER trg_farms_updated_at BEFORE UPDATE ON farms FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
CREATE TRIGGER trg_crops_updated_at BEFORE UPDATE ON crops FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
CREATE TRIGGER trg_price_alerts_updated_at BEFORE UPDATE ON price_alerts FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE commodities ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_price_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 1. user_profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. farmer_settings policies
CREATE POLICY "Farmers can manage own settings" ON farmer_settings
    FOR ALL USING (farmer_id = auth.uid());

-- 3. farms policies
CREATE POLICY "Farmers can manage own farms" ON farms
    FOR ALL USING (farmer_id = auth.uid());

-- 4. crops policies
CREATE POLICY "Farmers can manage own crops" ON crops
    FOR ALL USING (farmer_id = auth.uid());

-- 5. commodities policies (public read, service-role write)
CREATE POLICY "Anyone can view commodities" ON commodities
    FOR SELECT USING (true);

-- 6. markets policies (public read, service-role write)
CREATE POLICY "Anyone can view markets" ON markets
    FOR SELECT USING (true);

-- 7. market_price_observations policies (public read, service-role write)
CREATE POLICY "Anyone can view market price observations" ON market_price_observations
    FOR SELECT USING (true);

-- 8. ml_models policies (public read, service-role write)
CREATE POLICY "Anyone can view ml models metadata" ON ml_models
    FOR SELECT USING (true);

-- 9. price_forecasts policies (public read, service-role write)
CREATE POLICY "Anyone can view price forecasts" ON price_forecasts
    FOR SELECT USING (true);

-- 10. market_recommendations policies (farmer specific)
CREATE POLICY "Farmers can view own recommendations" ON market_recommendations
    FOR SELECT USING (farmer_id = auth.uid());

-- 11. weather_observations policies (public read)
CREATE POLICY "Anyone can view weather observations" ON weather_observations
    FOR SELECT USING (true);

-- 12. saved_markets policies
CREATE POLICY "Farmers can manage saved markets" ON saved_markets
    FOR ALL USING (farmer_id = auth.uid());

-- 13. price_alerts policies
CREATE POLICY "Farmers can manage own price alerts" ON price_alerts
    FOR ALL USING (farmer_id = auth.uid());

-- 14. notifications policies
CREATE POLICY "Farmers can manage own notifications" ON notifications
    FOR ALL USING (farmer_id = auth.uid());
