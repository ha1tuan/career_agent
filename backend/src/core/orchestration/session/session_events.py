from dataclasses import dataclass
from typing import Any, Optional
from enum import Enum
from datetime import datetime

class SessionEventType(str, Enum):
    GRAPH_RUNNING        = "graph_running"
    GRAPH_ERROR          = "graph_error"
    JOBS_FOUND           = "jobs_found"
    JOB_SELECTED         = "job_selected"
    COMPANY_RESEARCHED   = "company_researched"
    ACTION_SELECTED      = "action_selected"
    INTERVIEW_STARTED    = "interview_started"
    INTERVIEW_DONE       = "interview_done"

@dataclass
class SessionEvent:
    """
    Generic event — chỉ truyền fields cần update.
    None = không update field đó.
    """
    type:             SessionEventType
    session_id:       str
    current_step:     Optional[str]  = None
    job_count:        Optional[int]  = None
    job_results:      Optional[list] = None
    selected_job:     Optional[dict] = None
    company_research: Optional[dict] = None
    is_interview:     Optional[bool] = None
    interview_summary: Optional[dict] = None
    interview_score:  Optional[int]  = None
    interview_level:  Optional[str]  = None
    completed_at:     Optional[Any]  = None

# ── Factory functions ─────────────────────────────

def event_graph_running(session_id: str) -> SessionEvent:
    return SessionEvent(
        type         = SessionEventType.GRAPH_RUNNING,
        session_id   = session_id,
        current_step = "running",
    )

def event_graph_error(session_id: str) -> SessionEvent:
    return SessionEvent(
        type         = SessionEventType.GRAPH_ERROR,
        session_id   = session_id,
        current_step = "error",
    )

def event_jobs_found(
    session_id:  str,
    job_results: list,
) -> SessionEvent:
    return SessionEvent(
        type         = SessionEventType.JOBS_FOUND,
        session_id   = session_id,
        current_step = "job_finder",
        job_count    = len(job_results),
        job_results  = job_results,
    )

def event_job_selected(
    session_id:   str,
    selected_job: dict,
) -> SessionEvent:
    return SessionEvent(
        type         = SessionEventType.JOB_SELECTED,
        session_id   = session_id,
        current_step = "job_selected",
        selected_job = selected_job,
    )

def event_company_researched(
    session_id:       str,
    company_research: dict,
) -> SessionEvent:
    return SessionEvent(
        type             = SessionEventType.COMPANY_RESEARCHED,
        session_id       = session_id,
        current_step     = "companies_researched",
        company_research = company_research,
    )

def event_action_selected(
    session_id:  str,
    is_interview: bool,
) -> SessionEvent:
    return SessionEvent(
        type         = SessionEventType.ACTION_SELECTED,
        session_id   = session_id,
        current_step = "action_selected",
        is_interview = is_interview,
    )

def event_interview_started(
    session_id: str,
) -> SessionEvent:
    return SessionEvent(
        type         = SessionEventType.INTERVIEW_STARTED,
        session_id   = session_id,
        current_step = "interviewing",
        is_interview = True,
    )

def event_interview_done(
    session_id: str,
    summary:    dict,
) -> SessionEvent:
    return SessionEvent(
        type             = SessionEventType.INTERVIEW_DONE,
        session_id       = session_id,
        current_step     = "interview_done",
        interview_summary = summary,
        interview_score  = summary.get("total_score", 0),
        interview_level  = summary.get("level", ""),
        completed_at     = datetime.utcnow(),
    )