from redis.asyncio import Redis, ConnectionPool
from functools import lru_cache
from src.api.config.settings import get_settings


@lru_cache()
def get_redis_pool() -> ConnectionPool:
    """
    Singleton connection pool — tạo 1 lần duy nhất.
    Pool quản lý nhiều connections hiệu quả hơn
    tạo mới mỗi request.
    """
    settings = get_settings()
    return ConnectionPool.from_url(
        url             = settings.REDIS_URL,
        max_connections = 20,
        decode_responses = True,   # tự decode bytes → str
    )


def get_redis_client() -> Redis:
    """
    Tạo Redis client từ pool.
    Gọi mỗi request — nhẹ vì dùng chung pool.
    """
    return Redis(connection_pool=get_redis_pool())