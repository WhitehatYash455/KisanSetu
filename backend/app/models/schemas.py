from __future__ import annotations
from datetime import date, datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict


# =============================================================================
# ENUMS
# =============================================================================

class LanguageEnum(str, Enum):
    ENGLISH = "en"
    HINDI = "hi"
    MARATHI = "mr"


class CropStatusEnum(str, Enum):
    GROWING = "Growing"
    READY_TO_HARVEST = "Ready to Harvest"
    STORED = "Stored"
    PARTIALLY_SOLD = "Partially Sold"
    COMPLETED = "Completed"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            v_low = value.lower().replace("_", " ").replace("-", " ").strip()
            for member in cls:
                if member.value.lower() == v_low:
                    return member
        return None


class QuantityUnitEnum(str, Enum):
    QUINTAL = "Quintal"
    KG = "Kg"
    TONNE = "Tonne"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            v_low = value.lower().strip()
            if "quintal" in v_low:
                return cls.QUINTAL
            elif "kg" in v_low or "kilo" in v_low:
                return cls.KG
            elif "ton" in v_low:
                return cls.TONNE
        return None


class DataFreshnessStatusEnum(str, Enum):
    LIVE = "live"
    CACHED = "cached"
    HISTORICAL = "historical"
    SAMPLE = "sample"


class RecommendationActionEnum(str, Enum):
    SELL = "SELL"
    WAIT = "WAIT"
    PARTIAL_SELL = "PARTIAL_SELL"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            v_upper = value.upper().replace(" ", "_").strip()
            for member in cls:
                if member.name == v_upper or member.value == v_upper:
                    return member
        return None


class PriceConditionEnum(str, Enum):
    ABOVE = "ABOVE"
    BELOW = "BELOW"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            v_upper = value.upper().strip()
            for member in cls:
                if member.name == v_upper:
                    return member
        return None


class NotificationTypeEnum(str, Enum):
    PRICE_ALERT = "PRICE_ALERT"
    WEATHER_ALERT = "WEATHER_ALERT"
    RECOMMENDATION = "RECOMMENDATION"
    SYSTEM = "SYSTEM"


# =============================================================================
# FARMER PROFILE & SETTINGS SCHEMAS
# =============================================================================

class FarmerProfileBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    phone_number: Optional[str] = Field(None, pattern=r"^\+?[0-9]{10,14}$")
    preferred_language: LanguageEnum = Field(default=LanguageEnum.ENGLISH)
    state: Optional[str] = None
    district: Optional[str] = None
    sub_district: Optional[str] = None
    village: Optional[str] = None
    pincode: Optional[str] = Field(None, pattern=r"^[1-9][0-9]{5}$")


class FarmerProfileCreate(FarmerProfileBase):
    pass


class FarmerProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone_number: Optional[str] = Field(None, pattern=r"^\+?[0-9]{10,14}$")
    preferred_language: Optional[LanguageEnum] = None
    state: Optional[str] = None
    district: Optional[str] = None
    sub_district: Optional[str] = None
    village: Optional[str] = None
    pincode: Optional[str] = Field(None, pattern=r"^[1-9][0-9]{5}$")


class FarmerProfileResponse(FarmerProfileBase):
    id: str
    farmer_id: str  # Opaque non-sequential ID, e.g. AGRI-9M2K-7P4W
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FarmerSettingsUpdate(BaseModel):
    theme_preference: Optional[str] = Field(None, pattern="^(light|dark)$")
    notification_sms: Optional[bool] = None
    notification_push: Optional[bool] = None
    notification_whatsapp: Optional[bool] = None
    preferred_distance_unit: Optional[str] = Field(None, pattern="^(km|mi)$")


class FarmerSettingsResponse(BaseModel):
    id: str
    farmer_id: str
    theme_preference: str = "light"
    notification_sms: bool = False
    notification_push: bool = True
    notification_whatsapp: bool = False
    preferred_distance_unit: str = "km"
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# FARM SCHEMAS
# =============================================================================

