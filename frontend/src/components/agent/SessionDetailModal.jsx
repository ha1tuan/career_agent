import { useEffect, useState } from 'react';
import { historyApi } from '../../api';
import Card from '../ui/Card';

function normalizeCompany(raw) {
  if (!raw) return null;
  const src = Array.isArray(raw) ? raw[0] : raw;
  if (!src) return null;
  const prosCons = src.pros_cons || {};
  return {
    name: src.company_name || src.name || '',
    industry: src.industry || '',
    size: src.size || '',
    culture: src.culture || '',
    products: src.products || '',
    tech_stack: Array.isArray(src.tech_stack) ? src.tech_stack.join(', ') : (src.tech_stack || ''),
    interview_process: src.interview_process || src.interview_style || '',
    pros: Array.isArray(prosCons.pros) ? prosCons.pros : [],
    cons: Array.isArray(prosCons.cons) ? prosCons.cons : [],
    recent_news: src.recent_news || '',
    red_flags: src.red_flags || '',
  };
}

function scoreColor(score) {
  if (score == null) return 'text-slate-400';
  if (score >= 8) return 'text-green-400';
  if (score >= 5) return 'text-amber-400';
  return 'text-red-400';
}

// ─── Tab sections ─────────────────────────────────────────────────────────────

function JobSection({ detail }) {
  const job = detail.selected_job;
  if (!job) {
    return (
      <div className="text-center py-10 text-slate-500">
        <p className="text-3xl mb-2">📋</p>
        <p>Chưa có việc làm nào được chọn</p>
        {detail.job_count > 0 && (
          <p className="text-sm mt-1">Đã tìm được {detail.job_count} vị trí</p>
        )}
      </div>
    );
  }

  const fields = [
    { icon: '💼', label: 'Vị trí',       value: job.title },
    { icon: '🏢', label: 'Công ty',       value: job.company },
    { icon: '💰', label: 'Mức lương',     value: job.salary },
    { icon: '📍', label: 'Địa điểm',      value: job.location },
    { icon: '⏱️', label: 'Kinh nghiệm',   value: job.experience_years },
  ].filter((f) => f.value);

  return (
    <div className="space-y-4">
      {fields.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map((f) => (
            <Card key={f.label} className="!p-4">
              <p className="text-xs text-slate-500 mb-1">{f.icon} {f.label}</p>
              <p className="text-sm font-medium text-slate-200">{f.value}</p>
            </Card>
          ))}
        </div>
      )}

      {job.description && (
        <Card>
          <p className="text-xs text-slate-500 mb-2">📄 Mô tả</p>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{job.description}</p>
        </Card>
      )}

      {job.requirements?.length > 0 && (
        <Card>
          <p className="text-xs text-slate-500 mb-2">✅ Yêu cầu</p>
          <ul className="space-y-1">
            {job.requirements.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <span className="text-indigo-400 shrink-0">•</span>{r}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {job.match_reason && (
        <Card className="border-indigo-500/20 bg-indigo-500/5">
          <p className="text-xs text-indigo-400 mb-2">🎯 Lý do phù hợp</p>
          <p className="text-sm text-slate-300">{job.match_reason}</p>
        </Card>
      )}
    </div>
  );
}

function CompanySection({ detail }) {
  const company = normalizeCompany(detail.company_research);

  if (!company) {
    return (
      <div className="text-center py-10 text-slate-500">
        <p className="text-3xl mb-2">🏢</p>
        <p>Chưa có thông tin công ty</p>
      </div>
    );
  }

  const infoItems = [
    { icon: '🏭', label: 'Lĩnh vực',   value: company.industry },
    { icon: '👥', label: 'Quy mô',     value: company.size },
    { icon: '💻', label: 'Tech stack', value: company.tech_stack },
    { icon: '📦', label: 'Sản phẩm',   value: company.products },
  ].filter((f) => f.value);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-xl shrink-0">🏢</div>
        <div>
          <h3 className="font-bold text-slate-100">{company.name}</h3>
          {company.industry && <p className="text-sm text-indigo-400">{company.industry}</p>}
        </div>
      </div>

      {infoItems.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {infoItems.map((f) => (
            <Card key={f.label} className="!p-4">
              <p className="text-xs text-slate-500 mb-1">{f.icon} {f.label}</p>
              <p className="text-sm font-medium text-slate-200">{f.value}</p>
            </Card>
          ))}
        </div>
      )}

      {company.culture && (
        <Card>
          <p className="text-xs text-slate-500 mb-2">🌱 Văn hoá công ty</p>
          <p className="text-sm text-slate-300 leading-relaxed">{company.culture}</p>
        </Card>
      )}

      {company.interview_process && (
        <Card>
          <p className="text-xs text-slate-500 mb-2">🎯 Quy trình phỏng vấn</p>
          <p className="text-sm text-slate-300 leading-relaxed">{company.interview_process}</p>
        </Card>
      )}

      {(company.pros?.length > 0 || company.cons?.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {company.pros?.length > 0 && (
            <Card className="border-green-500/20 bg-green-500/5">
              <p className="text-xs text-green-400 font-medium mb-2">👍 Ưu điểm</p>
              <ul className="space-y-1.5">
                {company.pros.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="text-green-400 shrink-0">+</span>{p}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {company.cons?.length > 0 && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <p className="text-xs text-amber-400 font-medium mb-2">⚠️ Nhược điểm</p>
              <ul className="space-y-1.5">
                {company.cons.map((c, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="text-amber-400 shrink-0">−</span>{c}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {!company.pros?.length && company.red_flags && (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-xs text-red-400 mb-2">⚠️ Lưu ý</p>
          <p className="text-sm text-slate-300">{company.red_flags}</p>
        </Card>
      )}

      {company.recent_news && (
        <Card>
          <p className="text-xs text-slate-500 mb-2">📰 Tin tức gần đây</p>
          <p className="text-sm text-slate-300 leading-relaxed">{company.recent_news}</p>
        </Card>
      )}
    </div>
  );
}

function InterviewSection({ detail }) {
  const result = detail.interview_result;

  if (!result) {
    return (
      <div className="text-center py-10 text-slate-500">
        <p className="text-3xl mb-2">🎤</p>
        <p>Chưa có kết quả phỏng vấn</p>
      </div>
    );
  }

  const sum = result.summary && typeof result.summary === 'object' ? result.summary : null;
  const sumText = typeof result.summary === 'string' ? result.summary : null;

  const displayScore = result.score ?? sum?.total_score ?? null;
  const displayLevel = result.level ?? sum?.level ?? null;

  return (
    <div className="space-y-4">
      {/* Overall score header */}
      <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-5 flex items-center gap-6">
        <div className="text-center shrink-0">
          <p className={`text-4xl font-bold ${scoreColor(displayScore)}`}>{displayScore ?? '—'}</p>
          <p className="text-xs text-slate-500 mt-1">Tổng điểm</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-slate-100">{displayLevel ?? '—'}</p>
          <p className="text-sm text-slate-400">Đánh giá tổng thể</p>
        </div>
      </div>

      {/* Structured summary object */}
      {sum && (
        <div className="space-y-3">
          {sum.overall_feedback && (
            <Card>
              <p className="text-xs text-slate-500 mb-2">📝 Nhận xét tổng quan</p>
              <p className="text-sm text-slate-300 leading-relaxed">{sum.overall_feedback}</p>
            </Card>
          )}

          {sum.strengths?.length > 0 && (
            <Card className="border-green-500/20 bg-green-500/5">
              <p className="text-xs text-green-400 font-medium mb-2">💪 Điểm mạnh</p>
              <ul className="space-y-1.5">
                {sum.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="text-green-400 shrink-0">+</span>{s}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {sum.weaknesses?.length > 0 && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <p className="text-xs text-amber-400 font-medium mb-2">⚠️ Điểm cần cải thiện</p>
              <ul className="space-y-1.5">
                {sum.weaknesses.map((w, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="text-amber-400 shrink-0">−</span>{w}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {sum.recommendation && (
            <Card className="border-indigo-500/20 bg-indigo-500/5">
              <p className="text-xs text-indigo-400 font-medium mb-2">💡 Khuyến nghị</p>
              <p className="text-sm text-slate-300 leading-relaxed">{sum.recommendation}</p>
            </Card>
          )}
        </div>
      )}

      {/* Fallback: plain string summary */}
      {sumText && (
        <Card>
          <p className="text-xs text-slate-500 mb-2">📝 Nhận xét tổng quan</p>
          <p className="text-sm text-slate-300 leading-relaxed">{sumText}</p>
        </Card>
      )}

      {result.qa_pairs?.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-400">Chi tiết từng câu hỏi ({result.qa_pairs.length} câu)</p>
          {result.qa_pairs.map((qa, i) => (
            <div key={i} className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs text-indigo-400 font-medium mb-1">Câu {qa.index + 1 ?? i + 1}</p>
                <p className="text-sm font-medium text-slate-200">{qa.question}</p>
              </div>

              {qa.answer && (
                <div className="border-l-2 border-slate-700 pl-3">
                  <p className="text-xs text-slate-500 mb-0.5">Câu trả lời của bạn</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{qa.answer}</p>
                </div>
              )}

              <div className="flex items-start gap-4">
                {qa.score != null && (
                  <div className="shrink-0 text-center min-w-[3rem]">
                    <p className={`text-2xl font-bold ${scoreColor(qa.score)}`}>
                      {qa.score}
                      <span className="text-sm font-normal text-slate-500">/10</span>
                    </p>
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  {qa.feedback && (
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Nhận xét</p>
                      <p className="text-sm text-slate-300">{qa.feedback}</p>
                    </div>
                  )}
                  {qa.suggestion && (
                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-2.5">
                      <p className="text-xs text-indigo-400 mb-0.5">💡 Gợi ý cải thiện</p>
                      <p className="text-sm text-slate-300">{qa.suggestion}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'job',       label: '💼 Việc làm' },
  { id: 'company',   label: '🏢 Công ty'  },
  { id: 'interview', label: '🎤 Phỏng vấn' },
];

// Props: historyId (string), onClose ()
export default function SessionDetailModal({ historyId, onClose }) {
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [tab, setTab]         = useState('job');

  useEffect(() => {
    historyApi.getDetail(historyId)
      .then((data) => {
        setDetail(data);
        if (!data.selected_job) {
          if (data.company_research) setTab('company');
          else if (data.interview_result) setTab('interview');
        }
      })
      .catch((err) => setError(err.response?.data?.detail || 'Không thể tải chi tiết'))
      .finally(() => setLoading(false));
  }, [historyId]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <h2 className="text-lg font-semibold text-slate-100">Chi tiết phiên làm việc</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-6 shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">⚠️</p>
              <p className="text-red-400">{error}</p>
            </div>
          ) : (
            <>
              {tab === 'job'       && <JobSection       detail={detail} />}
              {tab === 'company'   && <CompanySection   detail={detail} />}
              {tab === 'interview' && <InterviewSection detail={detail} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
