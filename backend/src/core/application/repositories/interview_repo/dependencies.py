from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.application.repositories.interview_repo.IInterviewRepository import IInterviewRepository
from src.core.application.services.session_service.i_session_service import ISessionService
from src.core.application.services.session_service.dependencies import get_session_service
from src.core.application.repositories.user_repo.dependencies import get_current_user
from src.core.domain.models import User
from src.core.infrastructure.persistence.session import get_db_session
from src.core.infrastructure.repositories.interview_repo import InterviewRepository
from src.core.application.repositories.session_history_repo.ISessionHistoryRepository import ISessionHistoryRepository
from src.core.infrastructure.repositories.session_history_repo import SessionHistoryRepository


async def get_session_history_repo(
    session: AsyncSession = Depends(get_db_session),
) -> ISessionHistoryRepository:
    return SessionHistoryRepository(session=session)


async def get_interview_repo(
    session_service:      ISessionService            = Depends(get_session_service),
    db:                   AsyncSession               = Depends(get_db_session),
    current_user:         User                       = Depends(get_current_user),
    session_history_repo: ISessionHistoryRepository  = Depends(get_session_history_repo),
) -> IInterviewRepository:
    return InterviewRepository(
        session_service      = session_service,
        db                   = db,
        current_user         = current_user,
        session_history_repo = session_history_repo,
    )
