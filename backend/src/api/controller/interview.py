from uuid import UUID

from fastapi import APIRouter, Depends

from src.core.application.repositories.interview_repo.dependencies import get_interview_repo
from src.core.application.repositories.interview_repo.IInterviewRepository import IInterviewRepository
from src.core.application.repositories.interview_repo.interviewdtos import AnswerRequest

router = APIRouter(prefix="/agent/interview", tags=["Interview"])


@router.post("/answer")
async def submit_answer(
    req:  AnswerRequest,
    repo: IInterviewRepository = Depends(get_interview_repo),
):
    return await repo.submit_answer(req)


@router.get("/result")
async def get_interview_result(
    session_id: str,
    repo:       IInterviewRepository = Depends(get_interview_repo),
):
    return await repo.get_result(session_id)
