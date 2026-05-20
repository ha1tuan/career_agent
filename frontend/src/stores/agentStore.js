import { create } from 'zustand';
import { agentApi, cvApi } from '../api';

// ─── Normalizers ────────────────────────────────────────────────────────────

const normalizeCVProfile = (cv) => {
  const src = cv.parsed_data || cv;
  return {
    id: cv.id,
    name: src.name || '',
    email: src.email || '',
    phone: src.phone || '',
    education: src.education || '',
    experience: src.experience || '',
    skills: Array.isArray(src.skills) ? src.skills : [],
    summary: src.summary || '',
  };
};

const normalizeCVFromState = (cvData) => {
  if (!cvData) return null;
  return {
    name: cvData.full_name || cvData.name || '',
    email: cvData.email || '',
    phone: cvData.phone || '',
    education: Array.isArray(cvData.education)
      ? cvData.education.join(' | ')
      : (cvData.education || ''),
    experience: Array.isArray(cvData.experience)
      ? cvData.experience.join(' | ')
      : (cvData.experience || ''),
    skills: Array.isArray(cvData.skills) ? cvData.skills : [],
    summary: cvData.summary || '',
  };
};

const normalizeJobResults = (jobResults) =>
  (jobResults || []).map((job, i) => ({
    id: job.id || `job_${i}`,
    title: job.title || '',
    company: job.company || '',
    logo_url: job.logo_url || '',
    salary: job.salary || '',
    location: job.location || '',
    address: job.address || '',
    experience_years: job.experience_years || '',
    tags: job.tags || [],
    posted_date: job.posted_date || '',
    is_suggested: job.is_suggested || false,
    is_verified: job.is_verified || false,
    description: job.description || '',
    requirements: job.requirements || [],
    benefits: job.benefits || [],
    url: job.url || '',
    match_score: job.match_score > 1 ? job.match_score / 100 : job.match_score,
    match_reason: job.match_reason || '',
    match_reasons: job.match_reasons || (job.match_reason ? [job.match_reason] : []),
  }));

const normalizeCompanyResearch = (raw) => {
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
    // legacy field — kept for backward compat
    red_flags: src.red_flags || '',
  };
};

// Build chat-style interviewMessages from a QA history array + current unanswered question
const buildInterviewMessages = (qaHistory, currentQuestion, currentRound, currentIndex, total) => {
  const msgs = [];
  for (const pair of (qaHistory || [])) {
    if (pair.question) {
      msgs.push({
        role: 'ai',
        content: pair.question,
        meta: { current_index: pair.index ?? 0, total: total ?? 5, round: pair.round || 'opening' },
      });
    }
    if (pair.answer) {
      msgs.push({ role: 'user', content: pair.answer });
    }
  }
  if (currentQuestion) {
    msgs.push({
      role: 'ai',
      content: currentQuestion,
      meta: { current_index: currentIndex ?? 0, total: total ?? 5, round: currentRound || 'opening' },
    });
  }
  return msgs;
};

// ─── Module-level poll state (non-serializable, kept outside Zustand) ────────
let pollTimer = null;
let currentPollIntervalMs = 2000;

