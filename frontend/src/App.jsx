import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AgentPage from './pages/AgentPage';
import JobSelectionPage from './pages/JobSelectionPage';
import CompanyPage from './pages/CompanyPage';
import InterviewPage from './pages/InterviewPage';
import InterviewResultPage from './pages/InterviewResultPage';

// Guard: chỉ cho phép truy cập khi đã đăng nhập
function PrivateRoute({ children }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
            borderRadius: '12px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#0f172a' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#0f172a' } },
        }}
      />

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/dashboard" element={
          <PrivateRoute><DashboardPage /></PrivateRoute>
        } />
        <Route path="/agent/new" element={
          <PrivateRoute><AgentPage /></PrivateRoute>
        } />
        <Route path="/agent/:id/jobs" element={
          <PrivateRoute><JobSelectionPage /></PrivateRoute>
        } />
        <Route path="/agent/:id/company" element={
          <PrivateRoute><CompanyPage /></PrivateRoute>
        } />
        <Route path="/agent/:id/interview" element={
          <PrivateRoute><InterviewPage /></PrivateRoute>
        } />
        <Route path="/agent/:id/interview/result" element={
          <PrivateRoute><InterviewResultPage /></PrivateRoute>
        } />

        {/* Redirect root → dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
