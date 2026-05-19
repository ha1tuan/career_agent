from typing import Optional
from uuid import UUID
from abc import ABC, abstractmethod
from src.core.application.repositories.cv_repo.cvdtos import CVCreate, CVDto

class ICVRepository(ABC):
    @abstractmethod
    async def upload_cv(self, cv_in: CVCreate) -> Optional[CVDto]:
        pass

    @abstractmethod
    async def get_cv_by_id(self, cv_id: UUID) -> CVDto:
        pass

    @abstractmethod
    async def clone_cv(self, existing_cv_id: UUID, user_id: UUID) -> CVDto:
        pass