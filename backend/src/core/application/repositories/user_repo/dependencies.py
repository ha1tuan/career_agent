from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt, JWTError
from pydantic import ValidationError

from src.core.infrastructure.persistence.session import get_db_session
from src.api.config.settings import get_settings
from src.core.application.repositories.user_repo.authdtos import TokenPayload
from src.core.domain.models import User
from src.core.infrastructure.repositories.user_repo import UserRepository


reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"/api/v1/auth/login"
)

async def get_user_repo(session: AsyncSession = Depends(get_db_session)) -> UserRepository:
    return UserRepository(session)

async def get_current_user(
    token: str = Depends(reusable_oauth2),
    user_repo: UserRepository = Depends(get_user_repo)
) -> User:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        if token_data.type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = await user_repo.get_by_id(token_data.sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
