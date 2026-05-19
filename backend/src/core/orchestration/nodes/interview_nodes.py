import json
from langgraph.types import interrupt

from src.core.orchestration.state import InterviewState, QAPair, QAEvaluated, AgentState
from src.core.orchestration.prompts.interview_prompt import (
    FIRST_QUESTION_PROMPT,
    NEXT_QUESTION_PROMPT,
    EVALUATE_ALL_PROMPT,
)
from src.core.orchestration.utils.utils import _parse_json
from src.core.infrastructure.services.llm_service import get_llm_service
from src.core.infrastructure.persistence.session import AsyncSessionFactory
from src.core.domain.models import InterviewHistoryItem

# ── Node 1: Câu hỏi đầu tiên ─────────────────────
async def generate_first_question_node(
    state: InterviewState,
) -> InterviewState:
    print("🎤 [Interview] Tạo câu hỏi đầu tiên...")

    try:
        cv_data      = state.get("cv_data", {})
        selected_job = state.get("selected_job", {})
        llm          = get_llm_service(temperature=0.6)

        full_response = ""
        async for token in llm.stream(
            FIRST_QUESTION_PROMPT.format(
                company_name    = selected_job.get("company", ""),
                target_position = cv_data.get("target_position", ""),
                skills          = ", ".join(cv_data.get("skills", [])[:5]),
                job_title       = selected_job.get("title", ""),
            )
        ):
            full_response += token
        print(full_response)
        data = _parse_json(full_response) or {}

        print(f"  ❓ [{data.get('round')}] {data.get('question','')[:80]}")

        return {
            **state,
            "current_question": data.get("question", ""),
            "current_round":    data.get("round", "opening"),
            "current_index":    0,
            "qa_pairs":         [],
            "is_done":          False,
            "error":            None,
        }
    except Exception as e:
        print(f"❌ [generate_first_question_node] Lỗi: {e}")
        return {
            **state,
            "current_question": "",
            "current_round":    "opening",
            "current_index":    0,
            "qa_pairs":         [],
            "is_done":          True,
            "error":            str(e),
        }


# ── Node 2: Hỏi câu → interrupt() ────────────────
async def ask_question_node(
    state: InterviewState,
) -> InterviewState:
    """
    Dừng chờ user trả lời.
    KHÔNG đánh giá tại đây — chỉ lưu câu trả lời.
    """
    current_index = state.get("current_index", 0)
    max_q         = state.get("max_questions", 5)
    question      = state.get("current_question", "")
    round_        = state.get("current_round", "")

    print(f"\n📌 Câu {current_index + 1}/{max_q} [{round_}]:\n   {question}")

    # HITL — dừng chờ user.
    answer = interrupt({
        "current_index": current_index,
        "total":         max_q,
        "round":         round_,
        "question":      question,
    })

    return {**state, "current_answer": answer, "error": None}


# ── Node 3: Đánh giá & Tạo câu tiếp ────────────────
async def evaluate_and_next_node(
    state: InterviewState,
) -> InterviewState:
    """
    1. Đánh giá câu trả lời hiện tại
    2. Tạo câu hỏi tiếp theo
    """
    print("📊 [Interview] Đánh giá & tạo câu tiếp theo...")

    try:
        # Lấy context
        current_index = state.get("current_index", 0)
        max_q         = state.get("max_questions", 5)
        question      = state.get("current_question", "")
        round_        = state.get("current_round", "")
        answer        = state.get("current_answer", "")
        selected_job  = state.get("selected_job", {})
        cv_data       = state.get("cv_data", {})
        company_res   = state.get("company_research", {})
        llm           = get_llm_service(temperature=0.6)

        qa_pair: QAPair = {
            "index":    current_index,
            "round":    round_,
            "question": question,
            "answer":   answer,
        }
        next_index = current_index + 1
        is_done    = next_index >= max_q
        if is_done:
            # Hỏi xong → sang evaluate
            return {
                **state,
                "qa_pairs":      [qa_pair],   # Annotated → append
                "current_index": next_index,
                "is_done":       True,
                "error":         None,
            }

        # ── Build prompt ─────────────────────────────────────
        # Dùng accumulated + qa_pair chỉ để build prompt text.
        # Không return toàn bộ list — tránh duplicate do operator.add.
        accumulated: list[QAPair] = state.get("qa_pairs", [])
        history_for_prompt = [*accumulated, qa_pair]

        history_text = "\n".join(
            f"Câu {q['index']+1} [{q['round']}]:\n"
            f"  Q: {q['question']}\n"
            f"  A: {q['answer']}"
            for q in history_for_prompt
        )

        print("\n" + "="*40)
        print(history_text)
        print("="*40 + "\n")

        prompt = NEXT_QUESTION_PROMPT.format(
            company_name    = selected_job.get("company", ""),
            target_position = cv_data.get("target_position", ""),
            skills          = ", ".join(cv_data.get("skills", [])[:5]),
            job_title       = selected_job.get("title", ""),
            tech_stack      = ", ".join(company_res.get("tech_stack", [])[:5]),
            history         = history_text,
            next_index      = current_index + 1,
            max_questions   = max_q,
        )

        # ── Generate câu tiếp ─────────────────────────────
        full_response = ""
        async for token in llm.stream(prompt):
            full_response += token

        data = _parse_json(full_response) or {}

        print(
            f"  ➡️  Câu tiếp [{data.get('round')}]: "
            f"{data.get('question','')[:60]}..."
        )

        next_question = data.get("question", "")
        next_round    = data.get("round", "technical")

        print(f"  ❓ [{next_round}] {next_question[:70]}...")

        return {
            **state,
            "qa_pairs":         [qa_pair],   # Annotated → append only cặp mới
            "current_question": next_question,
            "current_round":    next_round,
            "current_index":    current_index + 1,
            "is_done":          False,
            "error":            None,
        }
    except Exception as e:
        print(f"❌ [evaluate_and_next_node] Lỗi: {e}")
        return {
            **state,
            "is_done": True,
            "error":   str(e),
        }


