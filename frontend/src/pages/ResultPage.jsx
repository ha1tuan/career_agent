import { useNavigate } from 'react-router-dom';
import { useAgentStore } from '../stores/agentStore';
import Button from '../components/ui/Button';

export default function ResultPage() {
  const navigate = useNavigate();
  const { userChoice, selectedJob, companyIntel, reset } = useAgentStore();

  const handleNewSession = () => {
    reset();
    navigate('/agent/new');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="text-6xl mb-4">{userChoice === 'interview' ? '🎤' : '📝'}</div>
        <h1 className="text-2xl font-bold text-slate-100">
          {userChoice === 'interview' ? 'Chuẩn bị cho phỏng vấn!' : 'CV đã được phân tích!'}
        </h1>
        <p className="text-slate-400">
          {selectedJob?.title} tại {companyIntel?.name} — tính năng này đang được phát triển.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate('/dashboard')} variant="secondary">
            Về Dashboard
          </Button>
          <Button onClick={handleNewSession}>
            Phiên mới
          </Button>
        </div>
      </div>
    </div>
  );
}
