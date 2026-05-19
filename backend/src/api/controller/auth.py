from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from src.core.application.repositories.user_repo import UserCreate, UserLogin, TokenResponse, RefreshTokenRequest, UserResponse, TokenPayload, IUserRepository
from src.core.application.repositories.user_repo.dependencies import get_user_repo, get_current_user
from src.api.config.security import verify_password, create_access_token, create_refresh_token
from src.core.domain.models import User
from jose import jwt, JWTError
from src.api.config.settings import get_settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate, user_repo: IUserRepository = Depends(get_user_repo)):
    user = await user_repo.get_by_email(user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    user = await user_repo.create(user_in)
    return user

@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    user_repo: IUserRepository = Depends(get_user_repo)
):
    user = await user_repo.get_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    return {
        "access_token": create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
    }

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    user_repo: IUserRepository = Depends(get_user_repo)
):
    settings = get_settings()
    try:
        payload = jwt.decode(
            request.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        if token_data.type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
        
    user = await user_repo.get_by_id(token_data.sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "access_token": create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/ping")
async def ping():
    return {"message": "auth router hoạt động"}