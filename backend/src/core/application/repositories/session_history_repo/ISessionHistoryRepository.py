from src.core.orchestration.session.session_events import SessionEvent
from src.core.domain.models import AgentSession
from abc import ABC, abstractmethod
from uuid import UUID

from src.core.application.repositories.session_history_repo.sessionhistorydto import AgentSessionDto, InterviewQAPairDto

class ISessionHistoryRepository(ABC):

    @abstractmethod
    async def create(self,  session_id: str,
        user_id:    UUID,
        cv_id:      UUID) -> AgentSession:
        pass

    @abstractmethod
    async def apply_event(self,  session_id: str,
        event: SessionEvent) ->AgentSession | None:
        pass
    
    # ── INTERVIEW Q&A ─────────────────────────────
    @abstractmethod
    async def upsert_qa(
        self,
        session_id: str,
        qa_pair:    dict,
    ) -> None:
        pass
    
    @abstractmethod
    async def save_evaluations(
        self,
        session_id: str,
        evaluated:  list[dict],
    ) -> None:
        pass
    
    @abstractmethod
    async def get_by_history_id(
        self, id: str
    ) -> UUID:
        pass

    @abstractmethod
    async def get_history(
        self, user_id: UUID, page_size: int, page: int
    ) -> list[AgentSessionDto]:
        pass

    @abstractmethod
    async def count_history(self, user_id: UUID) -> int:
        pass

    @abstractmethod
    async def get_by_id(self, id: UUID) -> AgentSession | None:
        pass

    @abstractmethod
    async def get_qa_pairs(
        self, session_id: str
    ) -> list[InterviewQAPairDto]:
        pass