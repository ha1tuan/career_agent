import json
from typing import Optional, override
from uuid import UUID

from redis.asyncio import Redis

from src.core.application.services.session_service.i_session_service import ISessionService


class SessionService(ISessionService):
    """
    Lưu session metadata (user_id, cv_id) vào Redis.
    State đầy đủ được đọc từ PostgresSaver qua graph.get_state().
    """

    def __init__(self, redis_client: Redis):
        self._redis = redis_client

    @staticmethod
    def _key(session_id: str) -> str:
        return f"agent_session:{session_id}"

    @staticmethod
    def _progress_key(session_id: str) -> str:
        return f"agent_progress:{session_id}"

    @override
    async def save_metadata(
        self,
        session_id: str,
        user_id:    str,
        cv_id:      str,
        ttl:        int = 86400,
    ) -> None:
        await self._redis.setex(
            name  = self._key(session_id),
            time  = ttl,
            value = json.dumps({"user_id": user_id, "cv_id": cv_id}),
        )

    @override
    async def get_metadata(self, session_id: str) -> Optional[dict]:
        raw = await self._redis.get(self._key(session_id))
        if not raw:
            return None
        return json.loads(raw)

    @override
    async def delete_metadata(self, session_id: str) -> None:
        await self._redis.delete(self._key(session_id))

    @override
    async def create_session_id(self, user_id: UUID, cv_id: UUID) -> str:
        user_short = str(user_id).replace("-", "")[:8]
        cv_short   = str(cv_id).replace("-", "")[:8]
        return f"agent_{user_short}_{cv_short}"

    @override
    async def ping(self) -> bool:
        try:
            result = await self._redis.ping()  # type: ignore[misc]
            return bool(result)
        except Exception:
            return False

    @override
    async def restore_from_db(
        self,
        session_id: str,
        user_id:    str,
        cv_id:      str,
        ttl:        int = 86400,
    ) -> None:
        """
        Tái tạo Redis key từ DB khi hết TTL.
        Cache-Aside pattern.
        """
        await self.create(session_id, user_id, cv_id, ttl)
        print(f"♻️  Redis restored: {session_id}")

    # ── Progress ──────────────────────────────────
    @override
    async def set_progress(
        self,
        session_id: str,
        message:    str,
        ttl:        int = 300,   # 5 phút
    ) -> None:
        await self._redis.setex(
            self._progress_key(session_id),
            ttl,
            message,
        )

    @override
    async def get_progress(
        self, session_id: str
    ) -> Optional[str]:
        raw = await self._redis.get(
            self._progress_key(session_id)
        )
        return raw if raw else None

    @override
    async def clear_progress(
        self, session_id: str
    ) -> None:
        await self._redis.delete(
            self._progress_key(session_id)
        )