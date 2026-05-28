from src.core.orchestration.session.session_events import SessionEvent
from src.core.orchestration.session.session_events import event_company_researched
from src.core.orchestration.session.session_events import event_graph_error
from src.core.orchestration.session.session_events import event_interview_started
from src.core.orchestration.session.session_events import event_jobs_found

def _build_session_event(
    session_id: str,
    node_name:  str,
    output:     dict,
) -> SessionEvent | None:
    """
    Map node name + output → SessionEvent.
    Thêm node mới: chỉ cần thêm case ở đây.
    """
    if node_name == "job_finder":
        jobs = output.get("job_results", [])
        if jobs:
            return event_jobs_found(session_id, jobs)

    elif node_name == "company_researcher":
        company = output.get("company_research")
        if company:
            return event_company_researched(
                session_id, company
            )
        if output.get("error"):
            return event_graph_error(session_id)

    elif node_name == "interviewer":
        return event_interview_started(session_id)

    return None

def _msg_node_start(node_name: str) -> str | None:
    return {
        "job_finder":         "🔍 Đang tìm việc làm phù hợp...",
        "company_researcher": "🏢 Đang research công ty...",
        "interviewer":        "🎤 Đang chuẩn bị câu hỏi...",
    }.get(node_name)


def _msg_llm_start(node_name: str) -> str:
    return {
        "job_finder":         "🤖 AI đang phân tích jobs...",
        "company_researcher": "🤖 AI đang phân tích công ty...",
        "interviewer":        "🤖 AI đang tạo câu hỏi...",
    }.get(node_name, "🤖 AI đang xử lý...")


def _get_parent_node(event: dict) -> str:
    """Lấy tên node cha từ event tags"""
    for tag in event.get("tags", []):
        if tag in (
            "job_finder",
            "company_researcher",
            "interviewer",
        ):
            return tag
    return ""