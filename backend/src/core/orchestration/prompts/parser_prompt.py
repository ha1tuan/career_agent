CV_PARSER_PROMPT = """
Bạn là chuyên gia phân tích CV tuyển dụng tại Việt Nam.
Hãy extract thông tin từ CV sau một cách chính xác.

<cv_content>
{cv_text}
</cv_content>

Trả về JSON với cấu trúc sau.
Chỉ trả về JSON thuần, không markdown, không giải thích:
{{
    "full_name": "Họ tên đầy đủ",
    "email": "email@example.com",
    "phone": "Số điện thoại",
    "education": [
        "Tên trường - Ngành học - Năm tốt nghiệp"
    ],
    "experience": [
        "Thời gian - Vị trí - Công ty - Mô tả ngắn"
    ],
    "skills": [
        "Skill 1", "Skill 2"
    ],
    "summary": "Tóm tắt profile trong 2-3 câu",
    "target_position": "Vị trí phù hợp nhất dựa trên CV"
}}

Nguyên tắc:
- Thiếu thông tin → để "" hoặc []
- Không bịa thêm thông tin không có trong CV
- target_position dựa trên kinh nghiệm thực tế
- Trả lời bằng tiếng Việt
"""