from tavily import TavilyClient

from src.core.orchestration.state import AgentState, CompanyResearch
from src.core.orchestration.prompts.research_prompt import COMPANY_RESEARCH_PROMPT
from src.core.orchestration.utils.utils import _parse_json
from src.core.infrastructure.services.llm_service import get_llm_service
from src.api.config.settings import get_settings

settings = get_settings()
async def company_researcher_node(
    state: AgentState,
) -> AgentState:
    """
    Research văn hóa, tech stack, interview process của công ty.
    Input:  company_name (từ HITL #1)
    Output: company_research (CompanyResearch)
    """
    print("🏢 [Company Researcher] Bắt đầu research...")

    # HITL #1 gửi company_name; nếu job_selected chưa set thì tìm từ job_results
    company_name = (
        state.get("company_name")
        or state.get("job_selected", {}).get("company", "")
    )
    company_name = (company_name or "").strip()

    job_selected = state.get("job_selected")
    if not job_selected and company_name:
        job_selected = next(
            (j for j in state.get("job_results", []) if j.get("company") == company_name),
            None,
        )

    cv_data = state.get("cv_data", {})

    if not company_name:
        return {
            **state,
            "company_research": None,
            "current_step":     "error",
            "error":            "Không có tên công ty để research",
            "failed_node":      "company_researcher",
        }

    print(f"  🔍 Research: {company_name}")

    try:
        llm      = get_llm_service()
        client   = TavilyClient(api_key=settings.TAVILY_API_KEY)

        # ── Tavily search — đúng hướng ────────────
        # Query nhắm vào: văn hóa, review, interview
        # Không có chữ "tuyển dụng" tránh trả job listing
        results = client.search(
            query = (
                f"{company_name} "
                f"review culture interview process "
                f"tech stack Vietnam IT"
            ),
            max_results = 5,
        )

        company_info = "\n".join(
            r.get("content", "")[:400]
            for r in results.get("results", [])
            if r.get("content")
        )[:1500]

        if not company_info:
            return {
                **state,
                "company_research": None,
                "current_step":     "error",
                "error":            f"Không tìm thấy thông tin: {company_name}",
                "failed_node":      "company_researcher",
            }

        # ── LLM extract CompanyResearch ───────────
        prompt = COMPANY_RESEARCH_PROMPT.format(
            company_name    = company_name,
            target_position = cv_data.get("target_position", ""),
            skills          = ", ".join(
                cv_data.get("skills", [])[:5]
            ),
            company_info    = company_info,
        )

        full_response = ""
        async for token in llm.stream(prompt):
            full_response += token

        print(f"  📝 Preview: {full_response[:150]}")

        # ── Parse JSON ────────────────────────────
        research: CompanyResearch = _parse_json(full_response)

        if not research:
            return {
                **state,
                "company_research": None,
                "current_step":     "error",
                "error":            "Không parse được thông tin công ty",
                "failed_node":      "company_researcher",
            }

        research["company_name"] = company_name
        print(f"✅ [Company Researcher] Done: {company_name}")

        return {
            **state,
            "job_selected":  job_selected,
            "company_research": research,
            "current_step":     "companies_researched",
            "error":            None,
            "failed_node":      None,
        }

    except Exception as e:
        print(f"❌ [Company Researcher] Lỗi: {e}")
        return {
            **state,
            "company_research": None,
            "current_step":     "error",
            "error":            f"Lỗi: {str(e)}",
            "failed_node":      "company_researcher",
        }
