import { httpClient } from '../axiosInstance';

export const agentService = {
  // Bước 1: Khởi động agent với CV đã upload
  start: async ({ cv_id, refresh = false }) => {
    const res = await httpClient.post('/api/v1/agent/start', { cv_id, refresh });
    return res.data;
  },

  // HITL resume — dùng cho cả 2 interrupt:
  //   #1 chọn job:       { session_id, company_name }
  //   #2 xác nhận mode:  { session_id, is_interview: true }
  resume: async (data) => {
    const res = await httpClient.post('/api/v1/agent/resume', data);
    return res.data;
  },

  // Lấy session hiện tại (dùng khi F5 restore)
  getSession: async (session_id) => {
    const res = await httpClient.get(`/api/v1/agent/session/${session_id}`);
    return res.data;
  },

  // Danh sách sessions cho Dashboard
  getSessions: async () => {
    const res = await httpClient.get('/api/v1/agent/sessions');
    return res.data;
  },

  // Trigger graph chạy nền (Bước 2 sau start)
  run: async (session_id) => {
    const res = await httpClient.get(`/api/v1/agent/run/${session_id}`);
    return res.data;
  },

  // Gửi câu trả lời phỏng vấn
  // Response: { is_done, next_question, evaluated?, summary? }
  submitAnswer: async ({ session_id, answer }) => {
    const res = await httpClient.post('/api/v1/agent/interview/answer', { session_id, answer });
    return res.data;
  },

  // Lấy kết quả phỏng vấn (chỉ có data khi current_step = "interview_done")
  getInterviewResult: async (session_id) => {
    const res = await httpClient.get('/api/v1/agent/interview/result', { params: { session_id } });
    return res.data;
  },
};
