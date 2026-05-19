import json
from tavily import TavilyClient
from langchain_core.messages import HumanMessage

from src.core.orchestration.state.state import AgentState, JobResult
from src.core.infrastructure.services.llm_service import get_llm_service
from src.api.config.settings import get_settings
from src.core.orchestration.prompts.job_finder_prompt import JOB_FINDER_PROMPT
from src.core.orchestration.utils.utils import _parse_json

settings = get_settings()


def build_search_query(cv_data: dict) -> str:
    position  = cv_data.get("target_position", "Software Engineer")
    skills    = cv_data.get("skills", [])[:3]
    skill_str = " ".join(skills)
    
    return f"{position} {skill_str} tuyển dụng 2026"
# 2. Bổ sung các trang list của Glassdoor, TopCV, LinkedIn vào blacklist
AGGREGATOR_DOMAINS = {
    "vietnamworks.com/search",
    "jobstreet.vn/search",
    "careerbuilder.vn/viec-lam",
    "topcv.vn/tim-viec-lam",     # Trang search của TopCV
    "itviec.com/it-jobs/search", # Trang search của ITviec
    "linkedin.com/jobs/search",  # Trang search của LinkedIn
}


def _is_aggregator_url(url: str) -> bool:
    """
    True nếu URL là trang list tổng hợp.
    False nếu là trang job cụ thể của 1 công ty.
    """
    url_lower = url.lower()
    for domain in AGGREGATOR_DOMAINS:
        if domain in url_lower:
            return True
    return False


def _filter_valid_jobs(raw_jobs: list) -> list:
    """
    Bỏ trang aggregator — chỉ giữ job page cụ thể.
    """
    valid = [
        job for job in raw_jobs
        if not _is_aggregator_url(job.get("url", ""))
    ]
    print(f"  🔎 Filter: {len(raw_jobs)} → {len(valid)} valid URLs")
    return valid

