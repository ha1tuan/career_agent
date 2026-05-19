import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAgentStore } from '../stores/agentStore';
import { useSessionRecovery } from '../hooks/useSessionRecovery';

const ROUND_LABELS = {
  opening: 'Mở đầu',
  technical: 'Kỹ thuật',
  behavioral: 'Hành vi',
  behavior: 'Hành vi',
  situational: 'Tình huống',
  culture_fit: 'Văn hóa',
  closing: 'Kết thúc',
};

const ROUND_COLORS = {
  opening: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  technical: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  behavioral: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  behavior: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  situational: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  culture_fit: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
  closing: 'text-green-400 bg-green-500/10 border-green-500/20',
};

export default function InterviewPage() {
  const navigate = useNavigate();
  const {
    session, sessionId, selectedJob, companyIntel,
    interviewMessages, interviewResult,
    submitAnswer, loading,
  } = useAgentStore();

  useSessionRecovery('interviewing');

  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const sid = sessionId || session?.session_id;

  // Khi interviewResult được set (is_done) → navigate sang result page
  useEffect(() => {
    if (!interviewResult) return;
    navigate(`/agent/${sid}/interview/result`, { replace: true });
  }, [interviewResult]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto scroll khi có message mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [interviewMessages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const answer = input.trim();
    setInput('');
    try {
      await submitAnswer(answer);
    } catch (err) {
      toast.error(err.message || 'Lỗi gửi câu trả lời');
      setInput(answer);
    } finally {
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Derive progress from the last AI message's meta
  const lastAiMeta = [...interviewMessages].reverse().find((m) => m.role === 'ai')?.meta;
  const progressCurrent = lastAiMeta ? lastAiMeta.current_index + 1 : 0;
  const progressTotal = lastAiMeta?.total ?? 5;
  const progressPct = progressTotal > 0 ? (progressCurrent / progressTotal) * 100 : 0;
  const isDone = !!interviewResult;

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a]">
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="text-slate-500 hover:text-slate-300 transition-colors shrink-0 text-lg leading-none"
              >
                ←
              </button>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">
                  {selectedJob?.title || 'Phỏng vấn'}
                </p>
                <p className="text-xs text-indigo-400 truncate">
                  {companyIntel?.name || selectedJob?.company}
                </p>
              </div>
            </div>
            <div className="shrink-0 ml-3">
              {isDone ? (
                <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
                  Hoàn thành
                </span>
              ) : loading ? (
                <span className="text-xs text-slate-400 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full">
                  Đang xử lý...
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  Đang diễn ra
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {!isDone && progressTotal > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">
                  Câu {progressCurrent} / {progressTotal}
                </span>
                {lastAiMeta?.round && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${ROUND_COLORS[lastAiMeta.round] ?? 'text-slate-400 bg-slate-800 border-slate-700'}`}>
                    {ROUND_LABELS[lastAiMeta.round] ?? lastAiMeta.round}
                  </span>
                )}
              </div>
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

          {/* Waiting for first question */}
          {interviewMessages.length === 0 && !isDone && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-indigo-500/20 rounded-full flex items-center justify-center shrink-0">
                🤖
              </div>
              <div className="bg-[#1e293b] border border-slate-700/60 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center h-5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.18}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {interviewMessages.map((msg, i) => (
            <div key={i}>
              {msg.role === 'ai' && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-indigo-500/20 rounded-full flex items-center justify-center text-base shrink-0 mt-0.5">
                    🤖
                  </div>
                  <div className="bg-[#1e293b] border border-slate-700/60 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[88%]">
                    {msg.meta && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-indigo-400 font-medium">
                          Câu {msg.meta.current_index + 1}/{msg.meta.total}
                        </span>
                        {msg.meta.round && (
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${ROUND_COLORS[msg.meta.round] ?? 'text-slate-400 bg-slate-800 border-slate-700'}`}>
                            {ROUND_LABELS[msg.meta.round] ?? msg.meta.round}
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-slate-200 text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              )}

              {msg.role === 'user' && (
                <div className="flex items-start gap-3 justify-end">
                  <div className="bg-indigo-600 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[88%]">
                    <p className="text-white text-sm leading-relaxed">{msg.content}</p>
                  </div>
                  <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center text-base shrink-0 mt-0.5">
                    👤
                  </div>
                </div>
              )}

              {msg.role === 'feedback' && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-amber-500/20 rounded-full flex items-center justify-center text-base shrink-0 mt-0.5">
                    💡
                  </div>
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[88%]">
                    <p className="text-xs text-amber-400 font-medium mb-1.5">Nhận xét</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{msg.content}</p>
                    {msg.meta?.score != null && (
                      <p className="text-xs text-amber-400/80 mt-2">Điểm: {msg.meta.score}/10</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* AI typing indicator */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-indigo-500/20 rounded-full flex items-center justify-center text-base shrink-0">
                🤖
              </div>
              <div className="bg-[#1e293b] border border-slate-700/60 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center h-5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.18}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      {!isDone && (
        <div className="border-t border-slate-800 bg-[#0f172a]/95 backdrop-blur p-4">
          <div className="max-w-3xl mx-auto flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập câu trả lời... (Enter để gửi, Shift+Enter xuống dòng)"
              rows={3}
              disabled={loading}
              className="flex-1 bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100
                placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500/70 transition-colors
                disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="shrink-0 w-12 h-12 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40
                disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors
                shadow-lg shadow-indigo-500/20"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