class FarmCreate(BaseModel):
    farm_name: str = Field(..., min_length=1, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    address: Optional[str] = None
    total_acreage: float = Field(..., gt=0.0)
    soil_type: Optional[str] = None
    irrigation_type: Optional[str] = None


class FarmResponse(FarmCreate):
    id: str
    farmer_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FarmUpdate(BaseModel):
    farm_name: Optional[str] = Field(None, min_length=1, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    address: Optional[str] = None
    total_acreage: Optional[float] = Field(None, gt=0.0)
    soil_type: Optional[str] = None
    irrigation_type: Optional[str] = None


# =============================================================================
# CROP SCHEMAS
# =============================================================================

class CropCreate(BaseModel):
    crop_name: str = Field(..., min_length=1, max_length=100)
    commodity_id: Optional[str] = None
    farm_id: Optional[str] = None
    farm_location: Optional[str] = None
    variety: Optional[str] = None
    acreage: float = Field(..., gt=0.0)
    quantity: float = Field(..., ge=0.0)
    quantity_unit: QuantityUnitEnum = Field(default=QuantityUnitEnum.QUINTAL)
    sowing_date: date
    expected_harvest_date: date
    actual_harvest_date: Optional[date] = None
    status: CropStatusEnum = Field(default=CropStatusEnum.GROWING)
    notes: Optional[str] = None
    aliases: Optional[Dict[str, str]] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_dates(self):
        if self.expected_harvest_date < self.sowing_date:
            raise ValueError("Expected harvest date cannot be earlier than sowing date")
        if self.actual_harvest_date and self.actual_harvest_date < self.sowing_date:
            raise ValueError("Actual harvest date cannot be earlier than sowing date")
        return self


class CropUpdate(BaseModel):
    crop_name: Optional[str] = Field(None, min_length=1, max_length=100)
    commodity_id: Optional[str] = None
    farm_id: Optional[str] = None
    farm_location: Optional[str] = None
    variety: Optional[str] = None
    acreage: Optional[float] = Field(None, gt=0.0)
    quantity: Optional[float] = Field(None, ge=0.0)
    quantity_unit: Optional[QuantityUnitEnum] = None
    sowing_date: Optional[date] = None
    expected_harvest_date: Optional[date] = None
    actual_harvest_date: Optional[date] = None
    status: Optional[CropStatusEnum] = None
    notes: Optional[str] = None
    aliases: Optional[Dict[str, str]] = None

    @model_validator(mode="after")
    def validate_update_dates(self):
        if self.sowing_date and self.expected_harvest_date and self.expected_harvest_date < self.sowing_date:
            raise ValueError("Expected harvest date cannot be earlier than sowing date")
        if self.sowing_date and self.actual_harvest_date and self.actual_harvest_date < self.sowing_date:
            raise ValueError("Actual harvest date cannot be earlier than sowing date")
        return self


class CropResponse(BaseModel):
    id: str
    crop_code: str  # Consistent opaque readable ID (e.g. CROP-8K2M-4P9L)
    farmer_id: str
    farm_id: Optional[str] = None
    farm_location: Optional[str] = None
    commodity_id: Optional[str] = None
    crop_name: str
    variety: Optional[str] = None
    acreage: float
    quantity: float
    quantity_unit: QuantityUnitEnum
    sowing_date: date
    expected_harvest_date: date
    actual_harvest_date: Optional[date] = None
    status: CropStatusEnum
    notes: Optional[str] = None
    aliases: Dict[str, str] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# COMMODITY & MARKET SCHEMAS
# =============================================================================

class CommodityResponse(BaseModel):
    id: str
    code: str
    name_en: str
    name_hi: str
    name_mr: str
    category: str
    standard_unit: str = "Quintal"


class MarketResponse(BaseModel):
    id: str
    code: str
    name: str
    state: str
    district: str
    market_type: str = "APMC"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_phone: Optional[str] = None
    distance_km: Optional[float] = None


# =============================================================================
# MARKET PRICE OBSERVATIONS SCHEMAS
# =============================================================================

class MarketPriceObservationResponse(BaseModel):
    id: str
    market_id: str
    market_name: str
    market_state: str
    market_district: str
    commodity_id: str
    commodity_name: str
    variety: Optional[str] = None
    grade: Optional[str] = "FAQ"
    min_price: float
    max_price: float
    modal_price: float
    price_unit: str = "INR/Quintal"
    observation_date: date
    source_name: str
    is_live_api: bool
    data_freshness_status: DataFreshnessStatusEnum
    distance_km: Optional[float] = None
    created_at: datetime


class MarketPriceQuery(BaseModel):
    commodity_code: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    market_id: Optional[str] = None
    limit: int = Field(default=20, ge=1, le=100)


class HistoricalPricePoint(BaseModel):
    date: str
    modal_price: float
    min_price: float
    max_price: float
    volume_arrivals_quintals: float
    source: str
    freshness: str


class MarketCompareItem(BaseModel):
    market_id: str
    market_name: str
    district: str
    state: str
    distance_km: Optional[float] = None
    modal_price: float
    min_price: float
    max_price: float
    price_spread: float
    freshness: DataFreshnessStatusEnum
    observation_date: date
    source: str


class MarketCompareResponse(BaseModel):
    commodity_name: str
    best_market_by_price: str
    cheapest_market_by_price: str
    price_differential: float
    markets_compared: List[MarketCompareItem]
    observation_timestamp: datetime



# =============================================================================
# PRICE FORECAST SCHEMAS
# =============================================================================

class ForecastRequest(BaseModel):
    commodity_id: str
    market_id: str
    horizon_days: int = Field(..., description="Forecast horizon in days (1, 3, 7, 15, or 30)")

    @field_validator("horizon_days")
    @classmethod
    def validate_horizon(cls, v: int) -> int:
        if v not in [1, 3, 7, 15, 30]:
            raise ValueError("Horizon must be one of: 1, 3, 7, 15, 30 days")
        return v


class ForecastPoint(BaseModel):
    horizon_days: int
    target_date: date
    predicted_modal_price: float
    lower_bound: float
    upper_bound: float
    confidence_level: float = 0.90
    uncertainty_notes: str
    arima_price: Optional[float] = None
    lstm_price: Optional[float] = None
    hybrid_price: Optional[float] = None


class ForecastResponse(BaseModel):
    commodity_id: str
    commodity_name: str
    market_id: str
    market_name: str
    current_modal_price: Optional[float] = None
    forecasts: List[ForecastPoint]
    model_version: str
    model_algorithm: str
    training_period: str
    metrics: Dict[str, float]  # MAE, RMSE
    model_decomposition: Optional[Dict[str, Any]] = None
    hybrid_weights: Optional[Dict[str, float]] = None
    generated_at: datetime
    data_sufficiency_status: str = "sufficient"
    disclaimer: str = (
        "Price forecasts are statistical estimates based on historical mandi patterns and "
        "must not be interpreted as guaranteed selling prices. Unforeseen weather events, local "
        "arrivals, and policy shifts can alter actual market realizations."
    )


# =============================================================================
# PROFIT & SELLING COST CALCULATOR SCHEMAS
# =============================================================================

class ProfitCalculatorRequest(BaseModel):
    crop_name: str
    quantity: float = Field(..., gt=0.0)
    quantity_unit: QuantityUnitEnum = QuantityUnitEnum.QUINTAL
    selling_price_per_unit: float = Field(..., gt=0.0)
    transport_cost: float = Field(default=0.0, ge=0.0)
    loading_unloading_cost: float = Field(default=0.0, ge=0.0)
    market_fees: float = Field(default=0.0, ge=0.0)
    storage_cost: float = Field(default=0.0, ge=0.0)
    other_expenses: float = Field(default=0.0, ge=0.0)
    include_market_comparisons: bool = Field(default=False)
    farmer_latitude: Optional[float] = None
    farmer_longitude: Optional[float] = None


class ProfitCalculatorResponse(BaseModel):
    crop_name: str
    quantity_sold: float
    quantity_unit: QuantityUnitEnum
    gross_revenue: float
    total_selling_expenses: float
    net_realization: float
    net_realization_per_unit: float
    expense_breakdown: Dict[str, float]
    profit_margin_percentage: float
    market_comparisons: Optional[List[Dict[str, Any]]] = None


# =============================================================================
# MARKET RECOMMENDATION SCHEMAS
# =============================================================================

class MarketRecommendationItem(BaseModel):
    market_id: str
    market_name: str
    market_district: str
    market_state: str
    distance_km: float
    current_modal_price: float
    forecast_modal_price: Optional[float] = None
    expected_gross_revenue: float
    estimated_transport_cost: float
    estimated_market_fees: float
    estimated_handling_cost: float
    estimated_storage_cost: float
    other_expenses: float
    expected_net_realization: float
    net_realization_per_unit: float
    weather_risk: Optional[str] = None
    data_freshness: DataFreshnessStatusEnum
    rank: int
    recommendation_action: RecommendationActionEnum
    explanation: str
    assumptions: Dict[str, Any]


class RecommendationResponse(BaseModel):
    crop_id: Optional[str] = None
    crop_name: str
    quantity: float
    quantity_unit: QuantityUnitEnum
    overall_action: RecommendationActionEnum
    top_recommendation_summary: str
    eligible_markets: List[MarketRecommendationItem]
    change_factors: List[str]
    generated_at: datetime
    data_sufficiency: str = "sufficient"


# =============================================================================
# WEATHER SCHEMAS
# =============================================================================

class WeatherDailyForecast(BaseModel):
    date: date
    temp_max_c: float
    temp_min_c: float
    precipitation_probability: float
    condition: str
    harvest_risk_level: str  # Low, Moderate, High
    transport_risk_level: str  # Low, Moderate, High


class WeatherResponse(BaseModel):
    location_name: str
    latitude: float
    longitude: float
    current_temperature_c: float
    current_humidity_pct: float
    current_precipitation_mm: float
    wind_speed_kmh: float
    condition: str
    active_alerts: List[str]
    forecast_days: List[WeatherDailyForecast]
    source_provider: str
    updated_at: datetime


# =============================================================================
# NOTIFICATION & ALERT SCHEMAS
# =============================================================================

class PriceAlertCreate(BaseModel):
    commodity_id: str
    market_id: Optional[str] = None
    target_price: float = Field(..., gt=0.0)
    condition: PriceConditionEnum


class PriceAlertResponse(BaseModel):
    id: str
    farmer_id: str
    commodity_id: str
    market_id: Optional[str] = None
    target_price: float
    condition: PriceConditionEnum
    is_active: bool
    created_at: datetime


class NotificationResponse(BaseModel):
    id: str
    farmer_id: str
    title_en: str
    title_hi: Optional[str] = None
    title_mr: Optional[str] = None
    message_en: str
    message_hi: Optional[str] = None
    message_mr: Optional[str] = None
    notification_type: NotificationTypeEnum
    is_read: bool
    metadata: Dict[str, Any]
    created_at: datetime


class DashboardSummaryResponse(BaseModel):
    farmer_profile: FarmerProfileResponse
    settings: FarmerSettingsResponse
    total_farms: int
    total_acreage: float
    total_crops: int
    crops_by_status: Dict[str, int]
    unread_notifications_count: int
    active_price_alerts_count: int
    recommended_action_summary: Optional[str] = None


# =============================================================================
# EXTERNAL MAPS & ROUTE SCHEMAS
# =============================================================================

class MarketRouteResponse(BaseModel):
    market_id: str
    market_name: str
    origin_latitude: float
    origin_longitude: float
    destination_latitude: float
    destination_longitude: float
    road_distance_km: float
    straight_line_distance_km: float
    estimated_duration_minutes: float
    estimated_diesel_cost: float
    estimated_toll_cost: float
    estimated_hamali_cost: float
    total_transport_cost: float
    route_geometry: Optional[List[List[float]]] = None  # [[lat, lon], ...]
    routing_provider: str = "OSRM (OpenStreetMap)"
    road_condition_risk: str = "Low"


# =============================================================================
# SMS GATEWAY & NOTIFICATION DISPATCH SCHEMAS
# =============================================================================

class SMSRequest(BaseModel):
    phone_number: str = Field(..., pattern=r"^\+?[0-9]{10,14}$")
    message_type: str = "PRICE_ALERT"  # PRICE_ALERT, RECOMMENDATION, WEATHER_ALERT, CUSTOM
    language: str = "en"  # en, hi, mr
    crop_name: Optional[str] = None
    market_name: Optional[str] = None
    price: Optional[float] = None
    custom_text: Optional[str] = None


class SMSResponse(BaseModel):
    success: bool
    message_id: str
    recipient_phone: str
    message_body: str
    provider: str  # "Twilio", "Fast2SMS", "KrishiSetu Live SMS Simulator"
    delivery_status: str  # "DELIVERED", "QUEUED", "SENT", "FAILED"
    character_count: int
    dispatched_at: datetime


class SMSLogItem(BaseModel):
    id: str
    farmer_id: str
    phone_number: str
    message_body: str
    language: str
    message_type: str
    provider: str
    delivery_status: str
    created_at: datetime


class WhatsAppRequest(BaseModel):
    phone_number: str = Field(..., pattern=r"^\+?[0-9]{10,14}$")
    crop_name: Optional[str] = "Onion"
    market_name: Optional[str] = "Pune APMC"
    price: Optional[float] = 3594.90
    language: str = "en"  # en, hi, mr
    distance_km: Optional[float] = None
    custom_text: Optional[str] = None


class WhatsAppResponse(BaseModel):
    success: bool
    message_id: str
    recipient_phone: str
    message_body: str
    provider: str
    delivery_status: str
    direct_whatsapp_url: str
    dispatched_at: datetime


# =============================================================================
# MASTER IMPLEMENTATION SCHEMAS: NEARBY DISCOVERY, GEOCODING & DATA STATUS
# =============================================================================

class ReverseGeocodeRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)


class ReverseGeocodeResponse(BaseModel):
    latitude: float
    longitude: float
    display_name: str
    village: Optional[str] = None
    taluka: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    postcode: Optional[str] = None
    provider: str
    status: str


class NearbyMandiItem(BaseModel):
    market_id: str
    market_code: str
    market_name: str
    district: str
    state: str
    latitude: float
    longitude: float
    straight_line_distance_km: float
    road_distance_km: Optional[float] = None
    estimated_travel_minutes: Optional[float] = None
    directions_url: str
    latest_modal_price: Optional[float] = None
    price_unit: str = "INR/Quintal"
    observation_date: Optional[date] = None
    data_freshness_status: Optional[DataFreshnessStatusEnum] = None
    estimated_transport_cost: Optional[float] = None
    estimated_net_proceeds: Optional[float] = None
    net_proceeds_per_quintal: Optional[float] = None
    supported_commodities: List[str] = Field(default_factory=list)


class NearbyMandisResponse(BaseModel):
    farmer_latitude: float
    farmer_longitude: float
    search_radius_km: float
    commodity_id: Optional[str] = None
    total_mandis_found: int
    mandis: List[NearbyMandiItem]
    best_net_profit_market: Optional[str] = None
    nearest_market: Optional[str] = None
    highest_price_market: Optional[str] = None
    recommendation_explanation: Optional[str] = None


class DataSourceHealth(BaseModel):
    source_name: str
    official_url: str
    status: str
    update_frequency: str
    requires_key: bool
    last_sync_timestamp: Optional[str] = None
    records_ingested: int


class SystemDataStatusResponse(BaseModel):
    system_status: str
    current_date: date
    total_active_prices: int
    official_sources: List[DataSourceHealth]
    verified_markets_count: int
    supported_commodities_count: int
    auto_sync_interval: str


# =============================================================================
# AUTHENTICATION SCHEMAS
# =============================================================================

class FarmerRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="Farmer's full name")
    identifier: str = Field(..., min_length=4, max_length=100, description="Mobile number or email address")
    password: str = Field(..., min_length=6, max_length=128, description="Account password (min 6 chars)")
    otp_code: Optional[str] = Field(None, min_length=4, max_length=8, description="6-digit mobile verification code")
    phone_number: Optional[str] = Field(None, description="Primary mobile contact")
    email: Optional[str] = Field(None, description="Optional email address")
    preferred_language: LanguageEnum = Field(default=LanguageEnum.ENGLISH)
    state: Optional[str] = Field(default="Maharashtra")
    district: Optional[str] = Field(None)
    sub_district: Optional[str] = Field(None)
    village: Optional[str] = Field(None)
    pincode: Optional[str] = Field(None)
    total_acreage: Optional[float] = Field(default=0.0, ge=0.0)