async def job_finder_node(state: AgentState) -> AgentState:
    """
    Bước 1: Tavily search → list URLs
    Bước 2: Tavily extract → full content từng URL
    Bước 3: Gemini extract chi tiết + score
    """
    # Nếu đã có dữ liệu job_results và bước hiện tại đã đi qua, bỏ qua không chạy lại
    if state.get("job_results") and state.get("current_step") in ["jobs_found", "job_selected", "companies_researched"]:
        print("⏭️ [Job Finder] Đã có dữ liệu công việc trong state, bỏ qua node...")
        return state

    print("💼 [Job Finder] Bắt đầu tìm việc...")

    cv_data  = state.get("cv_data", {})
    settings = get_settings()

    try:
        client = TavilyClient(api_key=settings.TAVILY_API_KEY)

        # ── Bước 1: Search lấy list URLs ─────────
        query = build_search_query(cv_data)
        print(f"  🔍 Query: {query}")

        search_results = client.search(
            query        = query,
            max_results  = 10,
            search_depth = "advanced",
            include_domains=["topcv.vn", "itviec.com", "linkedin.com"]
        )
        raw_jobs = search_results.get("results", [])
        raw_jobs = _filter_valid_jobs(raw_jobs)   # ← thêm dòng này
        if not raw_jobs:
            return {
                **state,
                "job_results":  [],
                "current_step": "jobs_found",
                "error":        "Không tìm thấy việc làm phù hợp",
            }

        print(f"  📋 Search: {len(raw_jobs)} results")

        # ── Bước 2: Extract full content ─────────
        urls = [r.get("url", "") for r in raw_jobs if r.get("url")]
        print(f"  📄 Extract full content từ {len(urls)} URLs...")

        try:
            extract_results = client.extract(urls=urls[:5])
            extracted_map   = {
                r.get("url", ""): r.get("raw_content", "")[:2000]
                for r in extract_results.get("results", [])
            }
        except Exception as e:
            print(f"  ⚠️ Extract lỗi: {e} — dùng search content")
            extracted_map = {}

        # ── Bước 3: Format jobs text ──────────────
        jobs_text_parts = []
        for i, r in enumerate(raw_jobs):
            url          = r.get("url", "")
            full_content = extracted_map.get(url, "")
            search_content = r.get("content", "")

            # Ưu tiên full content, fallback về search content
            content = full_content if full_content else search_content

            jobs_text_parts.append(
                f"[JOB {i}]\n"
                f"Title  : {r.get('title', '')}\n"
                f"URL    : {url}\n"
                f"Content:\n{content}"
            )

        jobs_text = "\n\n==================================================\n\n".join(jobs_text_parts)

        # ── Bước 4: Gemini extract + score ────────
        print("  🤖 Gemini đang extract chi tiết + score...")
        llm    = get_llm_service()
        prompt = JOB_FINDER_PROMPT.format(
            target_position = cv_data.get("target_position", ""),
            skills          = ", ".join(cv_data.get("skills", [])[:5]),
            experience      = " | ".join(cv_data.get("experience", []))[:200],
            education       = cv_data.get("education", [""])[0],
            jobs_text       = jobs_text,
        )

        full_response = ""
        async for token in llm.stream(prompt):
            full_response += token

        # ── Bước 5: Parse + map JobResult ─────────
        data = _parse_json(full_response)
        
        if not data:
            print("❌ Không parse được JSON từ Gemini. Phản hồi thô:")
            print(full_response)
            return {
                **state,
                "job_results":  [],
                "current_step": "jobs_found",
                "error":        "Không parse được JSON phản hồi từ Gemini",
            }

        jobs_data = data.get("jobs", [])

        if not jobs_data:
            print("⚠️ Gemini trả về danh sách job trống sau khi áp dụng luật lọc. Phản hồi:")
            print(full_response)
            return {
                **state,
                "job_results":  [],
                "current_step": "jobs_found",
                "error":        "Không tìm thấy job phù hợp sau khi lọc (trang tổng hợp hoặc thiếu tên công ty)",
            }

        jobs: list[JobResult] = []
        for item in jobs_data:
            idx          = item.get("index", -1)
            original_url = (
                raw_jobs[idx].get("url", "")
                if 0 <= idx < len(raw_jobs)
                else ""
            )

            jobs.append({
                # Card info
                "title":            item.get("title", ""),
                "company":          item.get("company", ""),
                "logo_url":         item.get("logo_url", ""),
                "salary":           item.get("salary", "Thoả thuận"),
                "location":         item.get("location", "Việt Nam"),
                "address":          item.get("address", ""),
                "experience_years": item.get("experience_years", "Không yêu cầu"),
                "tags":             item.get("tags", []),
                "posted_date":      item.get("posted_date", "Mới đăng"),
                "is_suggested":     item.get("match_score", 0) >= 70,
                "is_verified":      item.get("is_verified", False),

                # Job detail
                "description":      item.get("description", ""),
                "requirements":     item.get("requirements", []),
                "benefits":         item.get("benefits", []),

                # Score
                "match_score":      item.get("match_score", 0),
                "match_reason":     item.get("match_reason", ""),
                "url":              item.get("url") or original_url,
            })

        # Sort theo score
        jobs.sort(
            key     = lambda x: x.get("match_score", 0),
            reverse = True,
        )

        print(
            f"✅ [Job Finder] {len(jobs)} jobs | "
            f"Top: '{jobs[0].get('title')}' "
            f"({jobs[0].get('match_score')}%)"
        )

        return {
            **state,
            "job_results":  jobs,
            "current_step": "jobs_found",
            "error":        None,
            "failed_node":  None,
        }

    except Exception as e:
        print(f"❌ [Job Finder] Lỗi: {e}")
        return {
            **state,
            "error":       f"Job Finder lỗi: {str(e)}",
            "failed_node": "job_finder",
        }

