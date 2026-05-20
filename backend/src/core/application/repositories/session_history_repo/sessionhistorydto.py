from datetime import datetime
from pydantic import BaseModel
from uuid import UUID
from typing import Optional

class AgentSessionDto(BaseModel):
    id: UUID
    session_id: str
    user_id: UUID
    cv_id: UUID
    current_step: str
    job_count: int = 0
    selected_job: Optional[dict] = None
    company_research: Optional[dict] = None
    is_interview: bool = False
    interview_score: Optional[int] = None
    interview_level: Optional[str] = None
    interview_summary: Optional[dict] = None

class InterviewQAPairDto(BaseModel):
    id: UUID
    session_id: str
    qa_index: int
    round: Optional[str] = None
    question: str
    answer: Optional[str] = None
    score: Optional[int] = None
    feedback: Optional[str] = None
    suggestion: Optional[str] = None
    answered_at: Optional[datetime] = None
