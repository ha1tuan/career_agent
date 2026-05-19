from src.core.orchestration.state import AgentState

async def cv_reviewer_node(state: AgentState) -> AgentState:
    # TODO: implement Phase 2.5
    print("📝 [CV Reviewer] chưa implement")
    return {**state, "current_step": "reviewing"}