from datetime import datetime
from typing import Optional, override
from uuid import UUID
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.application.repositories.session_history_repo.ISessionHistoryRepository import ISessionHistoryRepository
from src.core.application.repositories.session_history_repo.sessionhistorydto import AgentSessionDto, InterviewQAPairDto
from src.core.domain.models import AgentSession, InterviewHistoryItem, InterviewQAPair
from src.core.orchestration.session.session_events import SessionEvent

class SessionHistoryRepository(ISessionHistoryRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    @override
    async def create(
        self,
        session_id: str,
        user_id: UUID,
        cv_id: UUID
    ) -> AgentSession:
        try:
            record = AgentSession(
                session_id = session_id,
                user_id    = user_id,
                cv_id      = cv_id,
                current_step = "ready",
            )
            self.session.add(record)
            await self.session.commit()
            await self.session.refresh(record)
            return record
        except Exception as e:
            await self.session.rollback()
            raise ValueError(f"Không thể tạo session: {e}")

    @override
    async def apply_event(
        self,
        event: SessionEvent
    ) -> AgentSession | None:
        try :
            record = await self.get_by_session_id(event.session_id)
            if not record:
                raise ValueError(f"Không tìm thấy session: {event.session_id}")

            # Update all non-None event attributes on the AgentSession record
            field_map = {
                "current_step":     event.current_step,
                "job_count":        event.job_count,
                "job_results":      event.job_results,
                "selected_job":     event.selected_job,
                "company_research": event.company_research,
                "is_interview":     event.is_interview,
                "interview_summary": event.interview_summary,
                "interview_score":  event.interview_score,
                "interview_level":  event.interview_level,
                "completed_at":     event.completed_at,
            }

            updated = []
            for field_name, value in field_map.items():
                if value is not None:
                    setattr(record, field_name, value)
                    updated.append(field_name)
            await self.session.commit()
            await self.session.refresh(record)
            print(f"✅ [{event.type}] updated: {updated}")
            return record
        except Exception as e:
            await self.session.rollback()
            raise ValueError(f"Không thể apply event {event.type}: {e}")

    @override
    async def upsert_qa(
        self,
        session_id: str,
        qa_pair: dict,
    ) -> None:
        try:
            qa_index = qa_pair.get("index", 0)
            if qa_index is None:
                raise ValueError("index is required in qa_pair")

            result = await self.session.execute(
                    select(InterviewQAPair).where(
                    InterviewQAPair.session_id == session_id,
                    InterviewQAPair.qa_index == qa_index
                )
            )
            record = result.scalar_one_or_none()

            if record:
                # Update existing record
                for field in (
                    "round", "question", "answer",
                    "score", "feedback", "suggestion",
                ):
                    val = qa_pair.get(field)
                    if val is not None:
                        setattr(record, field, val)
                if qa_pair.get("answer"):
                    record.answered_at = datetime.utcnow()
            else:
                pair = InterviewQAPair(
                    session_id  = session_id,
                    qa_index    = qa_index,
                    round       = qa_pair.get("round", ""),
                    question    = qa_pair.get("question", ""),
                    answer      = qa_pair.get("answer"),
                    score       = qa_pair.get("score"),
                    feedback    = qa_pair.get("feedback"),
                    suggestion  = qa_pair.get("suggestion"),
                    answered_at = datetime.utcnow()
                                if qa_pair.get("answer") else None,
                )
                self.session.add(pair)

            await self.session.commit()
            print(f"💾 Q&A upserted: câu {qa_index + 1}")
        except Exception as e:
            await self.session.rollback()
            raise ValueError(f"Không thể upsert qa: {e}")

    @override
    async def save_evaluations(
        self,
        session_id: str,
        evaluated: list[dict],
    ) -> None:
        # 1. Update individual InterviewQAPair records
        for item in evaluated:
            result = await self.session.execute(
                select(InterviewQAPair).where(
                    InterviewQAPair.session_id == session_id,
                    InterviewQAPair.qa_index == item.get("index", 0),
                )
            )
            pair = result.scalar_one_or_none()
            if pair:
                pair.score      = item.get("score")
                pair.feedback   = item.get("feedback")
                pair.suggestion = item.get("suggestion")

        await self.session.commit()
        
        print(f"💾 Evaluations saved: {len(evaluated)} câu")

    @override
    async def get_by_history_id(
        self,
        id: str
    ) -> UUID:
        history_uuid = UUID(id) if isinstance(id, str) else id
        result = await self.session.execute(
            select(InterviewHistoryItem).where(
                InterviewHistoryItem.id == history_uuid
            )
        )
        record = result.scalar_one_or_none()
        if not record:
            raise ValueError(f"Không tìm thấy lịch sử phỏng vấn: {id}")
        return record.cv_id

    @override
    async def get_history(
        self,
        user_id:    UUID,
        page_size:  int,
        page:       int
    ) -> list[AgentSessionDto]:
        offset_val = (page - 1) * page_size
        result = await self.session.execute(
            select(AgentSession)
            .where(AgentSession.user_id == user_id)
            .order_by(AgentSession.created_at.desc())
            .offset(offset_val)
            .limit(page_size)
        )
        return [AgentSessionDto.model_validate(row, from_attributes=True) for row in result.scalars().all()]

    @override
    async def count_history(self, user_id: UUID) -> int:
        result = await self.session.execute(
            select(func.count(AgentSession.id))
            .where(AgentSession.user_id == user_id)
        )
        return result.scalar_one()

    @override
    async def get_by_id(self, id: UUID) -> AgentSession | None:
        result = await self.session.execute(
            select(AgentSession).where(AgentSession.id == id)
        )
        return result.scalar_one_or_none()

    @override
    async def get_qa_pairs(
        self,
        session_id: str
    ) -> list[InterviewQAPairDto]:
        result = await self.session.execute(
            select(InterviewQAPair)
            .where(InterviewQAPair.session_id == session_id)
            .order_by(InterviewQAPair.qa_index.asc())
        )
        return [InterviewQAPairDto.model_validate(row, from_attributes=True) for row in result.scalars().all()]

    async def get_by_session_id(
        self,
        session_id: str
    ) -> Optional[AgentSession]:
        result = await self.session.execute(
            select(AgentSession).where(AgentSession.session_id == session_id)
        )
        return result.scalar_one_or_none()
