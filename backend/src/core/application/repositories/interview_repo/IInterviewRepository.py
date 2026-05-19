from abc import ABC, abstractmethod
from uuid import UUID

from src.core.application.repositories.interview_repo.interviewdtos import (
    AnswerRequest,
    InterviewHistoryItemDTO,
    InterviewResultResponse,
    SubmitAnswerResponse,
)


class IInterviewRepository(ABC):

    @abstractmethod
    async def submit_answer(self, req: AnswerRequest) -> SubmitAnswerResponse:
        pass

    @abstractmethod
    async def get_result(self, session_id: str) -> InterviewResultResponse:
        pass

    @abstractmethod
    async def get_history(self) -> list[InterviewHistoryItemDTO]:
        pass

    @abstractmethod
    async def get_history_detail(self, record_id: UUID) -> InterviewHistoryItemDTO:
        pass
