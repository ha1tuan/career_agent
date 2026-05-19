import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAgentStore } from '../stores/agentStore';
import { useAuthStore } from '../stores/authStore';
import CVUpload from '../components/agent/CVUpload';
import CVDuplicateDialog from '../components/agent/CVDuplicateDialog';

export default function AgentPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    uploadCV, confirmDuplicate, proceedToAgentStart, fetchSession,
    runAndPoll, clearHitlEvent,
    sessionId, session,
    hitlEvent, sseStatus, streamMessage,
    loading, loadingStep, error,
    cvUploadStatus, existingCv,
  } = useAgentStore();

  // Navigate dựa trên step từ hitlEvent
  useEffect(() => {
    if (!hitlEvent) return;
    const sid = sessionId || session?.session_id;
    const routes = {
      job_finder:           `/agent/${sid}/jobs`,
      companies_researched: `/agent/${sid}/company`,
      interviewing:         `/agent/${sid}/interview`,
    };
    const route = routes[hitlEvent.step];
    if (route) { clearHitlEvent(); navigate(route); }
  }, [hitlEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hiển thị lỗi SSE
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // Bắt đầu agent từ cv_id đã biết — xử lý cached vs mới
  const doAgentStart = async (cvId) => {
    const sessionData = await proceedToAgentStart(cvId);
    const sid = sessionData.session_id;

    if (sessionData.cached) {
      // Session cũ đang active → fetch state rồi navigate đúng trang
      const { currentStep } = await fetchSession(sid);
      const CACHED_ROUTES = {
        job_finder:           `/agent/${sid}/jobs`,
        companies_researched: `/agent/${sid}/company`,
        interviewing:         `/agent/${sid}/interview`,
        interview_done:       `/agent/${sid}/interview/result`,
      };
      const route = CACHED_ROUTES[currentStep];
      if (route) { navigate(route); return; }
    }

    // Session mới → trigger graph + bắt đầu poll
    await runAndPoll(sid);
  };

  const handleUpload = async (file) => {
    try {
      const result = await uploadCV(file, user?.id);
      if (result.is_duplicate) return; // dialog được render bởi cvUploadStatus === 'duplicate'
      await doAgentStart(result.cv.id);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDuplicateConfirm = async (confirm) => {
    try {
      const res = await confirmDuplicate(existingCv.id, confirm);
      await doAgentStart(res.cv_id);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Đang stream (AI đang tìm việc)
  if (sseStatus === 'connecting' || sseStatus === 'active') {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-14 h-14 rounded-full border-4 border-slate-700 border-t-indigo-500 animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-base font-medium text-slate-200">
            {streamMessage || loadingStep || 'AI đang xử lý...'}
          </p>
          <p className="text-sm text-slate-500">Đang tìm những vị trí phù hợp với CV của bạn</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← Dashboard
          </button>
          <span className="text-slate-600">|</span>
          <span className="font-medium text-slate-300">Upload CV</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center gap-2 mb-8 text-sm">
          {['Upload CV', 'Chọn việc', 'Tìm hiểu công ty', 'Hành động'].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${i === 0 ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-500'}`}>
                {i + 1}
              </div>
              <span className={i === 0 ? 'text-slate-200' : 'text-slate-500'}>{step}</span>
              {i < 3 && <span className="text-slate-700">→</span>}
            </div>
          ))}
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100">Upload CV của bạn</h1>
          <p className="text-slate-400 mt-1">
            AI sẽ phân tích CV và tìm những công việc phù hợp nhất cho bạn.
          </p>
        </div>

        <CVUpload onUpload={handleUpload} loading={loading} loadingStep={loadingStep} />
      </main>

      {/* Duplicate dialog — hiện khi phát hiện CV trùng */}
      {cvUploadStatus === 'duplicate' && existingCv && (
        <CVDuplicateDialog
          existingCv={existingCv}
          onConfirm={handleDuplicateConfirm}
          loading={loading}
        />
      )}
    </div>
  );
}
