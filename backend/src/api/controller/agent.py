from fastapi import BackgroundTasks
from fastapi import APIRouter, Depends

from src.core.application.repositories.agent_repo.agentdtos import (
    ResumeAgentRequest,
    StartAgentRequest,
)
from src.core.application.repositories.agent_repo.dependencies import get_agent_repo
from src.core.application.repositories.agent_repo.IAgentRepository import IAgentRepository
from src.core.application.repositories.user_repo.dependencies import get_current_user
from src.core.domain.models import User

router = APIRouter(prefix="/agent", tags=["Agent"])


@router.post("/start")
async def start_agent(
    req:          StartAgentRequest,
    current_user: User             = Depends(get_current_user),
    repo:         IAgentRepository = Depends(get_agent_repo),
):
    """Khởi tạo session và inject initial state — trả về ngay, không chạy graph."""
    return await repo.start_agent(req, current_user.id)


@router.post("/resume")
async def resume_agent(
    req:  ResumeAgentRequest,
    background_tasks: BackgroundTasks,
    repo: IAgentRepository = Depends(get_agent_repo),
):
    """Inject HITL input vào PostgresSaver — trả về ngay, FE tự reconnect SSE."""
    return await repo.resume_agent(req, background_tasks)

@router.get("/session/{session_id}")
async def get_session_state(
    session_id: str,
    repo:       IAgentRepository = Depends(get_agent_repo),
):
    """Polling trạng thái session — FE gọi mỗi 2s."""
    return await repo.get_session_state(session_id)


@router.get("/run/{session_id}")
async def get_agent_run(
    session_id: str,
    background_tasks: BackgroundTasks,
    repo:       IAgentRepository = Depends(get_agent_repo),
):
    """Trigger chạy graph từ step hiện tại."""
    return await repo.run_agent(session_id, background_tasks)

