FIRST_QUESTION_PROMPT = """Bạn là interviewer tại {company_name}.
Tạo 1 câu hỏi mở đầu bằng tiếng Việt. Output JSON only.

Ứng viên: {target_position} | skills={skills}
Vị trí: {job_title}

Output: {{"round":"opening","question":"câu hỏi tiếng Việt"}}"""


NEXT_QUESTION_PROMPT = """Bạn là interviewer tại {company_name}.
Tạo câu hỏi tiếp theo dựa vào lịch sử. Output JSON only.
Language: Vietnamese.

Ứng viên: {target_position} | skills={skills}
Vị trí: {job_title} | Stack: {tech_stack}

Lịch sử Q&A:
{history}

Câu tiếp theo ({next_index}/{max_questions}):
- Dựa vào câu trả lời trước để hỏi phù hợp
- Trả lời tốt → đào sâu | Trả lời yếu → đổi chủ đề
- Xen kẽ: technical, behavior, culture_fit
- Câu cuối → tổng hợp/culture fit

Output: {{"round":"technical|behavior|culture_fit","question":"câu hỏi tiếng Việt"}}"""


# Đánh giá TẤT CẢ sau khi hỏi xong — 1 lần duy nhất
EVALUATE_ALL_PROMPT = """Đánh giá toàn bộ buổi phỏng vấn. Output JSON only.
Language: Vietnamese.

Vị trí: {job_title} tại {company_name}
Ứng viên: {candidate_name} | skills={skills}

Toàn bộ Q&A:
{qa_text}

Nhiệm vụ:
1. Nhận xét CHI TIẾT từng câu trả lời
2. Tổng kết toàn bộ buổi phỏng vấn

Output (JSON only):
{{
  "evaluated": [
    {{
      "index":      0,
      "score":      8,
      "feedback":   "Nhận xét chi tiết câu này 2-3 câu tiếng Việt",
      "suggestion": "Gợi ý cải thiện 1 câu tiếng Việt"
    }}
  ],
  "summary": {{
    "total_score":      75,
    "level":            "Tốt|Khá|Trung bình|Yếu",
    "overall_feedback": "Nhận xét tổng thể 3-4 câu",
    "strengths":        ["điểm mạnh 1", "điểm mạnh 2"],
    "weaknesses":       ["điểm yếu 1"],
    "recommendation":   "Khuyến nghị 1-2 câu"
  }}
}}"""