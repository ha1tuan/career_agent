from src.core.orchestration.utils.helper import (
    _build_session_event,
    _msg_llm_start,
    _get_parent_node,
    _msg_node_start,
)
from src.core.orchestration.session.session_events import (
    event_graph_error,
    SessionEvent,
    SessionEventType,
)
from src.core.orchestration.graphs.graph import get_graph
from src.core.application.services.session_service.i_session_service import (
    ISessionService,
)
from src.core.infrastructure.services.session_service import SessionService
from src.api.config.redis_client import get_redis_client

GRAPH_NODES = {
    "job_finder",
    "company_researcher",
    "interviewer",
}

class GraphRunner:

    @staticmethod
    async def run(
        session_id: str,
        user_id:    str,
        cv_id:      str,
    ) -> None:
        """
        Chạy graph đến HITL rồi dừng.
        Gọi từ BackgroundTasks — không block API.

        Redis: cập nhật progress realtime
        DB:    cập nhật sau mỗi node hoàn thành (chỉ nodes trong GRAPH_NODES)
        """
        graph       = get_graph()
        config      = {"configurable": {"thread_id": session_id}}
        session_svc = SessionService(get_redis_client())

        await GraphRunner._emit(SessionEvent(
            type         = SessionEventType.GRAPH_RUNNING,
            session_id   = session_id,
            current_step = "running",
        ))
        await session_svc.set_progress(
            session_id, "🚀 Đang khởi động..."
        )

        try:
            async for event in graph.astream_events(
                None, config, version="v2"
            ):
                await GraphRunner._handle_event(
                    event, session_id, session_svc
                )

            # DEBUG — xác nhận interrupt hoạt động
            try:
                snapshot = await graph.aget_state(config)
                print(f"DEBUG [{session_id}] snapshot.next = {snapshot.next}")
                print(f"DEBUG [{session_id}] current_step  = {snapshot.values.get('current_step')}")
                print(f"DEBUG [{session_id}] company_name  = {snapshot.values.get('company_name')!r}")
            except Exception as _e:
                print(f"DEBUG [{session_id}] aget_state error: {_e}")

        except Exception as e:
            print(f"❌ GraphRunner lỗi: {e}")
            await session_svc.set_progress(
                session_id, f"❌ Lỗi: {str(e)[:80]}"
            )
            await GraphRunner._emit(
                event_graph_error(session_id)
            )

    # ── Xử lý từng event ──────────────────────────
    @staticmethod
    async def _handle_event(
        event:       dict,
        session_id:  str,
        session_svc: SessionService,
    ) -> None:
        etype = event.get("event", "")
        name  = event.get("name", "")

        # Node bắt đầu → Redis progress (chỉ nodes hợp lệ)
        if etype == "on_chain_start" and name in GRAPH_NODES:
            msg = _msg_node_start(name)
            if msg:
                await session_svc.set_progress(session_id, msg)
                await session_svc.set_progress_step(session_id, name)

        # Tool bắt đầu → Redis progress
        elif etype == "on_tool_start":
            await session_svc.set_progress(
                session_id, "🔎 Đang tìm kiếm thông tin..."
            )

        # Tool xong → Redis progress
        elif etype == "on_tool_end":
            output = event.get("data", {}).get("output")
            count  = (
                len(output)
                if isinstance(output, list)
                else None
            )
            msg = "📋 Tìm kiếm xong"
            if count:
                msg += f" · {count} kết quả"
            await session_svc.set_progress(session_id, msg)

        # LLM bắt đầu generate → Redis progress (chỉ khi parent node hợp lệ)
        elif etype == "on_chat_model_start":
            node = _get_parent_node(event)
            if node in GRAPH_NODES:
                await session_svc.set_progress(
                    session_id, _msg_llm_start(node)
                )

        # Node hoàn thành → xóa progress → lưu DB (chỉ nodes hợp lệ)
        elif etype == "on_chain_end" and name in GRAPH_NODES:
            output = event.get("data", {}).get("output")
            if not isinstance(output, dict):
                return

            await session_svc.clear_progress(session_id)
            await session_svc.clear_progress_step(session_id)

            session_event = _build_session_event(
                session_id, name, output
            )
            if session_event:
                await GraphRunner._emit(session_event)

    @staticmethod
    async def _emit(event: SessionEvent) -> None:
        from src.core.infrastructure.persistence.session import AsyncSessionFactory
        from src.core.infrastructure.repositories.session_history_repo import SessionHistoryRepository

        try:
            async with AsyncSessionFactory() as db:
                repo = SessionHistoryRepository(db)
                await repo.apply_event(event)
        except Exception as e:
            print(f"⚠️ Emit lỗi [{event.type}]: {e}")
