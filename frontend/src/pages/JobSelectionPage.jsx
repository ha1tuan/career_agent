import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAgentStore } from '../stores/agentStore';
import CVProfile from '../components/agent/CVProfile';
import JobCard from '../components/agent/JobCard';
import Button from '../components/ui/Button';
import { useSessionRecovery } from '../hooks/useSessionRecovery';

export default function JobSelectionPage() {
  const navigate = useNavigate();
  const {
    jobListings, cvProfile,
    resumeWithCompany, setSelectedJob, startPolling, clearHitlEvent,
    sessionId, session,
    hitlEvent, sseStatus, streamMessage,
    loading,
  } = useAgentStore();

  useSessionRecovery('job_finder');

  const [localSelected, setLocalSelected] = useState(null);

  const sid = sessionId || session?.session_id;

  // Khi hitl companies_researched → navigate sang company page
  useEffect(() => {
    if (!hitlEvent || hitlEvent.step !== 'companies_researched') return;
    clearHitlEvent();
    navigate(`/agent/${sid}/company`);
  }, [hitlEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lỗi SSE
  useEffect(() => {
    const { error } = useAgentStore.getState();
    if (error) toast.error(error);
  }, [sseStatus]);

  const handleContinue = async () => {
    if (!localSelected) { toast.error('Vui lòng chọn một vị trí'); return; }
    try {
      setSelectedJob(localSelected);
      await resumeWithCompany(localSelected.company, localSelected);
      startPolling(sid);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Đang stream (AI đang research công ty)
  if (sseStatus === 'connecting' || sseStatus === 'active') {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center gap-6">
        <div className="w-14 h-14 rounded-full border-4 border-slate-700 border-t-indigo-500 animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-base font-medium text-slate-200">
            {streamMessage || 'Đang research công ty...'}
          </p>
          <p className="text-sm text-slate-500">AI đang thu thập thông tin chi tiết về công ty</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/agent/new')} className="text-slate-400 hover:text-slate-200 transition-colors">
            ← Quay lại
          </button>
          <span className="text-slate-600">|</span>
          <span className="font-medium text-slate-300">Chọn vị trí ứng tuyển</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-8 text-sm">
          {['Upload CV', 'Chọn việc', 'Tìm hiểu công ty', 'Hành động'].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${i === 0 ? 'bg-green-500 text-white' : i === 1 ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-500'}`}>
                {i === 0 ? '✓' : i + 1}
              </div>
              <span className={i <= 1 ? 'text-slate-200' : 'text-slate-500'}>{step}</span>
              {i < 3 && <span className="text-slate-700">→</span>}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* <div className="lg:col-span-1">
            <h2 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Hồ sơ của bạn</h2>
            <CVProfile profile={cvProfile} />
          </div> */}

          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-slate-100">Vị trí phù hợp</h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  AI tìm được {jobListings.length} vị trí phù hợp với CV của bạn
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {jobListings.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  selected={localSelected?.id === job.id}
                  onClick={() => setLocalSelected(job)}
                />
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleContinue}
                size="lg"
                disabled={!localSelected || loading}
              >
                {loading ? 'Đang xử lý...' : 'Tiếp tục với vị trí này →'}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
