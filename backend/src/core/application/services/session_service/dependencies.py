from typing import override
from fastapi import Depends
from src.core.infrastructure.services.session_service import SessionService
from src.api.config.redis_client import get_redis_client


def get_session_service() -> SessionService:
    """
    SessionService inject Redis client.
    get_redis_client() dùng pool — không tạo connection mới.
    """
    return SessionService(
        redis_client=get_redis_client()
    )