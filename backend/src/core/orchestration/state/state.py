from typing import Annotated, Optional, Any
from typing_extensions import TypedDict
import operator


# ── CV Data ──────────────────────────────────────
class CVData(TypedDict, total=False):
    full_name: str
    email: str
    phone: str
    education: list[str]       # ["Đại học Bách Khoa - CNTT - 2020"]
    experience: list[str]      # ["1 năm .NET tại Công ty X"]
    skills: list[str]          # ["C#", "Python", "React"]
    summary: str               # Tóm tắt profile
    target_position: str       # Vị trí ứng tuyển mong muốn


# ── Job Result (mỗi job tìm được) ────────────────
class JobResult(TypedDict, total=False):
    # ── Hiển thị card ─────────────────────────────
    title:            str
    company:          str
    logo_url:         str
    salary:           str          # "8-30 triệu" | "Thoả thuận"
    location:         str          # "Hà Nội"
    address:          str          # "Số 1 Đại Cồ Việt, Hai Bà Trưng" ← MỚI
    experience_years: str          # "3 năm" | "Không yêu cầu"
    tags:             list[str]
    posted_date:      str
    is_suggested:     bool
    is_verified:      bool

    # ── Chi tiết job ──────────────────────────────
    description:      str          # Mô tả công việc ← MỚI
    requirements:     list[str]    # Yêu cầu ứng viên ← MỚI
    benefits:         list[str]    # Quyền lợi ← MỚI

    # ── Scoring ───────────────────────────────────
    match_score:      float
    match_reason:     str
    url:              str

# ── Company Research ─────────────────────────────
class CompanyResearch(TypedDict, total=False):
    company_name: str
    industry: str              # Ngành nghề
    size: str                  # Startup / SME / Enterprise
    culture: str               # Văn hóa công ty
    products: list[str]              # Sản phẩm chính
    tech_stack: list[str]      # Stack công ty đang dùng
    interview_process: str     # Quy trình phỏng vấn
    pros_cons: Any             # Ưu / nhược điểm


# ── Main Agent State ─────────────────────────────
class AgentState(TypedDict, total=False):

    # 📄 CV
    cv_raw_text: str               # Text thô extract từ file
    cv_data: CVData                # Sau khi parse có cấu trúc
    cv_file_path: str              # Đường dẫn file gốc

    # 💼 Job Search
    job_results: list[JobResult]   # Danh sách jobs tìm được
    job_selected: Optional[JobResult]   # Job user chọn để deep dive

    # 🏢 Company
    company_research: CompanyResearch

    interview_questions:    list   # Toàn bộ Q&A
    interview_evaluated:    list   # Kết quả đánh giá
    interview_summary:      dict   # Tổng kết
    # 🔄 Flow Control
    current_step: str              # "cv_parsed" | "jobs_found" | "company_researched" | "done"
    is_interview: bool             # user chọn interview
    user_id: str                   # Để lưu session theo user
    cv_id: str                     # ID của CV
    session_id: str                # ID của session hiện tại
    company_name: Optional[str]    # Tên công ty từ HITL #1

    # 💬 Conversation History
    messages: Annotated[list[dict], operator.add]  # Append — không mất lịch sử

    # ⚠️ Error
    error: Optional[str]           # None nếu không có lỗi
    failed_node: Optional[str]     # Node nào bị lỗi