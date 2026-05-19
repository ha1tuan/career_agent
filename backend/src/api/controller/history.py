from src.core.application.repositories.session_history_repo.dependencies import get_session_history_repo
from src.core.application.repositories.session_history_repo import ISessionHistoryRepository
from uuid import UUID

from fastapi import APIRouter, Depends

from src.core.application.repositories.interview_repo.dependencies import get_interview_repo
from src.core.application.repositories.interview_repo.IInterviewRepository import IInterviewRepository
from src.core.application.repositories.interview_repo.interviewdtos import AnswerRequest

router = APIRouter(prefix="/history", tags=["History"])


@router.get("/list")
async def get_history(
    user_id:    UUID,
    page_size:  int,
    page:       int,
    repo:       ISessionHistoryRepository = Depends(get_session_history_repo),
):
    history = await repo.get_history(user_id, page_size, page)
    return {
        "total_count": len(history),
        "page": page,
        "page_size": page_size,
        "data": history
    }

@router.get("/id")
async def get_interview_result(
    id:         str,
    repo:       ISessionHistoryRepository = Depends(get_session_history_repo),
):
    return await repo.get_by_history_id(id)
