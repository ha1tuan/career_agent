from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.infrastructure.persistence.session import get_db_session
from src.core.infrastructure.repositories.session_history_repo import SessionHistoryRepository
from src.core.application.repositories.session_history_repo import ISessionHistoryRepository

async def get_session_history_repo(
    session: AsyncSession = Depends(get_db_session),
) -> ISessionHistoryRepository:
    return SessionHistoryRepository(
        session = session
    )
