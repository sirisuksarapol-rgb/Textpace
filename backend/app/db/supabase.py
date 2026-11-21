from functools import lru_cache
from supabase import Client, create_client
from app.core.config import get_settings


@lru_cache
def get_supabase_admin() -> Client:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError(
            "กรุณาตั้งค่า SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ในไฟล์ .env ก่อนใช้งาน"
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)