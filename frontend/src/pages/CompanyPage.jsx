import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAgentStore } from '../stores/agentStore';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useSessionRecovery } from '../hooks/useSessionRecovery';

export default function CompanyPage() {
  const navigate = useNavigate();
  const {
    companyIntel, selectedJob,
    confirmInterview, startPolling, clearHitlEvent,
    sessionId, session,
    hitlEvent, sseStatus, streamMessage,
    loading,
  } = useAgentStore();

  useSessionRecovery('companies_researched');

  const [activeTab, setActiveTab] = useState('job');
  const sid = sessionId || session?.session_id;

  // Khi hitl interviewing → navigate sang interview page
  useEffect(() => {
    if (!hitlEvent || hitlEvent.step !== 'interviewing') return;
    clearHitlEvent();
    navigate(`/agent/${sid}/interview`);
  }, [hitlEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartInterview = async () => {
    try {
      await confirmInterview();
      startPolling(sid);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Đang stream (AI đang chuẩn bị câu hỏi)
  if (sseStatus === 'connecting' || sseStatus === 'active') {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center gap-6">
        <div className="w-14 h-14 rounded-full border-4 border-slate-700 border-t-indigo-500 animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-base font-medium text-slate-200">
            {streamMessage || 'Đang chuẩn bị phỏng vấn...'}
          </p>
          <p className="text-sm text-slate-500">AI đang tạo câu hỏi phù hợp với vị trí của bạn</p>
        </div>
      </div>
    );
  }

  if (!companyIntel && !selectedJob) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-4xl">😕</p>
          <p className="text-slate-400">Không tìm thấy thông tin</p>
          <Button onClick={() => navigate('/dashboard')} variant="secondary">Về Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a]">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-200 transition-colors">
            ← Quay lại
          </button>
          <span className="text-slate-600">|</span>
          <span className="font-medium text-slate-300">Chi tiết vị trí ứng tuyển</span>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 pb-32">
        <div className="flex items-center gap-2 mb-6 text-sm overflow-x-auto">
          {['Upload CV', 'Chọn việc', 'Tìm hiểu', 'Phỏng vấn'].map((step, i) => (
            <div key={step} className="flex items-center gap-2 shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${i < 2 ? 'bg-green-500 text-white' : i === 2 ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-500'}`}>
                {i < 2 ? '✓' : i + 1}
              </div>
              <span className={i <= 2 ? 'text-slate-200' : 'text-slate-500'}>{step}</span>
              {i < 3 && <span className="text-slate-700">→</span>}
            </div>
          ))}
        </div>

        {/* Job banner */}
        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-5 mb-5">
          <h1 className="text-lg font-bold text-slate-100">{selectedJob?.title}</h1>
          <p className="text-indigo-400 font-medium mt-0.5">
            {selectedJob?.company || companyIntel?.name}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-slate-400">
            {selectedJob?.location && <span>📍 {selectedJob.location}</span>}
            {selectedJob?.salary && <span>💰 {selectedJob.salary}</span>}
            {selectedJob?.experience_years && <span>🧑‍💻 {selectedJob.experience_years}</span>}
          </div>
          {selectedJob?.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {selectedJob.tags.map((tag) => (
                <span key={tag} className="text-xs bg-slate-700/80 text-slate-300 px-2 py-0.5 rounded-md">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/60 p-1 rounded-xl mb-5">
          {[['job', '💼 Chi tiết công việc'], ['company', '🏢 Về công ty']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200
                ${activeTab === id ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Chi tiết công việc */}
        {activeTab === 'job' && (
          <div className="space-y-4">
            {selectedJob?.description && (
              <Card>
                <p className="text-xs text-slate-500 mb-2">📋 Mô tả vị trí</p>
                <p className="text-sm text-slate-300 leading-relaxed">{selectedJob.description}</p>
              </Card>
            )}
            {selectedJob?.requirements?.length > 0 && (
              <Card>
                <p className="text-xs text-slate-500 mb-3">✅ Yêu cầu ứng viên</p>
                <ul className="space-y-2">
                  {selectedJob.requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-indigo-400 mt-0.5 shrink-0">•</span>{req}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {selectedJob?.benefits?.length > 0 && (
              <Card>
                <p className="text-xs text-slate-500 mb-3">🎁 Quyền lợi</p>
                <ul className="space-y-2">
                  {selectedJob.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-green-400 mt-0.5 shrink-0">✓</span>{b}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {selectedJob?.match_reason && (
              <Card className="border-green-500/20 bg-green-500/5">
                <p className="text-xs text-green-400 mb-2">🎯 Lý do phù hợp</p>
                <p className="text-sm text-slate-300 leading-relaxed">{selectedJob.match_reason}</p>
              </Card>
            )}
            {selectedJob?.url && (
              <a
                href={selectedJob.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-slate-700
                  text-sm text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors"
              >
                Xem tin gốc ↗
              </a>
            )}
          </div>
        )}

        {/* Tab: Về công ty */}
        {activeTab === 'company' && companyIntel && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '🏭', label: 'Lĩnh vực', value: companyIntel.industry },
                { icon: '👥', label: 'Quy mô', value: companyIntel.size },
                { icon: '💻', label: 'Tech stack', value: companyIntel.tech_stack },
                { icon: '📦', label: 'Sản phẩm', value: companyIntel.products },
              ].filter((item) => item.value).map((item) => (
                <Card key={item.label} className="!p-4">
                  <p className="text-xs text-slate-500 mb-1">{item.icon} {item.label}</p>
                  <p className="text-sm font-medium text-slate-200">{item.value}</p>
                </Card>
              ))}
            </div>

            {companyIntel.culture && (
              <Card>
                <p className="text-xs text-slate-500 mb-2">🌱 Văn hoá công ty</p>
                <p className="text-sm text-slate-300 leading-relaxed">{companyIntel.culture}</p>
              </Card>
            )}

            {companyIntel.interview_process && (
              <Card>
                <p className="text-xs text-slate-500 mb-2">🎯 Quy trình phỏng vấn</p>
                <p className="text-sm text-slate-300 leading-relaxed">{companyIntel.interview_process}</p>
              </Card>
            )}

            {/* Pros & Cons */}
            {(companyIntel.pros?.length > 0 || companyIntel.cons?.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {companyIntel.pros?.length > 0 && (
                  <Card className="border-green-500/20 bg-green-500/5">
                    <p className="text-xs text-green-400 font-medium mb-2">👍 Ưu điểm</p>
                    <ul className="space-y-1.5">
                      {companyIntel.pros.map((p, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-300">
                          <span className="text-green-400 shrink-0">+</span>{p}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
                {companyIntel.cons?.length > 0 && (
                  <Card className="border-amber-500/20 bg-amber-500/5">
                    <p className="text-xs text-amber-400 font-medium mb-2">⚠️ Nhược điểm</p>
                    <ul className="space-y-1.5">
                      {companyIntel.cons.map((c, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-300">
                          <span className="text-amber-400 shrink-0">−</span>{c}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            )}

            {/* Legacy red_flags fallback */}
            {!companyIntel.pros?.length && companyIntel.red_flags && (
              <Card className="border-red-500/30 bg-red-500/5">
                <p className="text-xs text-red-400 mb-2">⚠️ Lưu ý</p>
                <p className="text-sm text-slate-300">{companyIntel.red_flags}</p>
              </Card>
            )}

            {companyIntel.recent_news && (
              <Card>
                <p className="text-xs text-slate-500 mb-2">📰 Tin tức gần đây</p>
                <p className="text-sm text-slate-300 leading-relaxed">{companyIntel.recent_news}</p>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'company' && !companyIntel && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-3xl mb-3">🏢</p>
            <p className="text-sm">Chưa có thông tin công ty</p>
          </div>
        )}
      </main>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 p-4">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handleStartInterview}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500
              disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6
              rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/20"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang chuẩn bị...
              </>
            ) : '🎤 Bắt đầu mô phỏng phỏng vấn'}
          </button>
        </div>
      </div>
    </div>
  );
}