# ── Node 4: Đánh giá TẤT CẢ 1 lần ───────────────
async def evaluate_all_node(
    state: InterviewState,
) -> InterviewState:
    """
    Hỏi xong hết → đánh giá toàn bộ 1 lần.
    LLM có đủ context → nhận xét chính xác hơn.
    """
    print("📊 [Interview] Đánh giá toàn bộ...")

    try:
        qa_pairs     = state.get("qa_pairs", [])
        cv_data      = state.get("cv_data", {})
        selected_job = state.get("selected_job", {})
        llm          = get_llm_service()

        # Format toàn bộ Q&A cho LLM
        qa_text = "\n\n".join(
            f"[Câu {q['index']+1} — {q['round']}]\n"
            f"Câu hỏi: {q['question']}\n"
            f"Trả lời: {q['answer']}"
            for q in qa_pairs
        )

        full_response = ""
        async for token in llm.stream(
            EVALUATE_ALL_PROMPT.format(
                job_title      = selected_job.get("title", ""),
                company_name   = selected_job.get("company", ""),
                candidate_name = cv_data.get("full_name", "Ứng viên"),
                skills         = ", ".join(cv_data.get("skills", [])[:5]),
                qa_text        = qa_text,
            )
        ):
            full_response += token

        data      = _parse_json(full_response) or {}
        evaluated = data.get("evaluated", [])
        summary   = data.get("summary", {})

        # Merge evaluated vào qa_pairs
        evaluated_pairs: list[QAEvaluated] = []
        for qa in qa_pairs:
            eval_item = next(
                (e for e in evaluated if e.get("index") == qa["index"]),
                {}
            )
            evaluated_pairs.append({
                **qa,
                "score":      eval_item.get("score", 0),
                "feedback":   eval_item.get("feedback", ""),
                "suggestion": eval_item.get("suggestion", ""),
            })

        # Tính điểm trung bình quy về thang 100
        total_score = round(
            sum(e.get("score", 0) for e in evaluated_pairs)
            / len(evaluated_pairs) * 10
        ) if evaluated_pairs else 0

        summary["total_score"] = total_score

        print(
            f"✅ Đánh giá xong | "
            f"Score: {total_score}/100 | "
            f"Level: {summary.get('level')}"
        )
        for e in evaluated_pairs:
            print(
                f"  Câu {e['index']+1} [{e['round']}]: "
                f"{e['score']}/10 — {e.get('feedback','')[:60]}"
            )
        return {
            **state,
            "evaluated": evaluated_pairs,
            "summary":   summary,
            "is_done":   True,
            "error":     None,
        }
    except Exception as e:
        print(f"❌ [evaluate_all_node] Lỗi: {e}")
        return {
            **state,
            "evaluated": [],
            "summary":   {},
            "is_done":   True,
            "error":     str(e),
        }


# ── Node bridge: Main graph → Interview subgraph ──
async def interviewer_node(state: AgentState) -> AgentState:
    """
    Được gọi từ main graph sau khi user chọn interview.
    Khởi động interview subgraph đến câu hỏi đầu tiên (interrupt).
    """
    from src.core.orchestration.graphs.interview_graph import get_interview_graph

    session_id = state.get("session_id", "")
    print(f"🎤 [Interviewer] Khởi động interview subgraph | session={session_id}")

    try:
        sub_graph = await get_interview_graph()
        config    = {"configurable": {"thread_id": f"{session_id}_interview"}}

        interview_initial: InterviewState = {
            "cv_data":          state.get("cv_data", {}),
            "selected_job":     state.get("job_selected", {}),
            "company_research": state.get("company_research", {}),
            "session_id":       session_id,
            "user_id":          state.get("user_id", ""),
            "cv_id":            state.get("cv_id", ""),
            "max_questions":    5,
        }

        # Chạy subgraph đến interrupt đầu tiên (sau ask_question)
        async for event in sub_graph.astream(interview_initial, config):
            for node_name in event:
                print(f"  ✓ [interview:{node_name}]")

        return {
            **state,
            "current_step": "interviewing",
            "is_interview": True,
            "error":        None,
        }
    except Exception as e:
        print(f"❌ [interviewer_node] Lỗi: {e}")
        return {
            **state,
            "error":       str(e),
            "failed_node": "interviewer",
        }