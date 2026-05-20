from typing import Optional
from abc import ABC, abstractmethod
from uuid import UUID


class ISessionService(ABC):
    """
    Lưu session metadata vào Redis theo session_id.

    Key:   agent_session:{session_id}
    Value: JSON string { "user_id": "...", "cv_id": "..." }
    TTL:   24h mặc định
    """

    @abstractmethod
    async def save_metadata(
        self,
        session_id: str,
        user_id:    str,
        cv_id:      str,
        ttl:        int = 86400,
    ) -> None:
        ...

    @abstractmethod
    async def get_metadata(self, session_id: str) -> Optional[dict]:
        """Trả về {"user_id": ..., "cv_id": ...} hoặc None nếu hết hạn."""
        ...

    @abstractmethod
    async def delete_metadata(self, session_id: str) -> None:
        ...

    @abstractmethod
    async def create_session_id(self, user_id: UUID, cv_id: UUID) -> str:
        ...

    @abstractmethod
    async def ping(self) -> bool:
        ...
    
    @abstractmethod
    async def restore_from_db(
        self,
        session_id: str,
        user_id:    str,
        cv_id:      str,
        ttl:        int = 86400,
    ) -> None:
        ...

    @abstractmethod
    async def set_progress(
        self,
        session_id: str,
        message:    str,
        ttl:        int = 300,   # 5 phút
    ) -> None:
        ...
    
    async def get_progress(
        self, session_id: str
    ) -> Optional[str]:
        ...

    async def clear_progress(
        self, session_id: str
    ) -> None:
        ...

    @abstractmethod
    async def set_progress_step(
        self,
        session_id: str,
        step:       str,
        ttl:        int = 300,
    ) -> None:
        ...

    @abstractmethod
    async def get_progress_step(
        self, session_id: str
    ) -> Optional[str]:
        ...

    @abstractmethod
    async def clear_progress_step(
        self, session_id: str
    ) -> None:
        ...
