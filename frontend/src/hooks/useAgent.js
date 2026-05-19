import { useNavigate } from 'react-router-dom';
import { useAgentStore } from '../stores/agentStore';
import { useAuthStore } from '../stores/authStore';

export function useAgent() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const { startAgent, resumeAgent, chooseOption, setSelectedJob } = useAgentStore();

  const handleStartAgent = async (file) => {
    const data = await startAgent(file, token);
    navigate(`/agent/${data.session_id}/jobs`);
  };

  const handleSelectJob = async (job) => {
    const { session } = useAgentStore.getState();
    setSelectedJob(job);
    const data = await resumeAgent(job.id, token);
    navigate(`/agent/${data.session_id}/company`);
  };

  const handleChoose = async (choice) => {
    const { session } = useAgentStore.getState();
    const data = await chooseOption(choice, token);
    if (choice === 'interview') {
      navigate(`/agent/${data.session_id}/interview`);
    } else {
      navigate(`/agent/${data.session_id}/cv-review`);
    }
  };

  return { handleStartAgent, handleSelectJob, handleChoose };
}
