import { authService } from './services/auth.service';
import { agentService } from './services/agent.service';
import { cvService } from './services/cv.service';
import { historyService } from './services/history.service';

export const authApi = authService;
export const agentApi = agentService;
export const cvApi = cvService;
export const historyApi = historyService;
