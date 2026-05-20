import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { useAgentStore } from '../stores/agentStore';
import { historyApi } from '../api';
import Button from '../components/ui/Button';
import { CardSkeleton } from '../components/ui/LoadingSkeleton';
import Badge from '../components/ui/Badge';
import SessionDetailModal from '../components/agent/SessionDetailModal';

const PAGE_SIZE = 10;

const STEP_CONFIG = {
  ready:                { label: 'Chờ bắt đầu',          variant: 'default' },
  running:              { label: 'Đang chạy',             variant: 'info'    },
  job_finder:           { label: 'Đang tìm việc',         variant: 'info'    },
  jobs_found:           { label: 'Chờ chọn việc',         variant: 'warning' },
  job_selected:         { label: 'Đã chọn việc',          variant: 'info'    },
  companies_researched: { label: 'Đã nghiên cứu công ty', variant: 'info'    },
  action_selected:      { label: 'Chờ xác nhận',          variant: 'warning' },
  interviewing:         { label: 'Đang phỏng vấn',        variant: 'info'    },
  interview_done:       { label: 'Phỏng vấn xong',        variant: 'success' },
  cv_review_done:       { label: 'Review CV xong',        variant: 'success' },
  done:                 { label: 'Hoàn thành',            variant: 'success' },
  error:                { label: 'Lỗi',                   variant: 'default' },
};

const getStepConfig = (step) =>
  STEP_CONFIG[step] ?? { label: step, variant: 'default' };

const NOT_CONTINUABLE = new Set(['interview_done', 'cv_review_done', 'done', 'error']);

const CONTINUE_ROUTE = {
  ready:                (sid) => `/agent/${sid}/jobs`,
  running:              (sid) => `/agent/${sid}/jobs`,
  job_finder:           (sid) => `/agent/${sid}/jobs`,
  jobs_found:           (sid) => `/agent/${sid}/jobs`,
  job_selected:         (sid) => `/agent/${sid}/company`,
  companies_researched: (sid) => `/agent/${sid}/company`,
  action_selected:      (sid) => `/agent/${sid}/company`,
  interviewing:         (sid) => `/agent/${sid}/interview`,
  interview_done:       (sid) => `/agent/${sid}/interview/result`,
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { reset } = useAgentStore();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [continuingId, setContinuingId] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await historyApi.getList({ user_id: user?.id, page, page_size: PAGE_SIZE });
        setSessions(data.data);
        setMeta({
          total_records: data.total_records,
          total_pages: data.total_pages,
          has_next: data.has_next,
          has_prev: data.has_prev,
          page: data.page,
        });
      } catch (err) {
        setError(err.response?.data?.detail || 'Không thể tải lịch sử');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [page, user?.id]);

  const handleNewSession = () => {
    reset();
    navigate('/agent/new');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleContinue = async (s) => {
    setContinuingId(s.id);
    try {
      const result = await historyApi.continueSession(s.id);
      const sid = result.session_id || s.session_id;
      reset();
      localStorage.setItem('career_session_id', sid);
      const route = CONTINUE_ROUTE[s.current_step]?.(sid) ?? `/agent/${sid}/jobs`;
      navigate(route);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Không thể chạy tiếp phiên này');
    } finally {
      setContinuingId(null);
    }
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <span className="font-bold text-slate-100">Career Agent</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-200">{user?.full_name}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Welcome + CTA */}
        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-8 mb-8">
          <h1 className="text-2xl font-bold text-slate-100 mb-2">
            Xin chào, {user?.full_name?.split(' ').pop()}! 👋
          </h1>
          <p className="text-slate-400 mb-6">
            AI Career Agent sẽ giúp bạn tìm việc phù hợp và chuẩn bị phỏng vấn.
          </p>
          <Button onClick={handleNewSession} size="lg">
            🚀 Bắt đầu tìm việc mới
          </Button>
        </div>

        {/* Sessions history */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-200">Phiên làm việc gần đây</h2>
            {meta && (
              <span className="text-sm text-slate-500">{meta.total_records} phiên</span>
            )}
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">⚠️</p>
              <p className="text-red-400">{error}</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-4xl mb-3">📭</p>
              <p>Chưa có phiên làm việc nào</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-200 truncate">
                          {s.selected_job ? s.selected_job.title : `${s.job_count} việc làm tìm được`}
                        </p>
                        <p className="text-sm text-indigo-400 truncate">
                          {s.selected_job?.company ?? '—'}
                        </p>
                      </div>
                      <Badge variant={getStepConfig(s.current_step).variant}>
                        {getStepConfig(s.current_step).label}
                      </Badge>
                    </div>

                    {s.interview_score != null && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-400">Điểm phỏng vấn:</span>
                        <span className="font-semibold text-indigo-300">{s.interview_score}</span>
                        <span className="text-slate-500">— {s.interview_level}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{s.is_interview ? '🎤 Phỏng vấn' : '📝 Review CV'}</span>
                      <span>{formatDate(s.created_at)}</span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => setDetailId(s.id)}
                      >
                        Xem chi tiết
                      </Button>
                      {!NOT_CONTINUABLE.has(s.current_step) && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          loading={continuingId === s.id}
                          disabled={continuingId !== null}
                          onClick={() => handleContinue(s)}
                        >
                          Chạy tiếp
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {meta && meta.total_pages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!meta.has_prev}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ← Trước
                  </Button>
                  <span className="text-sm text-slate-400">
                    {meta.page} / {meta.total_pages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!meta.has_next}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Sau →
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {detailId && (
        <SessionDetailModal
          historyId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}
