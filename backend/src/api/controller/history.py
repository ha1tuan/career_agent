import math
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.application.repositories.session_history_repo import ISessionHistoryRepository
from src.core.application.repositories.session_history_repo.dependencies import get_session_history_repo
from src.core.infrastructure.persistence.session import get_db_session
from src.core.infrastructure.repositories.session_history_repo import SessionHistoryRepository
from src.core.orchestration.session.graph_runner import GraphRunner

router = APIRouter(prefix="/history", tags=["History"])

_NOT_CONTINUABLE = {"interview_done", "done", "error"}


@router.get("/list")
async def get_history(
    user_id:   UUID,
    page:      int = 1,
    page_size: int = 10,
    repo:      ISessionHistoryRepository = Depends(get_session_history_repo),
):
    history       = await repo.get_history(user_id, page_size, page)
    total_records = await repo.count_history(user_id)
    total_pages   = math.ceil(total_records / page_size) if total_records > 0 else 1

    return {
        "total_records": total_records,
        "total_pages":   total_pages,
        "page":          page,
        "page_size":     page_size,
        "has_next":      page < total_pages,
        "has_prev":      page > 1,
        "data":          history,
    }


@router.get("/id")
async def get_interview_result(
    id:   str,
    repo: ISessionHistoryRepository = Depends(get_session_history_repo),
):
    return await repo.get_by_history_id(id)


@router.get("/{id}")
async def get_history_detail(
    id:   UUID,
    repo: ISessionHistoryRepository = Depends(get_session_history_repo),
    db:   AsyncSession              = Depends(get_db_session),
):
    history = await repo.get_by_id(id)
    if not history:
        raise HTTPException(status_code=404, detail="Không tìm thấy")

    can_continue = history.current_step not in _NOT_CONTINUABLE

    interview_result = None
    if history.is_interview and history.current_step == "interview_done":
        qa_repo  = SessionHistoryRepository(db)
        qa_pairs = await qa_repo.get_qa_pairs(history.session_id)
        interview_result = {
            "score":   history.interview_score,
            "level":   history.interview_level,
            "summary": history.interview_summary,
            "qa_pairs": [
                {
                    "index":      q.qa_index,
                    "round":      q.round,
                    "question":   q.question,
                    "answer":     q.answer,
                    "score":      q.score,
                    "feedback":   q.feedback,
                    "suggestion": q.suggestion,
                }
                for q in qa_pairs
            ],
        }

    return {
        "id":               str(id),
        "session_id":       history.session_id,
        "current_step":     history.current_step,
        "can_continue":     can_continue,
        "job_count":        history.job_count,
        "selected_job":     history.selected_job,
        "company_research": history.company_research,
        "interview_result": interview_result,
    }


@router.post("/{id}/continue")
async def continue_agent(
    id:               UUID,
    background_tasks: BackgroundTasks,
    repo:             ISessionHistoryRepository = Depends(get_session_history_repo),
):
    history = await repo.get_by_id(id)
    if not history:
        raise HTTPException(status_code=404, detail="Không tìm thấy session")

    if history.current_step in _NOT_CONTINUABLE:
        return {
            "error":        "Không thể tiếp tục",
            "current_step": history.current_step,
            "hint":         "Session đã hoàn thành",
        }

    background_tasks.add_task(
        GraphRunner.run,
        session_id = history.session_id,
        user_id    = str(history.user_id),
        cv_id      = str(history.cv_id),
    )

    return {
        "id":           str(id),
        "session_id":   history.session_id,
        "current_step": "running",
        "message":      f"Đang chạy tiếp. Polling /agent/session/{history.session_id}",
    }
