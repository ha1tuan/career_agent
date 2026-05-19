import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      loading: false,
      error: null,

      login: async ({ email, password }) => {
        set({ loading: true, error: null });
        try {
          const data = await authApi.login({ email, password });
          const token = data.access_token;
          const refreshToken = data.refresh_token ?? null;

          // Real API không trả về user — gọi /me để lấy thông tin
          const user = data.user ?? (await authApi.me(token));

          set({ user, token, refreshToken, loading: false });
          return { user, access_token: token };
        } catch (err) {
          const message = err.response?.data?.detail || err.message;
          set({ error: message, loading: false });
          throw new Error(message);
        }
      },

      register: async ({ full_name, email, password }) => {
        set({ loading: true, error: null });
        try {
          // Đăng ký tài khoản
          await authApi.register({ full_name, email, password });

          // Tự động đăng nhập sau khi đăng ký
          const tokenData = await authApi.login({ email, password });
          const token = tokenData.access_token;
          const refreshToken = tokenData.refresh_token ?? null;
          const user = tokenData.user ?? (await authApi.me(token));

          set({ user, token, refreshToken, loading: false });
          return { user, access_token: token };
        } catch (err) {
          const message = err.response?.data?.detail || err.message;
          set({ error: message, loading: false });
          throw new Error(message);
        }
      },

      logout: () => {
        set({ user: null, token: null, refreshToken: null, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, refreshToken: state.refreshToken }),
    }
  )
);
