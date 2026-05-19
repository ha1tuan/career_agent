import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAgentStore } from '../stores/agentStore';

// Maps backend current_step → route the user should be on
const STEP_ROUTES = {
  ready:                (id) => `/agent/${id}/jobs`,
  job_finder:           (id) => `/agent/${id}/jobs`,
  companies_researched: (id) => `/agent/${id}/company`,
  interviewing:         (id) => `/agent/${id}/interview`,
  interview_done:       (id) => `/agent/${id}/interview/result`,
};

/**
 * Gọi trong các page có session ID trong URL.
 * Khi F5: fetch session → restore state → redirect đúng route theo current_step.
 * @param {string} expectedStep — step mà page hiện tại xử lý
 */
export function useSessionRecovery(expectedStep) {
  const navigate = useNavigate();
  const { id: sessionId } = useParams();
  const { session, sessionId: storedId, fetchSession, runAndPoll, startPolling } = useAgentStore();

  useEffect(() => {
    if (!sessionId) return;
    // Store đã có session này → không cần fetch lại
    if (session?.session_id === sessionId || storedId === sessionId) return;

    fetchSession(sessionId)
      .then(({ currentStep }) => {
        if (currentStep === 'not_found') {
          navigate('/dashboard', { replace: true });
          return;
        }

        // Backend vẫn đang chạy → trigger run + poll, hoặc chỉ poll
        if (currentStep === 'ready') {
          runAndPoll(sessionId).catch(() => {
            toast.error('Không thể khởi động lại phiên làm việc');
            navigate('/dashboard', { replace: true });
          });
          return;
        }
        if (currentStep === 'running') {
          startPolling(sessionId);
          return;
        }

        if (currentStep === expectedStep) return; // đúng trang

        const route = STEP_ROUTES[currentStep]?.(sessionId);
        if (route) navigate(route, { replace: true });
      })
      .catch(() => {
        toast.error('Không thể tải phiên làm việc');
        navigate('/dashboard', { replace: true });
      });
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps
}
