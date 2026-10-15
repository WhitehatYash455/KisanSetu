from datetime import datetime, timezone
from fastapi import APIRouter
from app.core.config import settings
from app.core.database import db_manager

router = APIRouter(prefix="/health", tags=["Health & System Status"])


@router.get("", summary="Get system health and service status")
async def get_system_health():
    """
    Returns API health status, environment mode, active version,
    and external service connection status.
    """
    supabase_configured = db_manager.is_configured
    
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "status": "connected" if supabase_configured else "mock_or_unconfigured",
            "provider": "Supabase PostgreSQL"
        },
        "services": {
            "mandi_data_provider": "data.gov.in / Agmarknet (Verified)",
            "weather_provider": "Open-Meteo Agricultural API",
            "ml_engine": "scikit-learn / pandas chronological time-series"
        }
    }
