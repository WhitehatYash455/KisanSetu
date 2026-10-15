import os
import re
import pytest

MIGRATION_PATH = os.path.join(os.path.dirname(__file__), "..", "migrations", "001_initial_schema.sql")
SEED_PATH = os.path.join(os.path.dirname(__file__), "..", "migrations", "002_seed_reference_data.sql")

EXPECTED_TABLES = [
    "user_profiles",
    "farmer_settings",
    "farms",
    "commodities",
    "crops",
    "markets",
    "market_price_observations",
    "ml_models",
    "price_forecasts",
    "market_recommendations",
    "weather_observations",
    "saved_markets",
    "price_alerts",
    "notifications"
]


def test_migration_file_exists():
    assert os.path.exists(MIGRATION_PATH), "001_initial_schema.sql does not exist"
    assert os.path.exists(SEED_PATH), "002_seed_reference_data.sql does not exist"


def test_all_14_tables_defined():
    with open(MIGRATION_PATH, "r", encoding="utf-8") as f:
        sql = f.read()

    for table in EXPECTED_TABLES:
        pattern = rf"CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?{table}\b"
        match = re.search(pattern, sql, re.IGNORECASE)
        assert match is not None, f"Table '{table}' not found in 001_initial_schema.sql"


def test_all_tables_have_rls_enabled():
    with open(MIGRATION_PATH, "r", encoding="utf-8") as f:
        sql = f.read()

    for table in EXPECTED_TABLES:
        pattern = rf"ALTER\s+TABLE\s+{table}\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY"
        match = re.search(pattern, sql, re.IGNORECASE)
        assert match is not None, f"RLS not enabled for table '{table}' in 001_initial_schema.sql"


def test_seed_data_contains_commodities_and_markets():
    with open(SEED_PATH, "r", encoding="utf-8") as f:
        sql = f.read()

    assert "INSERT INTO commodities" in sql
    assert "INSERT INTO markets" in sql
    assert "INSERT INTO ml_models" in sql
    assert "ONION" in sql
    assert "SOYBEAN" in sql
    assert "LASALGAON" in sql
