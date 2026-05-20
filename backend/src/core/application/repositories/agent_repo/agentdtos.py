from uuid import UUID
from typing import Optional
from pydantic import BaseModel


# ── Requests ──────────────────────────────────────────────────────────────────

class StartAgentRequest(BaseModel):
    cv_id:   UUID


class ResumeAgentRequest(BaseModel):
    session_id:   str
    company_name: Optional[str]  = None   # HITL #1 — dùng để lookup nếu không có job_selected
    job_selected: Optional[dict] = None   # HITL #1 — truyền thẳng JobResult từ FE (ưu tiên hơn)
    is_interview: Optional[bool] = None   # HITL #2


# ── Responses ─────────────────────────────────────────────────────────────────

class StartAgentResponse(BaseModel):
    session_id:   str
    current_step: str
    message:      str
    cached:       bool


class ResumeAgentResponse(BaseModel):
    session_id:   str
    current_step: str
    message:      str


class AgentSessionResponse(BaseModel):
    """Trả về từ GET /session/{session_id} — đọc từ PostgresSaver."""
    session_id:   str
    current_step: str

    job_results:      Optional[list]  = None
    company_research: Optional[dict]  = None
    selected_job:     Optional[dict]  = None

    current_question:       Optional[str] = None
    current_round:          Optional[str] = None
    current_question_index: Optional[int] = None
    max_questions:          Optional[int] = None
    interview_qa_pairs:     Optional[list] = None

    interview_evaluated: Optional[list] = None
    interview_summary:   Optional[dict] = None
    error:               Optional[str]  = None
    progress:            Optional[str]  = None
    progress_step:       Optional[str]  = None
