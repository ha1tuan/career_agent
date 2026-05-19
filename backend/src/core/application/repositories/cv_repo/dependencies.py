from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.persistence.session import get_db_session
from src.core.infrastructure.repositories.cv_repo import CVRepository
from src.core.infrastructure.services.llm_service import get_llm_service
from src.core.infrastructure.services.cv_service import CVService
from src.core.application.repositories.cv_repo.ICVRepository import ICVRepository
from src.core.application.services.llm_service.i_llm_service import ILLMService
from src.core.application.services.cv_service.i_cv_service import ICVService


async def get_cv_service(
    session: AsyncSession = Depends(get_db_session),
) -> ICVService:
    return CVService(session=session)


async def get_cv_repo(
    session: AsyncSession = Depends(get_db_session),
    llm: ILLMService = Depends(get_llm_service),
    service: ICVService = Depends(get_cv_service),
) -> ICVRepository:
    return CVRepository(llm=llm, session=session, service=service)

