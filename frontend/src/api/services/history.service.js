import { httpClient } from '../axiosInstance';

export const historyService = {
  getList: async ({ user_id, page = 1, page_size = 10 }) => {
    const res = await httpClient.get('/api/v1/history/list', {
      params: { user_id, page, page_size },
    });
    return res.data;
  },

  getDetail: async (id) => {
    const res = await httpClient.get(`/api/v1/history/${id}`);
    return res.data;
  },

  continueSession: async (id) => {
    const res = await httpClient.post(`/api/v1/history/${id}/continue`);
    return res.data;
  },
};
