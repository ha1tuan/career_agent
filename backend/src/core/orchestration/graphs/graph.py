from langgraph.graph import StateGraph, END

from src.core.orchestration.state import AgentState
from src.core.orchestration.nodes.job_finder import job_finder_node
from src.core.orchestration.nodes.company_researcher import company_researcher_node
from src.core.orchestration.nodes.interview_nodes import interviewer_node
from src.api.config.checkpointer import get_checkpointer
# ── Conditional edge — chọn node cuối ────────────
def route_action(state: AgentState) -> str:
    """
    Graph tự quyết dựa vào next_action user đã chọn.
    Không cần FE biết node nào.
    """
    is_interview = state.get("is_interview", False)
    if is_interview:
        return "interviewer"
    else:
        return END
        


# ── Build graph ───────────────────────────────────
async def build_graph():
    checkpointer = await get_checkpointer()
    builder = StateGraph(AgentState)

    # Thêm nodes
    builder.add_node("job_finder",         job_finder_node)
    builder.add_node("company_researcher", company_researcher_node)
    builder.add_node("interviewer",        interviewer_node)

    builder.set_entry_point("job_finder")
    
    # job_finder → company_researcher (sẽ bị interrupt giữa chừng do interrupt_after)
    builder.add_edge("job_finder", "company_researcher")

    # Sau company_researcher → rẽ nhánh dựa vào next_action (HITL #2)
    builder.add_conditional_edges(
        source   = "company_researcher",
        path     = route_action,
        path_map = {
            "interviewer": "interviewer",
            END:           END,
        }
    )
    builder.add_edge("interviewer", END)

    return builder.compile(
        checkpointer    = checkpointer,
        interrupt_after = ["job_finder", "company_researcher"],
    )


# ── Singleton ─────────────────────────────────────
_graph = None

async def get_graph():
    global _graph
    if _graph is None:
        print("🔧 Khởi tạo LangGraph...")
        _graph = await build_graph()
        print("✅ Graph ready")
    return _graph
