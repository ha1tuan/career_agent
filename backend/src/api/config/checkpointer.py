from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg_pool import AsyncConnectionPool
from src.api.config.settings import get_settings

_checkpointer: AsyncPostgresSaver | None = None
_pool: AsyncConnectionPool | None = None


async def get_connection_pool() -> AsyncConnectionPool:
    """
    Async connection pool cho AsyncPostgresSaver.
    Dùng psycopg3 async pool — tương thích với FastAPI async event loop.
    """
    global _pool
    if _pool is None:
        settings = get_settings()

        # Convert asyncpg URL → psycopg3 URL cho AsyncPostgresSaver
        db_url = settings.DATABASE_URL.replace(
            "postgresql+asyncpg://",
            "postgresql://",
        )

        print("🔌 Tạo async connection pool cho AsyncPostgresSaver...")
        _pool = AsyncConnectionPool(
            conninfo = db_url,
            max_size = 10,
            open     = False,  # Mở thủ công qua await pool.open()
        )
        await _pool.open()
        print("✅ Async connection pool ready")

    return _pool


def setup_checkpointer_tables() -> None:
    """
    Tạo checkpoint tables trong PostgreSQL.
    Dùng sync psycopg với autocommit=True vì CREATE INDEX CONCURRENTLY
    không thể chạy trong transaction block.
    Gọi 1 lần khi startup (sync, trước khi event loop async bắt đầu).
    """
    import psycopg
    settings = get_settings()
    db_url = settings.DATABASE_URL.replace(
        "postgresql+asyncpg://",
        "postgresql://",
    )
    print("🔧 Tạo checkpoint tables...")
    with psycopg.connect(db_url, autocommit=True) as conn:
        from langgraph.checkpoint.postgres import PostgresSaver
        PostgresSaver(conn).setup()
    print("✅ Checkpoint tables ready")


async def get_checkpointer() -> AsyncPostgresSaver:
    """
    Singleton AsyncPostgresSaver — dùng với async graph.astream().
    """
    global _checkpointer
    if _checkpointer is None:
        pool = await get_connection_pool()
        print("🔧 Khởi tạo AsyncPostgresSaver...")
        _checkpointer = AsyncPostgresSaver(pool)
        print("✅ AsyncPostgresSaver ready")
    return _checkpointer


async def close_checkpointer() -> None:
    """Đóng async pool khi shutdown app"""
    global _pool, _checkpointer
    if _pool:
        await _pool.close()
        _pool         = None
        _checkpointer = None
        print("👋 AsyncPostgresSaver đã đóng")