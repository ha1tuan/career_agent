import json
from typing import AsyncGenerator

from src.core.application.services.session_service.i_session_service import ISessionService
from src.core.orchestration.graphs.graph import get_graph
from src.core.orchestration.graphs.interview_graph import get_interview_graph

# Steps where the graph is paused waiting for user input
_HITL_STEPS = {"jobs_found", "companies_researched", "interviewing"}


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


def _node_label(event: dict) -> str | None:
    """Trả về tên node LangGraph từ metadata event, hoặc None."""
    meta = event.get("metadata") or {}
    return meta.get("langgraph_node")


def _build_hitl_data(step: str, values: dict) -> dict:
    if step == "jobs_found":
        return {"job_results": values.get("job_results", [])}
    if step == "companies_researched":
        return {"company_research": values.get("company_research", {})}
    if step == "interviewing":
        return {
            "current_question": values.get("current_question"),
            "current_round":    values.get("current_round"),
            "current_index":    values.get("current_index"),
            "max_questions":    values.get("max_questions"),
            "qa_pairs":         values.get("qa_pairs", []),
        }
    return {}


async def stream_graph_events(
    session_id:      str,
    session_service: ISessionService,
) -> AsyncGenerator[str, None]:
    
    # 1. Kiểm tra metadata Redis
    meta = await session_service.get_metadata(session_id)
    if not meta:
        yield _sse({"type": "error", "message": "Session không tồn tại hoặc đã hết hạn (24h)"})
        return

    # NGAY LẬP TỨC TRẢ VỀ EVENT CONNECTION ĐỂ GIỮ KẾT NỐI SSE (Chống Nginx ngắt sớm)
    yield _sse({"type": "connection", "status": "connected", "message": "Khởi tạo luồng dữ liệu..."})

    graph  = await get_graph()
    config = {"configurable": {"thread_id": session_id}}

    # 2. Đọc state hiện tại từ PostgresSaver
    state = await graph.aget_state(config)

    # 3. Kiểm tra xem graph có đang THỰC SỰ bị pause ở HITL step không
    # Sử dụng state.next để xác định graph đang chờ resume
    if state and state.values:
        current_step = state.values.get("current_step", "")
        
        # Nếu state.next có dữ liệu, tức là graph đang bị interrupt_after/before chặn lại
        if state.next and (current_step in _HITL_STEPS):
            restore_state = dict(state.values)
            
            if current_step == "interviewing":
                sub_graph  = await get_interview_graph()
                sub_config = {"configurable": {"thread_id": f"{session_id}_interview"}}
                sub_state  = await sub_graph.aget_state(sub_config)
                if sub_state and sub_state.values:
                    restore_state.update(sub_state.values)

            yield _sse({"type": "restore", "step": current_step, "state": restore_state})
            return

    # 4. Stream graph events
    try:
        async for event in graph.astream_events(None, config, version="v2"):
            etype = event.get("event", "")
            node  = _node_label(event)
            name  = event.get("name", "")

            # Node bắt đầu chạy
            if etype == "on_chain_start" and node:
                yield _sse({"type": "progress", "step": node, "message": f"Đang xử lý {node}..."})

            # BẮT BUỘC THÊM: Báo cho FE biết AI đang gọi Tool
            elif etype == "on_tool_start":
                yield _sse({"type": "progress", "step": "tool", "message": f"Đang sử dụng công cụ: {name}..."})

            # LLM stream token
            elif etype == "on_chat_model_stream":
                chunk = event.get("data", {}).get("chunk")
                if chunk and hasattr(chunk, "content") and chunk.content:
                    yield _sse({"type": "token", "content": chunk.content})

            # Node hoàn thành
            elif etype == "on_chain_end" and node:
                output = event.get("data", {}).get("output")
                step   = output.get("current_step") if isinstance(output, dict) else None
                if step:
                    yield _sse({
                        "type": "result",
                        "step": node,
                        "data": {"current_step": step},
                    })

    except Exception as exc:
        yield _sse({"type": "error", "message": f"Lỗi stream: {str(exc)}"})
        return

    # 5. Sau khi stream xong — kiểm tra final state
    final = await graph.aget_state(config)
    if not final or not final.values:
        yield _sse({"type": "done", "step": "done", "message": "Hoàn thành"})
        return

    final_step = final.values.get("current_step", "")

    # Tương tự như trên, dùng final.next để kiểm tra chính xác trạng thái interrupt
    if final.next and (final_step in _HITL_STEPS):
        hitl_data = _build_hitl_data(final_step, final.values)

        if final_step == "interviewing":
            sub_graph  = await get_interview_graph()
            sub_config = {"configurable": {"thread_id": f"{session_id}_interview"}}
            sub_state  = await sub_graph.aget_state(sub_config)
            if sub_state and sub_state.values:
                hitl_data.update(sub_state.values)

        yield _sse({
            "type":    "hitl",
            "step":    final_step,
            "message": "Chờ quyết định từ bạn",
            "data":    hitl_data,
        })
    else:
        yield _sse({
            "type":    "done",
            "step":    final_step or "done",
            "message": "Hoàn thành workflow",
        })