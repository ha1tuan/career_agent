from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


# ── Request ───────────────────────────────────────────────────────────────────

class AnswerRequest(BaseModel):
    session_id: str
    answer:     str


# ── Sub-models ────────────────────────────────────────────────────────────────

class NextQuestionPayload(BaseModel):
    index:    int
    round:    str
    question: str
    is_last:  bool


class QAEvaluatedItem(BaseModel):
    index:      int
    round:      str
    question:   str
    answer:     str
    score:      int
    feedback:   str
    suggestion: str


class InterviewSummary(BaseModel):
    total_score:      int
    level:            str
    overall_feedback: str
    strengths:        list[str]
    weaknesses:       list[str]
    recommendation:   str


# ── submit_answer ─────────────────────────────────────────────────────────────

class SubmitAnswerResponse(BaseModel):
    session_id:      str
    answered_index:  int
    total_questions: int
    is_done:         bool
    next_question:   Optional[NextQuestionPayload] = None
    evaluated:       Optional[list[QAEvaluatedItem]] = None  # populated when is_done=True
    summary:         Optional[dict] = None                    # populated when is_done=True
    error:           Optional[str]  = None


# ── get_result ────────────────────────────────────────────────────────────────

class InterviewResultResponse(BaseModel):
    session_id:   str                   = ""
    job_title:    str                   = ""
    company_name: str                   = ""
    summary:      Optional[dict]        = None
    error:        Optional[str]         = None
    qa_pairs:     list[dict]            = []
    completed_at: Optional[str]         = None


# ── get_history ───────────────────────────────────────────────────────────────

class InterviewHistoryItemDTO(BaseModel):
    record_id:    UUID
    session_id:   str
    job_title:    str
    company_name: str
    total_score:  Optional[int] = None
    level:        Optional[str] = None
    created_at:   datetime
