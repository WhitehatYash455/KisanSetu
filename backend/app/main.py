import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.router import api_router
from app.services.daily_sync_service import daily_sync_service

logger = logging.getLogger(__name__)


async def _periodic_daily_sync_worker():
    """Background loop that periodically executes daily mandi sync every 6 hours."""
    while True:
        try:
            await asyncio.sleep(6 * 3600)  # check every 6 hours
            logger.info("Executing scheduled daily mandi price sync...")
            daily_sync_service.sync_daily_prices()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in background mandi sync worker: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: execute immediate sync to ensure today's date has fresh prices
    try:
        daily_sync_service.sync_daily_prices()
    except Exception as e:
        logger.error(f"Initial daily mandi sync failed: {e}")

    worker_task = asyncio.create_task(_periodic_daily_sync_worker())
    yield
    # Shutdown
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description=(
        "Production-grade Backend API for the Farmer Price Prediction & Market Recommendation System. "
        "Provides verified Indian mandi prices, machine-learning forecasting (1, 3, 7, 15, 30 days), "
        "explainable market selling recommendations, crop lifecycle management, and agricultural weather alerts."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|172\.[0-9]+|192\.168\.[0-9]+)(:[0-9]+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_private_network_access_header(request: Request, call_next):
    response = await call_next(request)
    if request.headers.get("access-control-request-private-network"):
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

# Mount API V1 router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "version": settings.PROJECT_VERSION,
        "docs": "/docs",
        "api_prefix": settings.API_V1_PREFIX,
        "status": "online",
    }


@app.get(f"{settings.API_V1_PREFIX}/data-status", tags=["System Transparency"])
async def data_status_alias():
    """Top-level alias for data status and official sources transparency."""
    from app.api.endpoints.markets import get_system_data_status
    return await get_system_data_status()



from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=getattr(exc, "headers", None),
        )
    logger.error(f"Unhandled exception at {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc) if settings.ENVIRONMENT == "development" else "An unexpected error occurred.",
            "path": request.url.path,
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
