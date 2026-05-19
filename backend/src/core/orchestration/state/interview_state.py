from typing import Annotated, Optional
from typing_extensions import TypedDict
import operator


class QAPair(TypedDict, total=False):
    index:    int
    round:    str
    question: str
    answer:   str


class QAEvaluated(TypedDict, total=False):
    index:      int
    round:      str
    question:   str
    answer:     str
    score:      int     # 0-10
    feedback:   str     # Nhận xét câu này
    suggestion: str     # Gợi ý cải thiện


class InterviewState(TypedDict, total=False):
    # Context
    cv_data:          dict
    selected_job:     dict
    company_research: dict
    session_id:       str
    user_id:          str
    cv_id:            str

    # Config
    max_questions:    int

    # Q&A — chỉ lưu câu hỏi + câu trả lời
    qa_pairs: Annotated[list[QAPair], operator.add]

    # Câu hỏi hiện tại
    current_index:    int
    current_question: str
    current_round:    str
    current_answer:   str

    # Kết quả đánh giá — sau khi hỏi hết
    evaluated:   list[QAEvaluated]   # Nhận xét từng câu
    summary:     dict                # Tổng kết

    is_done:     bool
    error:       Optional[str]