class FarmerLoginRequest(BaseModel):
    identifier: str = Field(..., min_length=3, max_length=100, description="Registered mobile number or email")
    password: str = Field(..., min_length=1, max_length=128, description="Account password")


class AuthUserResponse(BaseModel):
    id: str
    identifier: str
    email: Optional[str] = None
    phone: Optional[str] = None
    full_name: str
    role: str = "authenticated"


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUserResponse
    profile: FarmerProfileResponse
    message: Optional[str] = None


class OTPRequest(BaseModel):
    identifier: str = Field(..., min_length=3, max_length=100, description="Farmer mobile number or email")
    purpose: str = Field(default="login", pattern="^(login|forgot_password|register|verify)$", description="OTP purpose: login, forgot_password, register, or verify")


class OTPLoginRequest(BaseModel):
    identifier: str = Field(..., min_length=3, max_length=100, description="Farmer mobile number or email")
    otp_code: str = Field(..., min_length=4, max_length=8, description="6-digit verification code")


class ResetPasswordRequest(BaseModel):
    identifier: str = Field(..., min_length=3, max_length=100, description="Farmer mobile number or email")
    otp_code: str = Field(..., min_length=4, max_length=8, description="6-digit verification code")
    new_password: str = Field(..., min_length=6, max_length=128, description="New account password (min 6 chars)")


class OTPResponse(BaseModel):
    message: str
    identifier: str
    purpose: str
    expires_in_seconds: int = 600
    simulated_otp: Optional[str] = None

