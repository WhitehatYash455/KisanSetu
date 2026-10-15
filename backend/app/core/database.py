import logging
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)


class SupabaseClientManager:
    """Manages connection to Supabase and provides helper methods."""

    def __init__(self):
        self._client = None

    @property
    def is_configured(self) -> bool:
        return bool(settings.SUPABASE_URL and (settings.SUPABASE_ANON_KEY or settings.SUPABASE_SERVICE_ROLE_KEY))

    def get_client(self):
        if not self.is_configured:
            logger.warning("Supabase credentials not configured. Running in unconfigured/mock mode.")
            return None
        
        if self._client is None:
            try:
                # Lazy import supabase if installed
                from supabase import create_client, Client
                key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
                self._client = create_client(settings.SUPABASE_URL, key)
                logger.info("Supabase client initialized successfully.")
            except ImportError:
                logger.warning("supabase-py library not installed, falling back to HTTP client.")
                self._client = None
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
                self._client = None

        return self._client


db_manager = SupabaseClientManager()
