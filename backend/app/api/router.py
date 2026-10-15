from fastapi import APIRouter
from app.api.endpoints import (
    health,
    auth,
    farmer,
    crops,
    markets,
    forecasts,
    recommendations,
    calculator,
    weather,
    notifications,
    location,
    chat,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(farmer.router)
api_router.include_router(crops.router)
api_router.include_router(markets.router)
api_router.include_router(forecasts.router)
api_router.include_router(recommendations.router)
api_router.include_router(calculator.router)
api_router.include_router(weather.router)
api_router.include_router(notifications.router)
api_router.include_router(location.router)
api_router.include_router(chat.router)

