import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useAgentStore } from '../stores/agentStore';
import { agentApi } from '../api';
import Button from '../components/ui/Button';
import { CardSkeleton } from '../components/ui/LoadingSkeleton';
import Badge from '../components/ui/Badge';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { reset } = useAgentStore();

  const handleNewSession = () => {
    reset(); // Xoá state cũ
    navigate('/agent/new');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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
        {/* <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-4">
            Phiên làm việc gần đây
          </h2>

          {loadingSessions ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-4xl mb-3">📭</p>
              <p>Chưa có phiên làm việc nào</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-200">{session.job_title}</p>
                      <p className="text-sm text-indigo-400">{session.company}</p>
                    </div>
                    <Badge variant={session.status === 'completed' ? 'success' : 'warning'}>
                      {session.status === 'completed' ? 'Hoàn thành' : 'Đang chạy'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {session.choice === 'interview' ? '🎤 Phỏng vấn' : '📝 Review CV'}
                    </span>
                    <span>{formatDate(session.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div> */}
      </main>
    </div>
  );
}
