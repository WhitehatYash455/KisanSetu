import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Application configuration settings loaded from environment or defaults."""
    
    ENVIRONMENT: str = Field(default="development", description="Environment mode: development, staging, production")
    PORT: int = Field(default=8000, description="FastAPI server port")
    HOST: str = Field(default="0.0.0.0", description="FastAPI server host")
    API_V1_PREFIX: str = Field(default="/api/v1", description="API V1 router prefix")
    PROJECT_NAME: str = Field(default="Farmer Price Prediction & Market Recommendation API")
    PROJECT_VERSION: str = Field(default="1.0.0")
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000"],
        description="Allowed CORS origins"
    )

    # Authentication & Security
    SECRET_KEY: str = Field(
        default="krishisetu-secure-farmer-portal-secret-key-2026-auth",
        description="JWT secret key for encoding and decoding farmer tokens"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=60 * 24 * 7,
        description="Access token expiration in minutes (default 7 days)"
    )
    SQLITE_DB_PATH: str = Field(
        default="data/krishisetu.db",
        description="Path to local persistent SQLite database"
    )

    # Supabase Configuration
    SUPABASE_URL: str = Field(default="", description="Supabase project URL")
    SUPABASE_ANON_KEY: str = Field(default="", description="Supabase anonymous public key")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="", description="Supabase service role secret key")
    SUPABASE_JWT_SECRET: str = Field(default="", description="Supabase JWT secret for token verification")

    # Mandi Price Data API (data.gov.in / Agmarknet)
    DATA_GOV_IN_API_KEY: str = Field(default="", description="data.gov.in API key")
    DATA_GOV_IN_RESOURCE_ID: str = Field(default="9ef84268-d588-465a-a308-a864a43d0070", description="Resource ID for Mandi Prices")

    # Weather API (Open-Meteo or IMD / WeatherAPI)
    WEATHER_API_KEY: str = Field(default="", description="Weather service API key if required")
    WEATHER_API_BASE_URL: str = Field(default="https://api.open-meteo.com/v1", description="Weather API Base URL")

    # ML & Recommendation Engine Settings
    FORECAST_CONFIDENCE_INTERVAL: float = Field(default=0.90, description="Default confidence interval for forecasts")
    DEFAULT_TRANSPORT_COST_PER_KM_QUINTAL: float = Field(default=0.75, description="Estimated INR transport per km per quintal")

    # SMS Gateway Configuration (Twilio / Fast2SMS / Simulated Fallback)
    TWILIO_ACCOUNT_SID: str = Field(default="", description="Twilio Account SID")
    TWILIO_AUTH_TOKEN: str = Field(default="", description="Twilio Auth Token")
    TWILIO_FROM_PHONE_NUMBER: str = Field(default="", description="Twilio sender phone number")
    FAST2SMS_API_KEY: str = Field(default="", description="Fast2SMS Indian API Key")
    ENABLE_LIVE_SMS_SIMULATOR: bool = Field(default=True, description="Enable simulated instant SMS delivery logger")

    # WhatsApp Cloud API Configuration (Meta Graph API v20.0)
    WHATSAPP_PHONE_NUMBER_ID: str = Field(default="", description="Meta WhatsApp Business Phone Number ID")
    WHATSAPP_ACCESS_TOKEN: str = Field(default="", description="Meta WhatsApp Cloud API Access Token")
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = Field(default="", description="Meta WhatsApp Business Account ID")

    # External Maps & Routing API (OSRM OpenStreetMap / Google Maps)
    OSRM_ROUTING_URL: str = Field(default="https://router.project-osrm.org", description="OSRM routing server URL")
    GOOGLE_MAPS_API_KEY: str = Field(default="", description="Google Maps API Key for Distance Matrix / Directions")

    # Email SMTP Configuration (Real OTP Dispatch via Gmail / Custom SMTP)
    SMTP_HOST: str = Field(default="smtp.gmail.com", description="SMTP host server")
    SMTP_PORT: int = Field(default=587, description="SMTP port (587 TLS or 465 SSL)")
    SMTP_USER: str = Field(default="", description="SMTP username / email address")
    SMTP_PASSWORD: str = Field(default="", description="SMTP password or Gmail App Password")
    SMTP_FROM_NAME: str = Field(default="KrishiSetu | कृषीसेतू", description="Sender display name")
    SMTP_FROM_EMAIL: str = Field(default="", description="Sender email address")
    SMTP_USE_TLS: bool = Field(default=True, description="Whether to use STARTTLS for SMTP")
    
    # OTP Real Delivery Toggle
    ENABLE_OTP_SIMULATION: bool = Field(default=False, description="Expose simulated OTP in responses (False = Real OTP only)")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
