from src.core.orchestration.utils.helper import (
    _build_session_event,
    _msg_llm_start,
    _get_parent_node,
    _msg_node_start,
)
from src.core.orchestration.session.session_events import (
    event_graph_error,
    event_graph_running,
)
from src.core.orchestration.graphs.graph import get_graph
from src.core.application.services.session_service.i_session_service import (
    ISessionService,
)
from src.core.infrastructure.services.session_service import SessionService
from src.api.config.redis_client import get_redis_client

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
        DB:    cập nhật sau mỗi node hoàn thành
        """
        graph       = get_graph()
        config      = {"configurable": {"thread_id": session_id}}
        session_svc = SessionService(get_redis_client())

        # ── Bắt đầu ──────────────────────────────
        await GraphRunner._emit(
            event_graph_running(session_id)
        )
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

        # Node bắt đầu → Redis progress
        if etype == "on_chain_start":
            msg = _msg_node_start(name)
            if msg:
                await session_svc.set_progress(
                    session_id, msg
                )

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

        # LLM bắt đầu generate → Redis progress
        elif etype == "on_chat_model_start":
            node = _get_parent_node(event)
            await session_svc.set_progress(
                session_id, _msg_llm_start(node)
            )

        # Node hoàn thành → xóa progress → lưu DB
        elif etype == "on_chain_end":
            output = event.get("data", {}).get("output")
            if not isinstance(output, dict):
                return

            # Xóa progress — node xong
            await session_svc.clear_progress(session_id)

            # Build event từ node output → lưu DB
            session_event = _build_session_event(
                session_id, name, output
            )
            if session_event:
                await GraphRunner._emit(session_event)