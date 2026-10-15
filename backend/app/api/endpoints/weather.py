from datetime import date, datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Query
from app.models.schemas import (
    WeatherResponse,
    WeatherDailyForecast,
)
from app.services.weather_service import weather_service

router = APIRouter(prefix="/weather", tags=["Agricultural Weather & Transport Risks"])


@router.get("", response_model=WeatherResponse, summary="Get farm weather forecast and logistical risk indicators")
async def get_weather_forecast(
    latitude: float = Query(20.0063, description="Farm Latitude", ge=-90.0, le=90.0),
    longitude: float = Query(74.0022, description="Farm Longitude", ge=-180.0, le=180.0),
    location_name: Optional[str] = Query(None, description="Location name"),
):
    """
    Fetches real-time agro-weather from Open-Meteo with 7-day daily forecasts,
    transit moisture/wind hazards, and harvest risk levels.
    """
    return await weather_service.get_forecast(
        latitude=latitude,
        longitude=longitude,
        location_name=location_name,
    )
