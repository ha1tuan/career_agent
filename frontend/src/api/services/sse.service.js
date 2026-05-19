const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * Open an SSE stream for the given session.
 * Returns the EventSource so callers can close it manually if needed.
 *
 * handlers: {
 *   onProgress(event)       — event.step, event.message
 *   onToken(event)          — event.content (streaming text)
 *   onResult(event)         — event.data (intermediate node result)
 *   onHitl(event)           — event.step, event.data  → SSE auto-closed
 *   onRestore(event)        — event.step, event.state → SSE auto-closed
 *   onError(event)          — event.message           → SSE auto-closed
 *   onDone(event)           —                         → SSE auto-closed
 *   onConnectionError()     — network/reconnect issue
 * }
 */
export function createSSEConnection(sessionId, handlers = {}) {
  // Thêm query params nếu cần thiết (ví dụ chống cache trình duyệt)
  const es = new EventSource(`${BASE_URL}/api/v1/agent/stream/${sessionId}?t=${Date.now()}`);

  let inactivityTimer = null;
  const TIMEOUT_MS = 180000; // 3 phút không có data thì tự ngắt

  // Hàm reset timer mỗi khi nhận được bất kỳ tín hiệu nào từ server
  const resetWatchdog = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      console.warn("⏳ Mất kết nối im lặng (Silent Hang). Server không phản hồi quá lâu.");
      es.close();
      handlers.onError?.({ type: 'error', message: 'Kết nối bị gián đoạn do quá tải. Vui lòng thử lại.' });
    }, TIMEOUT_MS);
  };

  es.onopen = () => {
    // Bắt đầu đếm giờ ngay khi kết nối mở
    resetWatchdog();
  };

  es.onmessage = (e) => {
    // Có data về -> Xóa đếm giờ cũ, bắt đầu đếm lại
    resetWatchdog();

    let event;
    try { event = JSON.parse(e.data); } catch { return; }

    switch (event.type) {
      case 'connection': // Event xác nhận kết nối thành công từ backend
        handlers.onConnection?.(event);
        break;
      case 'progress':
        handlers.onProgress?.(event);
        break;
      case 'token':
        handlers.onToken?.(event);
        break;
      case 'result':
        handlers.onResult?.(event);
        break;
      case 'hitl':
        clearTimeout(inactivityTimer); // Dừng watchdog khi vào HITL
        es.close();
        handlers.onHitl?.(event);
        break;
      case 'restore':
        clearTimeout(inactivityTimer);
        es.close();
        handlers.onRestore?.(event);
        break;
      case 'error':
        clearTimeout(inactivityTimer);
        es.close();
        handlers.onError?.(event);
        break;
      case 'done':
        clearTimeout(inactivityTimer);
        es.close();
        handlers.onDone?.(event);
        break;
      default:
        break;
    }
  };

  es.onerror = (err) => {
    clearTimeout(inactivityTimer);
    
    // Ngăn EventSource tự động reconnect liên tục gây spam server
    es.close(); 
    
    handlers.onConnectionError?.(err);
  };

  // Trả về hàm hủy (cleanup function) để FE có thể chủ động tắt khi unmount component
  return {
    close: () => {
      clearTimeout(inactivityTimer);
      es.close();
    }
  };
}