const STOP_POLLING_STEPS = new Set([
  'job_finder',
  'companies_researched',
  'interviewing',
  'interview_done',
  'error',
  'done',
]);

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAgentStore = create((set, get) => ({
  // Session
  sessionId: null,
  session: null,
  currentStep: null,

  // CV
  cvProfile: null,

  // Jobs
  jobListings: [],
  selectedJob: null,

  // Company
  companyIntel: null,

  // Interview
  interviewMessages: [],
  interviewQaHistory: [],
  currentQuestion: null,
  currentRound: null,
  currentQuestionIndex: 0,
  maxQuestions: 5,
  interviewResult: null,

  // SSE / Polling
  sseStatus: 'idle',      // 'idle' | 'connecting' | 'active' | 'closed'
  streamMessage: '',
  hitlEvent: null,        // { step, data, isRestore? } — cleared by component after handling
  progressStep: null,     // node đang chạy khi current_step = "running"
  progressMessage: '',    // message chi tiết từ backend

  // CV duplicate detection
  cvUploadStatus: 'idle', // 'idle' | 'uploading' | 'duplicate' | 'success' | 'error'
  existingCv: null,

  // UI
  loading: false,
  loadingStep: '',
  error: null,

  // ─── Polling ───────────────────────────────────────────────────────────────

  startPolling: (sessionId) => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    currentPollIntervalMs = 2000;
    set({ sseStatus: 'active', streamMessage: '', hitlEvent: null, error: null, progressStep: null, progressMessage: '' });

    const scheduleNext = (ms) => {
      pollTimer = setInterval(poll, ms);
    };

    const poll = async () => {
      try {
        const data = await agentApi.getSession(sessionId);
        const state = data.state || data;
        const step = state.current_step;
        const pStep = state.progress_step || null;

        // Priority 1: Terminal/HITL step → stop polling, notify component
        if (STOP_POLLING_STEPS.has(step)) {
          clearInterval(pollTimer);
          pollTimer = null;
          currentPollIntervalMs = 2000;

          const update = {
            sseStatus: 'closed', streamMessage: '', currentStep: step,
            progressStep: null, progressMessage: '',
          };

          if (step === 'job_finder') {
            update.jobListings = normalizeJobResults(state.job_results || []);
          } else if (step === 'companies_researched') {
            update.companyIntel = normalizeCompanyResearch(state.company_research);
          } else if (step === 'interviewing') {
            const qaHistory = state.interview_qa_pairs || [];
            const question = state.current_question || null;
            const round = state.current_round || null;
            const index = state.current_question_index ?? 0;
            const total = state.max_questions ?? 5;
            update.interviewQaHistory = qaHistory;
            update.currentQuestion = question;
            update.currentRound = round;
            update.currentQuestionIndex = index;
            update.maxQuestions = total;
            update.interviewMessages = buildInterviewMessages(qaHistory, question, round, index, total);
          } else if (step === 'interview_done') {
            try {
              update.interviewResult = await agentApi.getInterviewResult(sessionId);
            } catch (_) {}
          } else if (step === 'error') {
            update.error = state.error || 'Đã xảy ra lỗi';
          }

          set({ ...update, hitlEvent: { step, data: state } });
          return;
        }

        // Priority 2: Graph running (explicit or has progress) → update progress display
        const isRunning = step === 'running' || pStep != null;
        if (isRunning) {
          set({
            progressStep:    pStep,
            progressMessage: state.progress || '',
          });

          if (state.should_stop_polling) {
            clearInterval(pollTimer);
            pollTimer = null;
            return;
          }

          const newMs = state.polling_interval_ms || 2000;
          if (newMs !== currentPollIntervalMs) {
            clearInterval(pollTimer);
            pollTimer = null;
            currentPollIntervalMs = newMs;
            scheduleNext(newMs);
          }
          return;
        }

        // Priority 3: Not running, not a stop step → keep polling (ready, job_selected, etc.)
      } catch (err) {
        clearInterval(pollTimer);
        pollTimer = null;
        currentPollIntervalMs = 2000;
        const message = err.response?.data?.detail || err.message;
        set({ sseStatus: 'idle', error: message });
      }
    };

    poll();
    scheduleNext(currentPollIntervalMs);
  },

  stopPolling: () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    currentPollIntervalMs = 2000;
    set({ sseStatus: 'idle', streamMessage: '', progressStep: null, progressMessage: '' });
  },

  // Trigger graph chạy nền rồi bắt đầu poll (dùng sau POST /agent/start)
  runAndPoll: async (sessionId) => {
    set({ sseStatus: 'connecting', streamMessage: '', hitlEvent: null, error: null });
    try {
      await agentApi.run(sessionId);
      get().startPolling(sessionId);
    } catch (err) {
      const message = err.response?.data?.detail || err.message;
      set({ sseStatus: 'idle', error: message });
      throw new Error(message);
    }
  },

  clearHitlEvent: () => set({ hitlEvent: null }),

  // ─── Agent flow ───────────────────────────────────────────────────────────

  // Upload CV — phát hiện duplicate trước khi start agent
  uploadCV: async (file, userId) => {
    set({ loading: true, error: null, loadingStep: 'Đang tải CV lên...', cvUploadStatus: 'uploading' });
    try {
      setTimeout(() => set({ loadingStep: 'AI đang phân tích CV...' }), 700);
      const result = await cvApi.upload(file, userId);

      if (result.is_duplicate) {
        set({ loading: false, loadingStep: '', cvUploadStatus: 'duplicate', existingCv: result.existing_cv });
        return result;
      }

      localStorage.setItem('cv_id', result.cv.id);
      set({ loading: false, loadingStep: '', cvUploadStatus: 'success', cvProfile: normalizeCVProfile(result.cv) });
      return result;
    } catch (err) {
      const message = err.response?.data?.detail || err.message;
      set({ error: message, loading: false, loadingStep: '', cvUploadStatus: 'error' });
      throw new Error(message);
    }
  },

  // Xác nhận duplicate: confirm=false → CV cũ, confirm=true → CV mới
  confirmDuplicate: async (existingCvId, confirm) => {
    set({ loading: true, error: null, loadingStep: 'Đang xử lý lựa chọn...' });
    try {
      const res = await cvApi.confirmDuplicate({ existing_cv_id: existingCvId, confirm });
      localStorage.setItem('cv_id', res.cv_id);
      set({ loading: false, loadingStep: '', cvUploadStatus: 'idle', existingCv: null });
      return res; // { cv_id, reused }
    } catch (err) {
      const message = err.response?.data?.detail || err.message;
      set({ error: message, loading: false, loadingStep: '' });
      throw new Error(message);
    }
  },

  // Start agent với cv_id đã biết (sau upload hoặc sau confirm)
  proceedToAgentStart: async (cvId) => {
    set({ loading: true, error: null, loadingStep: 'Đang khởi động agent...' });
    try {
      const sessionData = await agentApi.start({ cv_id: cvId, refresh: false });
      const sid = sessionData.session_id;
      if (sid) localStorage.setItem('career_session_id', sid);
      set({ sessionId: sid, session: sessionData, loading: false, loadingStep: '' });
      return sessionData; // { session_id, cached, ... }
    } catch (err) {
      const message = err.response?.data?.detail || err.message;
      set({ error: message, loading: false, loadingStep: '' });
      throw new Error(message);
    }
  },

  // Bước 1 (legacy): Upload CV → start agent session
  startAgent: async (file, userId) => {
    set({ loading: true, error: null, loadingStep: 'Đang tải CV lên...' });
    try {
      setTimeout(() => set({ loadingStep: 'AI đang phân tích CV...' }), 700);
      const uploadResult = await cvApi.upload(file, userId);
      const cv = uploadResult.cv;

      set({ loadingStep: 'Đang khởi động agent...' });
      const sessionData = await agentApi.start({ cv_id: cv.id, refresh: false });
      const sid = sessionData.session_id;

      if (sid) localStorage.setItem('career_session_id', sid);

      set({
        sessionId: sid,
        session: sessionData,
        cvProfile: normalizeCVProfile(cv),
        loading: false,
        loadingStep: '',
      });
      return sessionData;
    } catch (err) {
      const message = err.response?.data?.detail || err.message;
      set({ error: message, loading: false, loadingStep: '' });
      throw new Error(message);
    }
  },

  // HITL #1: Gửi company_name + job_selected đã chọn → backend tiếp tục research
  resumeWithCompany: async (companyName, jobSelected = null) => {
    const { sessionId, session } = get();
    const sid = sessionId || session?.session_id;
    set({ loading: true, error: null, loadingStep: 'Đang gửi lựa chọn...' });
    try {
      await agentApi.resume({ session_id: sid, company_name: companyName, job_selected: jobSelected });
      set({ loading: false, loadingStep: '' });
    } catch (err) {
      const message = err.response?.data?.detail || err.message;
      set({ error: message, loading: false, loadingStep: '' });
      throw new Error(message);
    }
  },

  // Backward-compat alias: resumeAgent(job) → set selectedJob + resumeWithCompany
  resumeAgent: async (job) => {
    get().setSelectedJob(job);
    return get().resumeWithCompany(job.company, job);
  },

  // HITL #2: Xác nhận bắt đầu phỏng vấn
  confirmInterview: async () => {
    const { sessionId, session } = get();
    const sid = sessionId || session?.session_id;
    set({ loading: true, error: null, loadingStep: 'Đang chuẩn bị phỏng vấn...' });
    try {
      await agentApi.resume({ session_id: sid, is_interview: true });
      set({
        loading: false,
        loadingStep: '',
        interviewMessages: [],
        interviewQaHistory: [],
        interviewResult: null,
      });
    } catch (err) {
      const message = err.response?.data?.detail || err.message;
      set({ error: message, loading: false, loadingStep: '' });
      throw new Error(message);
    }
  },

  // Interview: gửi câu trả lời
  // Response: { is_done, next_question?, evaluated?, summary?, feedback?, score? }
  submitAnswer: async (answer) => {
    const { sessionId, session, currentQuestion, currentRound, currentQuestionIndex, maxQuestions } = get();
    const sid = sessionId || session?.session_id;

    set((s) => ({
      interviewMessages: [...s.interviewMessages, { role: 'user', content: answer }],
      interviewQaHistory: [
        ...s.interviewQaHistory,
        { index: currentQuestionIndex, round: currentRound || 'opening', question: currentQuestion || '', answer },
      ],
      loading: true,
    }));

    try {
      const data = await agentApi.submitAnswer({ session_id: sid, answer });
      const newMsgs = [];

      // Per-question feedback (optional — backend may or may not return it mid-interview)
      if (data?.feedback) {
        newMsgs.push({ role: 'feedback', content: data.feedback, meta: { score: data.score } });
      }

      if (data?.is_done) {
        set((s) => ({
          interviewMessages: [...s.interviewMessages, ...newMsgs],
          interviewResult: data,
          loading: false,
        }));
      } else if (data?.next_question != null) {
        const nq = typeof data.next_question === 'string'
          ? { question: data.next_question }
          : (data.next_question || {});
        const nextIdx = nq.index ?? (currentQuestionIndex + 1);
        const nextRound = nq.round || currentRound || 'opening';
        const nextTotal = nq.total ?? maxQuestions;

        newMsgs.push({
          role: 'ai',
          content: nq.question || nq,
          meta: { current_index: nextIdx, total: nextTotal, round: nextRound },
        });

        set((s) => ({
          interviewMessages: [...s.interviewMessages, ...newMsgs],
          currentQuestion: nq.question || nq,
          currentRound: nextRound,
          currentQuestionIndex: nextIdx,
          maxQuestions: nextTotal,
          loading: false,
        }));
      } else {
        set((s) => ({ interviewMessages: [...s.interviewMessages, ...newMsgs], loading: false }));
      }

      return data;
    } catch (err) {
      set({ loading: false });
      throw new Error(err.response?.data?.detail || err.message);
    }
  },

  // ─── Session restore (F5) ─────────────────────────────────────────────────

  fetchSession: async (sessionId) => {
    set({ loading: true, error: null });
    try {
      const data = await agentApi.getSession(sessionId);
      const state = data.state || data;
      const currentStep = state.current_step || 'start';

      if (currentStep === 'not_found') {
        localStorage.removeItem('career_session_id');
        set({ loading: false });
        return { currentStep: 'not_found' };
      }

      const sid = sessionId;
      const cvData = state.cv_data || state.cv_profile;
      const rawJobs = state.job_results || state.interrupt_data?.job_listings || [];
      const normalizedJobs = normalizeJobResults(rawJobs);
      const companyIntel = normalizeCompanyResearch(
        state.company_research || data.interrupt_data?.company_intel
      );
      const selectedJob = companyIntel?.name
        ? normalizedJobs.find((j) => j.company === companyIntel.name) ?? null
        : null;

      // Interview restore
      const qaHistory = state.interview_qa_pairs || state.qa_pairs || [];
      const currentQuestion = state.current_question || null;
      const currentRound = state.current_round || null;
      const currentQuestionIndex = state.current_question_index ?? 0;
      const maxQuestions = state.max_questions ?? 5;

      let interviewResult = null;
      if (currentStep === 'interview_done') {
        try {
          interviewResult = await agentApi.getInterviewResult(sessionId);
        } catch (_) {
          interviewResult = {
            evaluated: state.interview_evaluated || [],
            summary: state.interview_summary || {},
            job_title: selectedJob?.title || '',
            company_name: companyIntel?.name || '',
          };
        }
      }

      set({
        sessionId: sid,
        session: data,
        currentStep,
        cvProfile: cvData ? normalizeCVFromState(cvData) : null,
        jobListings: normalizedJobs,
        companyIntel,
        selectedJob,
        interviewQaHistory: qaHistory,
        currentQuestion,
        currentRound,
        currentQuestionIndex,
        maxQuestions,
        interviewMessages: buildInterviewMessages(qaHistory, currentQuestion, currentRound, currentQuestionIndex, maxQuestions),
        interviewResult,
        loading: false,
      });

      return { data, currentStep };
    } catch (err) {
      const message = err.response?.data?.detail || err.message;
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  setSelectedJob: (job) => set({ selectedJob: job }),
  clearError: () => set({ error: null }),

  reset: () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    currentPollIntervalMs = 2000;
    localStorage.removeItem('career_session_id');
    set({
      sessionId: null,
      session: null,
      currentStep: null,
      cvProfile: null,
      jobListings: [],
      selectedJob: null,
      companyIntel: null,
      interviewMessages: [],
      interviewQaHistory: [],
      currentQuestion: null,
      currentRound: null,
      currentQuestionIndex: 0,
      maxQuestions: 5,
      interviewResult: null,
      cvUploadStatus: 'idle',
      existingCv: null,
      sseStatus: 'idle',
      streamMessage: '',
      hitlEvent: null,
      progressStep: null,
      progressMessage: '',
      loading: false,
      loadingStep: '',
      error: null,
    });
  },
}));
