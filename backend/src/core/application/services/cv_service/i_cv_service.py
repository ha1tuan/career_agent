from abc import ABC, abstractmethod
from typing import AsyncIterator
from src.core.application.repositories.cv_repo.cvdtos import CVDto
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
import os
class ICVService(ABC):

    @abstractmethod
    async def compute_hash(self, file_bytes: bytes) -> str:
        """Compute hash of file_bytes"""
        ...

    @abstractmethod
    async def find_by_hash(self, user_id: UUID, file_hash: str) -> CVDto:
        """Find CV by hash"""
        ...

    @abstractmethod
    async def extract_text(self, file_bytes: bytes, file_name: str) -> str:
        """
        Router function — tự detect format và gọi đúng extractor.
        Đây là hàm duy nhất Service layer cần biết.
        """
        ...
    
    @abstractmethod
    async def _save_file(
        self,
        user_id: UUID,
        file_bytes: bytes,
        file_name: str,
        file_hash: str,
    ) -> str:
        ...

    @abstractmethod
    async def get_cv_by_id(self, cv_id: UUID) -> CVDto:
        """Get CV by ID"""
        ...

    @abstractmethod
    async def create_session_id(
        self,
        user_id: UUID,
        cv_id:   UUID,
    ) -> str:
        """
        Cùng user_id + cv_id → luôn ra cùng session_id.
        Không random → resume tự nhiên khi FE gọi lại.

        Ví dụ:
            user_id = UUID("00000000-0000-0000-0000-000000000001")
            cv_id   = UUID("743b581c-ddcf-4658-af87-5077ce4f4d4d")
            → "agent_00000000_743b581c"
        """
        ...