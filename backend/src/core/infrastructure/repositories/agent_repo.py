from src.core.orchestration.session.session_events import event_action_selected, event_job_selected
from src.core.orchestration.session.graph_runner import GraphRunner
from fastapi import BackgroundTasks
from src.core.orchestration.session.session_events import SessionEvent
from src.core.orchestration.session.session_events import SessionEventType
from src.core.orchestration.state import AgentState
from src.core.application.repositories.session_history_repo import ISessionHistoryRepository
from typing import override
from uuid import UUID

from src.core.application.repositories.agent_repo import IAgentRepository
from src.core.application.repositories.agent_repo.agentdtos import (
    AgentSessionResponse,
    ResumeAgentRequest,
    ResumeAgentResponse,
    StartAgentRequest,
    StartAgentResponse,
)
from src.core.application.services.cv_service.i_cv_service import ICVService
from src.core.application.services.session_service.i_session_service import ISessionService
from src.core.orchestration.graphs.graph import get_graph
from src.core.orchestration.graphs.interview_graph import get_interview_graph

HITL_STEPS = [
    "jobs_found",
    "companies_researched",
    "interviewing",
    "interview_done",
]

class AgentRepository(IAgentRepository):

    def __init__(self, session_service: ISessionService, cv_service: ICVService, session_history_repo: ISessionHistoryRepository):
        self.session_service = session_service
        self.cv_service = cv_service
        self.session_history_repo = session_history_repo

    # ── helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _config(session_id: str) -> dict:
        return {"configurable": {"thread_id": session_id}}

    @staticmethod
    def _interview_config(session_id: str) -> dict:
        return {"configurable": {"thread_id": f"{session_id}_interview"}}

    # ── start_agent ───────────────────────────────────────────────────────────

    @override
    async def start_agent(self, request: StartAgentRequest, user_id: UUID) -> StartAgentResponse:
        session_id = await self.session_service.create_session_id(user_id, request.cv_id)
        history = await self.session_history_repo.get_by_session_id(session_id)
        #TH1 có dữ liệu trong history 
        if history and history.current_step not in ("ready", "error"):
            print(
                f"♻️  Session active: {session_id} "
                f"| step: {history.current_step}"
            )
            return StartAgentResponse(
                session_id   = session_id,
                current_step = history.current_step,
                message      = "Session đang active",
                cached       = True,
            )
        # TH2 + TH3: Tạo mới hoặc reset
        cv_doc = await self.cv_service.get_cv_by_id(cv_id=request.cv_id)
        if not cv_doc or cv_doc.user_id != user_id or not cv_doc.cv_data:
            return StartAgentResponse(
                session_id   = session_id,
                current_step = "ready",
                message      = "CV chưa parse hoặc không hợp lệ",
                cached       = False,
            )
        # Lưu vào history
        initial_state: AgentState = {
            "session_id":   session_id,
            "user_id":      str(user_id),
            "cv_id":        str(request.cv_id),
            "cv_data":      cv_doc.cv_data,
            "cv_raw_text":  cv_doc.raw_text or "",
            "current_step": "ready",
            "messages":     [],
            "error":        None,
            "failed_node":  None,
        }
        # Khởi tạo graph và flow
        graph  = await get_graph()
        config = self._config(session_id)
        await graph.aupdate_state(config, initial_state)

        # Insert hoặc reset DB
        if history:
            await self.session_history_repo.apply_event(SessionEvent(
                type         = SessionEventType.GRAPH_RUNNING,
                session_id   = session_id,
                current_step = "ready",
            ))
        else:
            await self.session_history_repo.create(
                session_id = session_id,
                user_id    = user_id,
                cv_id      = request.cv_id,
            )
            
        return StartAgentResponse(
            session_id   = session_id,
            current_step = "ready",
            message      = "Đã khởi tạo session",
            cached       = False,
        )
        
    @override
    async def run_agent(self, session_id: str, background_tasks: BackgroundTasks) -> AgentSessionResponse:
        history = await self.session_history_repo.get_by_session_id(session_id)
        if not history:
            raise ValueError("Session không tồn tại hoặc checkpoint trống")
        if history.current_step == "running":
            return AgentSessionResponse(
                session_id   = session_id,
                current_step = history.current_step,
                message      = "Session đang active",
                cached       = True,
            )
        
        runnable_steps = [
            "ready",           # Mới tạo → chạy job_finder
            "job_selected",    # Sau HITL #1 → chạy company_researcher
            "action_selected", # Sau HITL #2 → chạy interviewer
        ]
        if history.current_step not in runnable_steps:
            return AgentSessionResponse(
                session_id   = session_id,
                current_step = history.current_step,
                message      = "Step '{history.current_step}' không cần run. Dùng /resume nếu đang ở HITL.",
                cached       = True,
            )
        
        background_tasks.add_task(
            GraphRunner.run,
            session_id = session_id,
            user_id    = str(history.user_id),
            cv_id      = str(history.cv_id),
        )
        print(
            f"🚀 Triggered GraphRunner: {session_id} "
            f"| step: {history.current_step}"
        )

        return AgentSessionResponse(
            session_id   = session_id,
            current_step = "running",
            message      = "Graph đang chạy. Polling /session mỗi 2s",
            cached       = False,
        )
    
    # ── resume_agent ──────────────────────────────────────────────────────────

    @override
    async def resume_agent(self, req: ResumeAgentRequest, background_tasks: BackgroundTasks) -> ResumeAgentResponse:
        history = await self.session_history_repo.get_by_session_id(req.session_id)
        if not history:
            raise ValueError("Session không tồn tại hoặc checkpoint trống")
        
        graph  = await get_graph()
        config = self._config(req.session_id)

        state = await graph.aget_state(config)
        if not state or not state.values:
            raise ValueError("Session không tồn tại hoặc checkpoint trống")

        current_step = history.current_step

        # HITL #1 — user chọn job (company_name hoặc job_selected trực tiếp)
        if (req.company_name or req.job_selected) and current_step in ("job_finder", "job_selected"):
            # Ưu tiên job_selected FE truyền thẳng; fallback lookup by company_name
            if req.job_selected:
                job_selected = req.job_selected
                company_name = req.job_selected.get("company", req.company_name or "")
            else:
                company_name = req.company_name
                job_selected = next(
                    (j for j in state.values.get("job_results", [])
                     if j.get("company") == company_name),
                    None,
                )

            await graph.aupdate_state(
                config,
                {
                    "company_name": company_name,
                    "job_selected": job_selected,
                    "current_step": "job_selected",
                },
                as_node="job_finder",
            )

            # Update AgentSession DB
            await self.session_history_repo.apply_event(
                event_job_selected(
                    req.session_id,
                    job_selected,
                )
            )
            # Trigger GraphRunner background
            background_tasks.add_task(
                GraphRunner.run,
                session_id = req.session_id,
                user_id    = str(history.user_id),
                cv_id      = str(history.cv_id),
            )

            print(
                f"▶ HITL #1: {req.session_id} "
                f"| company: {req.company_name}"
            )

            return ResumeAgentResponse(
                session_id   = req.session_id,
                current_step = "running",
                message      = "Đang chuẩn bị. Polling /session",
            )

        # HITL #2 — user gửi is_interview sau companies_researched
        if req.is_interview is not None and current_step in ("companies_researched", "action_selected"):
            await graph.aupdate_state(
                config,
                {
                    "is_interview": req.is_interview,
                    "current_step": "action_selected",
                },
                as_node="company_researcher",
            )
             # Update AgentSession DB
            await self.session_history_repo.apply_event(
                event_action_selected(
                    req.session_id,
                    req.is_interview,
                )
            )

            # Trigger GraphRunner background
            background_tasks.add_task(
                GraphRunner.run,
                session_id = req.session_id,
                user_id    = str(history.user_id),
                cv_id      = str(history.cv_id),
            )

            print(
                f"▶ HITL #2: {req.session_id} "
                f"| action: {req.next_action}"
            )
            return ResumeAgentResponse(
                session_id   = req.session_id,
                current_step = "running",
                message      = "Đang chuẩn bị. Polling /session",
            )

        raise ValueError(
            f"Không thể resume từ step '{current_step}' với dữ liệu đã gửi"
        )

    # ── get_session_state ─────────────────────────────────────────────────────

    @override
    async def get_session_state(self, session_id: str) -> AgentSessionResponse:
        # Kiểm tra session tồn tại trong DB
        history = await self.session_history_repo.get_by_session_id(session_id)
        if not history:
            raise ValueError("Session không tồn tại")

        # Đọc graph checkpoint
        graph  = await get_graph()
        config = self._config(session_id)
        state  = await graph.aget_state(config)

        # current_step ưu tiên từ DB (authoritative) vì DB được update bởi apply_event
        current_step = history.current_step

        # Đọc data từ graph state nếu có
        values = state.values if (state and state.values) else {}

        response = AgentSessionResponse(
            session_id        = session_id,
            current_step      = current_step,
            job_results       = history.job_results or values.get("job_results"),
            company_research  = history.company_research or values.get("company_research"),
            selected_job      = history.selected_job or values.get("job_selected"),
            interview_evaluated = values.get("interview_evaluated"),
            interview_summary   = history.interview_summary or values.get("interview_summary"),
            error             = values.get("error"),
            progress          = await self.session_service.get_progress(session_id),
        )

        # Đọc thêm interview sub-graph nếu đang phỏng vấn
        if current_step in ("interviewing", "interview_done"):
            sub_graph  = await get_interview_graph()
            sub_config = self._interview_config(session_id)
            sub_state  = await sub_graph.aget_state(sub_config)
            if sub_state and sub_state.values:
                sv = sub_state.values
                response.current_question       = sv.get("current_question")
                response.current_round          = sv.get("current_round")
                response.current_question_index = sv.get("current_index")
                response.max_questions          = sv.get("max_questions")
                response.interview_qa_pairs     = sv.get("qa_pairs", [])
                if sv.get("evaluated"):
                    response.interview_evaluated = sv.get("evaluated")
                if sv.get("summary"):
                    response.interview_summary = sv.get("summary")

        return response
    