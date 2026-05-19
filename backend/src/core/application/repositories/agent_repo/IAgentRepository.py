from fastapi import BackgroundTasks
from abc import ABC, abstractmethod
from uuid import UUID

from src.core.application.repositories.agent_repo.agentdtos import (
    AgentSessionResponse,
    ResumeAgentRequest,
    ResumeAgentResponse,
    StartAgentRequest,
    StartAgentResponse,
)


class IAgentRepository(ABC):

    @abstractmethod
    async def start_agent(self, request: StartAgentRequest, user_id: UUID) -> StartAgentResponse:
        pass

    @abstractmethod
    async def get_session_state(self, session_id: str) -> AgentSessionResponse:
        pass

    @abstractmethod
    async def resume_agent(self, req: ResumeAgentRequest, background_tasks: BackgroundTasks) -> ResumeAgentResponse:
        pass
    
    @abstractmethod
    async def run_agent(self, session_id: str, background_tasks: BackgroundTasks) -> AgentSessionResponse:
        pass