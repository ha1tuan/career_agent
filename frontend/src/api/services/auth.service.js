import axios from 'axios';
import { httpClient } from '../axiosInstance';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const authService = {
  register: async ({ full_name, email, password }) => {
    const res = await httpClient.post('/api/v1/auth/register', { email, password, full_name });
    return res.data;
  },

  // OAuth2PasswordRequestForm yêu cầu form-data với field 'username'
  login: async ({ email, password }) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    // Use raw axios — no auth token needed, and avoids interceptor injecting stale token
    const res = await axios.post(`${BASE_URL}/api/v1/auth/login`, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return res.data; // { access_token, refresh_token, token_type }
  },

  // Explicit token passed here because this is called during login before store is updated
  me: async (token) => {
    const res = await httpClient.get('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },
};
