from langgraph.graph import StateGraph, END

from src.core.orchestration.state import InterviewState
from src.core.orchestration.nodes.interview_nodes import (
    generate_first_question_node,
    ask_question_node,
    evaluate_and_next_node,
    evaluate_all_node,
)
from src.api.config.checkpointer import get_checkpointer

def route_after_save(state: InterviewState) -> str:
    """Sau save_and_next: còn câu → hỏi tiếp | hết → evaluate"""
    if state.get("is_done"):
        return "evaluate_all"
    return "ask_question"

async def build_interview_graph():
    checkpointer = await get_checkpointer()
    builder = StateGraph(InterviewState)

    builder.add_node("generate_first", generate_first_question_node)
    builder.add_node("ask_question",   ask_question_node)
    builder.add_node("save_and_next",  evaluate_and_next_node)
    builder.add_node("evaluate_all",   evaluate_all_node)

    builder.set_entry_point("generate_first")
    builder.add_edge("generate_first", "ask_question")

    # ask → interrupt() → user trả lời → save
    builder.add_edge("ask_question", "save_and_next")

    # save → còn câu? → ask : evaluate
    builder.add_conditional_edges(
        source   = "save_and_next",
        path     = route_after_save,
        path_map = {
            "ask_question": "ask_question",
            "evaluate_all": "evaluate_all",
        }
    )

    builder.add_edge("evaluate_all", END)

    return builder.compile(
        checkpointer    = checkpointer,
        interrupt_after = ["ask_question"],
    )


_interview_graph    = None
_interview_saver    = None


async def get_interview_graph():
    global _interview_graph
    if _interview_graph is None:
        _interview_graph = await build_interview_graph()
        print("✅ Interview Sub-graph ready")
    return _interview_graph