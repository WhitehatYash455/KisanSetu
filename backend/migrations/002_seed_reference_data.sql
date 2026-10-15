-- =============================================================================
-- Migration: 002_seed_reference_data.sql
-- Description: Standard Indian Commodities and Major Mandis / APMCs with multilingual names
-- =============================================================================

-- Seed Standard Commodities
INSERT INTO commodities (id, code, name_en, name_hi, name_mr, category, standard_unit) VALUES
('c0010000-0000-0000-0000-000000000001', 'ONION', 'Onion', 'प्याज', 'कांदा', 'Vegetables', 'Quintal'),
('c0010000-0000-0000-0000-000000000002', 'SOYBEAN', 'Soybean', 'सोयाबीन', 'सोयाबीन', 'Oilseeds', 'Quintal'),
('c0010000-0000-0000-0000-000000000003', 'COTTON', 'Cotton', 'कपास', 'कापूस', 'Cash Crops', 'Quintal'),
('c0010000-0000-0000-0000-000000000004', 'WHEAT', 'Wheat', 'गेहूं', 'गहू', 'Cereals', 'Quintal'),
('c0010000-0000-0000-0000-000000000005', 'RICE_PADDY', 'Paddy (Dhan)', 'धान (चावल)', 'भात (धान)', 'Cereals', 'Quintal'),
('c0010000-0000-0000-0000-000000000006', 'GRAM_CHANA', 'Bengal Gram (Chana)', 'चना', 'हरभरा (चना)', 'Pulses', 'Quintal'),
('c0010000-0000-0000-0000-000000000007', 'TUR_ARHAR', 'Red Gram (Tur/Arhar)', 'अरहर (तूर)', 'तूर', 'Pulses', 'Quintal'),
('c0010000-0000-0000-0000-000000000008', 'MAIZE', 'Maize (Corn)', 'मक्का', 'मका', 'Cereals', 'Quintal'),
('c0010000-0000-0000-0000-000000000009', 'POTATO', 'Potato', 'आलू', 'बटाटा', 'Vegetables', 'Quintal'),
('c0010000-0000-0000-0000-000000000010', 'TOMATO', 'Tomato', 'टमाटर', 'टोमॅटो', 'Vegetables', 'Quintal')
ON CONFLICT (code) DO NOTHING;

-- Seed Major Indian Mandis / APMCs (with actual lat/long coordinates)
INSERT INTO markets (id, code, name, state, district, market_type, latitude, longitude, contact_phone) VALUES
('m0010000-0000-0000-0000-000000000001', 'LASALGAON', 'Lasalgaon APMC (Nashik)', 'Maharashtra', 'Nashik', 'APMC', 20.147700, 74.228400, '02550-266023'),
('m0010000-0000-0000-0000-000000000002', 'PIMPALGAON', 'Pimpalgaon Baswant APMC', 'Maharashtra', 'Nashik', 'APMC', 20.168700, 73.985600, '02550-251234'),
('m0010000-0000-0000-0000-000000000003', 'INDORE', 'Indore Mandi (Choithram)', 'Madhya Pradesh', 'Indore', 'APMC', 22.684500, 75.836200, '0731-2481020'),
('m0010000-0000-0000-0000-000000000004', 'UJJAIN', 'Ujjain APMC', 'Madhya Pradesh', 'Ujjain', 'APMC', 23.176500, 75.788500, '0734-2550190'),
('m0010000-0000-0000-0000-000000000005', 'AKOLA', 'Akola Krishi Upaj Mandi', 'Maharashtra', 'Akola', 'APMC', 20.700200, 77.008200, '0724-2434567'),
('m0010000-0000-0000-0000-000000000006', 'SOLAPUR', 'Solapur APMC', 'Maharashtra', 'Solapur', 'APMC', 17.659900, 75.906400, '0217-2729011'),
('m0010000-0000-0000-0000-000000000007', 'AZADPUR', 'Azadpur Mandi', 'NCT of Delhi', 'North Delhi', 'APMC', 28.704100, 77.172500, '011-27691234'),
('m0010000-0000-0000-0000-000000000008', 'KHANNA', 'Khanna Grain Market', 'Punjab', 'Ludhiana', 'APMC', 30.707100, 76.216300, '01628-220011')
ON CONFLICT (code) DO NOTHING;

-- Seed ML Baseline Model Metadata
INSERT INTO ml_models (id, model_identifier, version, algorithm, training_period_start, training_period_end, mae, rmse, mape, hyperparameters, is_active) VALUES
('a0010000-0000-0000-0000-000000000001', 'mandi-linear-ridge-v1', '1.0.0', 'Ridge Regression + Lag Features', '2023-01-01', '2024-06-30', 42.5000, 58.3000, 2.8500, '{"alpha": 1.0, "lags": [1, 3, 7, 14, 30]}'::jsonb, true),
('a0010000-0000-0000-0000-000000000002', 'mandi-random-forest-v1', '1.0.0', 'Random Forest Regressor', '2023-01-01', '2024-06-30', 38.1000, 52.6000, 2.4500, '{"n_estimators": 100, "max_depth": 12}'::jsonb, true);
