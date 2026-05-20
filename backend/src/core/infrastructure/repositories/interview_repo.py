from src.core.orchestration.session.session_events import event_interview_done
from src.core.application.repositories.session_history_repo import ISessionHistoryRepository
from typing import override, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.application.repositories.interview_repo import IInterviewRepository
from src.core.application.repositories.interview_repo.interviewdtos import (
    AnswerRequest,
    InterviewResultResponse,
    NextQuestionPayload,
    SubmitAnswerResponse,
)
from src.core.application.services.session_service.i_session_service import ISessionService
from src.core.domain.models import InterviewHistoryItem, User
from src.core.orchestration.graphs.interview_graph import get_interview_graph


class InterviewRepository(IInterviewRepository):
    def __init__(
        self,
        session_service: ISessionService,
        db:              AsyncSession,
        current_user:    User,
        session_history_repo: ISessionHistoryRepository
    ):
        self.session_service = session_service
        self.db              = db
        self.current_user    = current_user
        self.session_history_repo = session_history_repo

    # ── helpers ───────────────────────────────────────────────────────────────

    def _sub_config(self, session_id: str) -> dict:
        return {"configurable": {"thread_id": f"{session_id}_interview"}}

    def _build_next_question(
        self, values: dict, answered_index: int, max_questions: int
    ) -> Optional[NextQuestionPayload]:
        question = values.get("current_question", "")
        if not question:
            return None
        next_index = values.get("current_index", answered_index + 1)
        return NextQuestionPayload(
            index    = next_index,
            round    = values.get("current_round", ""),
            question = question,
            is_last  = (next_index == max_questions - 1),
        )

    async def _save_interview_history(
        self,
        session_id:   str,
        meta:         dict,
        values:       dict,
        selected_job: dict,
    ) -> None:
        """Lưu hoặc cập nhật kết quả phỏng vấn vào bảng interview_sessions."""
        user_id_str = meta.get("user_id")
        cv_id_str   = meta.get("cv_id")

        if not user_id_str or not cv_id_str:
            return

        user_uuid = UUID(str(user_id_str))
        cv_uuid   = UUID(str(cv_id_str))
        
        qa_history  = values.get("evaluated", [])
        summary     = values.get("summary", {})
        total_score = str(summary.get("total_score", "0"))
        level       = summary.get("level", "")
        
        job_title    = selected_job.get("title", "")
        company_name = selected_job.get("company", "")

        # Tìm bản ghi hiện có
        stmt = select(InterviewHistoryItem).where(InterviewHistoryItem.session_id == session_id)
        db_res = await self.db.execute(stmt)
        history_item = db_res.scalars().first()

        if not history_item:
            history_item = InterviewHistoryItem(
                user_id      = user_uuid,
                cv_id        = cv_uuid,
                session_id   = session_id,
                job_title    = job_title,
                company_name = company_name,
                total_score  = total_score,
                level        = level,
                summary      = summary,
                qa_history   = qa_history,
            )
            self.db.add(history_item)
        else:
            history_item.job_title    = job_title
            history_item.company_name = company_name
            history_item.total_score  = total_score
            history_item.level        = level
            history_item.summary      = summary
            history_item.qa_history   = qa_history

        await self.db.commit()

    # ── submit_answer ─────────────────────────────────────────────────────────

    @override
    async def submit_answer(self, req: AnswerRequest) -> SubmitAnswerResponse:
        try:
            sub_graph = get_interview_graph()
            config    = self._sub_config(req.session_id)
            # Lấy history job selected
            history = await self.session_history_repo.get_by_session_id(req.session_id)
            if not history:
                raise ValueError("Session không tồn tại hoặc checkpoint trống")
            
            if history.current_step != "interviewing":
                raise ValueError("Không đang trong phỏng vấn")
            
            # ── 2. Lấy câu hỏi hiện tại từ checkpoint ─────
            try:
                checkpoint = await sub_graph.aget_state(config)
            except Exception as e:
                raise ValueError(f"Không lấy được checkpoint: {str(e)}")
            
            vals             = checkpoint.values
            current_index    = vals.get("current_index", 0)
            current_round    = vals.get("current_round", "")
            current_question = vals.get("current_question", "")
            max_questions    = vals.get("max_questions", 5)

            print(
                f"📝 Answer câu {current_index + 1}/{max_questions} "
                f"[{current_round}]: {req.answer[:50]}..."
            )

            # ── 3. Resume sub-graph với answer ────────────
            await sub_graph.aupdate_state(
                config,
                {"current_answer": req.answer},
                as_node = "ask_question",
            )

            # DEBUG: kiểm tra next sau update_state
            checkpoint_after = await sub_graph.aget_state(config)
            print(f"DEBUG next after update: {checkpoint_after.next}")

            final = {}
            async for event in sub_graph.astream(None, config):
                for node_name, node_state in event.items():
                    print(f"  ✓ [sub:{node_name}]")
                    if isinstance(node_state, dict):
                        print(f"     keys: {list(node_state.keys())}")
                        final = {**final, **node_state}

            # DEBUG: kiểm tra final state
            print(f"DEBUG final keys: {list(final.keys())}")
            print(f"DEBUG final.is_done: {final.get('is_done')}")
            print(f"DEBUG final.current_index: {final.get('current_index')}")
            print(f"DEBUG final.current_question: {str(final.get('current_question',''))[:80]}")

            is_done    = final.get("is_done", False)
            next_index = final.get("current_index", 0)

            # ── 4. Lưu Q&A vào DB ngay ───────────────────
            await self.session_history_repo.upsert_qa(
                session_id = req.session_id,
                qa_pair    = {
                    "index":    current_index,
                    "round":    current_round,
                    "question": current_question,
                    "answer":   req.answer,
                }
            )

            # ── 5. Xử lý khi hoàn thành 5 câu ────────────
            if is_done:
                evaluated = final.get("evaluated", [])
                summary   = final.get("summary", {})

                # Lưu score + feedback từng câu
                if evaluated:
                    await self.session_history_repo.save_evaluations(
                        session_id = req.session_id,
                        evaluated  = evaluated,
                    )

                # Lưu summary vào AgentSession
                await self.session_history_repo.apply_event(
                    event_interview_done(
                        session_id = req.session_id,
                        summary    = summary,
                    )
                )

                print(
                    f"✅ Interview done: "
                    f"{summary.get('total_score')}/100 "
                    f"— {summary.get('level')}"
                )

                return SubmitAnswerResponse(
                    session_id=req.session_id,
                    answered_index=current_index,
                    total_questions=max_questions,
                    is_done=True,
                    next_question=None,
                    summary=summary,
                    evaluated=evaluated,
                )
            # ── 6. Còn câu tiếp theo ─────────────────────
            next_question = None
            if next_index < max_questions:
                next_question = {
                    "index":    next_index,
                    "round":    final.get("current_round", ""),
                    "question": final.get("current_question", ""),
                    "is_last":  next_index == max_questions - 1,
                }

            return SubmitAnswerResponse(
                session_id=req.session_id,
                answered_index=current_index,
                total_questions=max_questions,
                is_done=False,
                next_question=next_question,
                summary=None,
                evaluated=None,
            )
        except Exception as exc:
            return SubmitAnswerResponse(
                session_id=req.session_id,
                answered_index=0,
                total_questions=0,
                is_done=False,
                error=str(exc),
            )

    # ── get_result ────────────────────────────────────────────────────────────
    @override
    async def get_result(self, session_id: str) -> InterviewResultResponse:
        try:
            history = await self.session_history_repo.get_by_session_id(session_id)
            if not history:
                return InterviewResultResponse(
                    session_id = session_id,
                    error      = "Không tìm thấy lịch sử phỏng vấn",
                )

            # Nếu summary rỗng → chưa phỏng vấn xong
            if history.current_step != "interview_done":
                return InterviewResultResponse(
                    session_id = session_id,
                    error      = "Phỏng vấn chưa hoàn tất",
                )

            qa_pairs = await self.session_history_repo.get_qa_pairs(session_id)
            qa_list  = [
                {
                    "index":      q.qa_index,
                    "round":      q.round,
                    "question":   q.question,
                    "answer":     q.answer,
                    "score":      q.score,
                    "feedback":   q.feedback,
                    "suggestion": q.suggestion,
                    "asked_at":   q.asked_at.isoformat()
                                if q.asked_at else None,
                    "answered_at": q.answered_at.isoformat()
                                if q.answered_at else None,
                }
                for q in qa_pairs
            ]

            scored    = [q for q in qa_pairs if q.score is not None]
            avg_score = (
                sum(q.score for q in scored) / len(scored) * 10
                if scored else 0
            )

            selected_job = history.selected_job or {}
            return InterviewResultResponse(
                session_id   = session_id,
                job_title    = selected_job.get("title", ""),
                company_name = selected_job.get("company", ""),
                summary      = {
                    "total_score": int(avg_score),
                    "level":       history.interview_level or "",
                },
                qa_pairs     = qa_list,
                completed_at = history.updated_at.isoformat(),
            )

        except Exception as exc:
            return InterviewResultResponse(session_id=session_id, error=str(exc))

    # ── get_history ───────────────────────────────────────────────────────────

    @override
    async def get_history(self) -> list:
        result = await self.db.execute(
            select(InterviewHistoryItem)
            .where(InterviewHistoryItem.user_id == self.current_user.id)
            .order_by(InterviewHistoryItem.created_at.desc())
        )
        rows = result.scalars().all()
        return [
            {
                "record_id":    str(row.id),
                "session_id":   row.session_id,
                "job_title":    row.job_title    or "",
                "company_name": row.company_name or "",
                "total_score":  int(row.total_score) if row.total_score else None,
                "level":        row.level,
                "created_at":   row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ]

    # ── get_history_detail ────────────────────────────────────────────────────

    @override
    async def get_history_detail(self, record_id: UUID) -> dict:
        result = await self.db.execute(
            select(InterviewHistoryItem).where(
                InterviewHistoryItem.id      == record_id,
                InterviewHistoryItem.user_id == self.current_user.id,
            )
        )
        row = result.scalar_one_or_none()
        if not row:
            raise ValueError(f"Không tìm thấy lịch sử phỏng vấn: {record_id}")
        return {
            "record_id":    str(row.id),
            "session_id":   row.session_id,
            "job_title":    row.job_title    or "",
            "company_name": row.company_name or "",
            "total_score":  int(row.total_score) if row.total_score else None,
            "level":        row.level,
            "summary":      row.summary,
            "qa_history":   row.qa_history,
            "created_at":   row.created_at.isoformat() if row.created_at else None,
        }
