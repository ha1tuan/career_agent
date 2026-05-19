from typing import Optional
from uuid import UUID
from abc import ABC, abstractmethod
from src.core.domain.models import User
from src.core.application.repositories.user_repo.authdtos import UserCreate

class IUserRepository(ABC):
    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[User]:
        pass

    @abstractmethod
    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        pass

    @abstractmethod
    async def create(self, user_in: UserCreate) -> User:
        pass
