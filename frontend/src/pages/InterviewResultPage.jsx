import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentStore } from '../stores/agentStore';
import { useSessionRecovery } from '../hooks/useSessionRecovery';

const ROUND_LABELS = {
  opening: 'Mở đầu',
  technical: 'Kỹ thuật',
  behavioral: 'Hành vi',
  behavior: 'Hành vi',
  situational: 'Tình huống',
  closing: 'Kết thúc',
  culture_fit: 'Văn hóa',
};

const ROUND_COLORS = {
  opening: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  technical: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  behavioral: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  behavior: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  situational: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  closing: 'text-green-400 bg-green-500/10 border-green-500/20',
  culture_fit: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
};

// "technical|behavior|culture_fit" → lấy phần đầu
function parseRound(roundStr) {
  return (roundStr || '').split('|')[0] || 'opening';
}

function ScoreRing({ score }) {
  const size = 140;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const offset = circumference * (1 - pct);
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold tabular-nums text-slate-100">{score}</span>
        <span className="text-xs text-slate-500">/100</span>
      </div>
    </div>
  );
}

function QuestionCard({ item }) {
  const [open, setOpen] = useState(false);
  const round = parseRound(item.round);

  const scoreColor =
    item.score >= 8 ? 'text-green-400 bg-green-500/10 border-green-500/20' :
    item.score >= 6 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
    'text-red-400 bg-red-500/10 border-red-500/20';

  return (
    <div className="bg-[#1e293b] border border-slate-700/60 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-slate-500 font-medium shrink-0">#{item.index + 1}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${ROUND_COLORS[round] ?? 'text-slate-400 bg-slate-800 border-slate-700'}`}>
            {ROUND_LABELS[round] ?? round}
          </span>
          <p className="text-sm text-slate-300 truncate">{item.question}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          <span className={`text-sm font-bold border px-2 py-0.5 rounded-lg ${scoreColor}`}>
            {item.score}/10
          </span>
          <svg
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-5 space-y-4 border-t border-slate-700/60 pt-4">
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Câu hỏi</p>
            <p className="text-sm text-slate-200 leading-relaxed">{item.question}</p>
          </div>

          <div>
            <p className="text-xs text-indigo-400 font-medium uppercase tracking-wide mb-2">Câu trả lời của bạn</p>
            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg px-3 py-2.5">
              <p className="text-sm text-slate-300 leading-relaxed">{item.answer || '(Không có câu trả lời)'}</p>
            </div>
          </div>

          {item.feedback && (
            <div>
              <p className="text-xs text-amber-400 font-medium uppercase tracking-wide mb-2">Nhận xét</p>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2.5">
                <p className="text-sm text-slate-300 leading-relaxed">{item.feedback}</p>
              </div>
            </div>
          )}

          {item.suggestion && (
            <div>
              <p className="text-xs text-green-400 font-medium uppercase tracking-wide mb-2">Gợi ý cải thiện</p>
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2.5">
                <p className="text-sm text-slate-300 leading-relaxed">{item.suggestion}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function InterviewResultPage() {
  const navigate = useNavigate();
  const { interviewResult, selectedJob, companyIntel, reset } = useAgentStore();

  useSessionRecovery('interview_done');

  if (!interviewResult) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <p className="text-slate-400 text-sm">Không tìm thấy kết quả phỏng vấn.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
          >
            ← Về Dashboard
          </button>
        </div>
      </div>
    );
  }

  const summary = interviewResult.summary || {};
  const evaluated = Array.isArray(interviewResult.evaluated) ? interviewResult.evaluated : [];

  const totalScore = summary.total_score ?? interviewResult.overall_score ?? interviewResult.score ?? 0;
  const level = summary.level || '';
  const strengths = summary.strengths || interviewResult.strengths || [];
  const weaknesses = summary.weaknesses || interviewResult.improvements || [];
  const overallFeedback = summary.overall_feedback || interviewResult.feedback || '';
  const recommendation = summary.recommendation || '';
  const jobTitle = interviewResult.job_title || selectedJob?.title || '';
  const companyName = interviewResult.company_name || companyIntel?.name || '';

  const avgScore = evaluated.length > 0
    ? Math.round((evaluated.reduce((s, q) => s + (q.score || 0), 0) / evaluated.length) * 10) / 10
    : null;
  const minScore = evaluated.length > 0 ? Math.min(...evaluated.map((q) => q.score || 0)) : null;

  const levelColor =
    totalScore >= 80 ? 'text-green-400 bg-green-500/10 border-green-500/20' :
    totalScore >= 60 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
    'text-red-400 bg-red-500/10 border-red-500/20';

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-slate-500 hover:text-slate-300 transition-colors shrink-0 text-lg leading-none"
            >
              ←
            </button>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">Kết quả phỏng vấn</p>
              {companyName && (
                <p className="text-xs text-indigo-400 truncate">{companyName}</p>
              )}
            </div>
          </div>
          <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full shrink-0">
            Hoàn thành
          </span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">

        {/* Hero — Score + Info */}
        <div className="bg-gradient-to-br from-indigo-500/10 via-[#1e293b] to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ScoreRing score={totalScore} />
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="text-2xl">🎉</span>
                <h1 className="text-xl font-bold text-slate-100">Phỏng vấn hoàn thành!</h1>
              </div>
              {(jobTitle || companyName) && (
                <p className="text-sm text-slate-400">
                  {jobTitle}{jobTitle && companyName ? ' · ' : ''}{companyName}
                </p>
              )}
              {level && (
                <span className={`inline-block text-sm font-semibold px-3 py-1 rounded-full border ${levelColor}`}>
                  Xếp loại: {level}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        {evaluated.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Số câu hỏi', value: evaluated.length, icon: '📝' },
              { label: 'Điểm trung bình', value: avgScore != null ? `${avgScore}/10` : '—', icon: '📊' },
              { label: 'Điểm thấp nhất', value: minScore != null ? `${minScore}/10` : '—', icon: '⚠️' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-[#1e293b] border border-slate-700/60 rounded-xl p-4 text-center">
                <div className="text-xl mb-1">{icon}</div>
                <p className="text-base font-bold text-slate-100">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Strengths & Weaknesses */}
        {(strengths.length > 0 || weaknesses.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {strengths.length > 0 && (
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                <p className="text-xs text-green-400 font-semibold uppercase tracking-wide mb-3">
                  ✓ Điểm mạnh
                </p>
                <ul className="space-y-2">
                  {strengths.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-300">
                      <span className="text-green-400 shrink-0 mt-0.5">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {weaknesses.length > 0 && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                <p className="text-xs text-red-400 font-semibold uppercase tracking-wide mb-3">
                  ✗ Điểm yếu
                </p>
                <ul className="space-y-2">
                  {weaknesses.map((w, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-300">
                      <span className="text-red-400 shrink-0 mt-0.5">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Overall Feedback */}
        {overallFeedback && (
          <div className="bg-[#1e293b] border border-slate-700/60 rounded-xl p-5">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">Nhận xét tổng quan</p>
            <p className="text-sm text-slate-300 leading-relaxed">{overallFeedback}</p>
          </div>
        )}

        {/* Recommendation */}
        {recommendation && (
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-5">
            <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wide mb-3">💡 Khuyến nghị</p>
            <p className="text-sm text-slate-300 leading-relaxed">{recommendation}</p>
          </div>
        )}

        {/* Per-question breakdown */}
        {evaluated.length > 0 && (
          <div>
            <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">
              Chi tiết từng câu hỏi
            </h2>
            <div className="space-y-3">
              {evaluated.map((item) => (
                <QuestionCard key={item.index} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2 pb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl
              transition-colors text-sm border border-slate-700"
          >
            Về Dashboard
          </button>
          <button
            onClick={() => { reset(); navigate('/agent/new'); }}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl
              transition-colors text-sm shadow-lg shadow-indigo-500/20"
          >
            Phiên mới
          </button>
        </div>

      </div>
    </div>
  );
}
