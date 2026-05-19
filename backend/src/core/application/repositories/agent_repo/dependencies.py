from src.core.application.repositories.agent_repo import IAgentRepository
from src.core.infrastructure.repositories.agent_repo import AgentRepository
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.persistence.session import get_db_session
from src.core.infrastructure.repositories.cv_repo import CVRepository
from src.core.infrastructure.services.llm_service import get_llm_service
from src.core.infrastructure.services.cv_service import CVService
from src.core.application.repositories.cv_repo.ICVRepository import ICVRepository
from src.core.application.services.llm_service.i_llm_service import ILLMService
from src.core.application.services.cv_service.i_cv_service import ICVService
from src.core.application.services.session_service.i_session_service import ISessionService
from src.core.application.services.session_service.dependencies import get_session_service
from src.core.application.repositories.session_history_repo.ISessionHistoryRepository import ISessionHistoryRepository
from src.core.infrastructure.repositories.session_history_repo import SessionHistoryRepository

async def get_cv_service(
    session: AsyncSession = Depends(get_db_session),
) -> ICVService:
    return CVService(session=session)


async def get_session_history_repo(
    session: AsyncSession = Depends(get_db_session),
) -> ISessionHistoryRepository:
    return SessionHistoryRepository(session=session)


async def get_agent_repo(
    cv_service:           ICVService            = Depends(get_cv_service),
    session_service:      ISessionService       = Depends(get_session_service),
    session_history_repo: ISessionHistoryRepository = Depends(get_session_history_repo),
) -> IAgentRepository:
    return AgentRepository(
        cv_service           = cv_service,
        session_service      = session_service,
        session_history_repo = session_history_repo,
    )
