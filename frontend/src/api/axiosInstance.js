import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const httpClient = axios.create({ baseURL: BASE_URL });

// Inject access token — skip if caller already set Authorization (e.g. me() during login)
httpClient.interceptors.request.use((config) => {
  if (!config.headers.Authorization) {
    try {
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        const { state } = JSON.parse(stored);
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      }
    } catch {
      // Corrupt localStorage — skip injection
    }
  }
  return config;
});

// Shared promise across concurrent 403 responses — prevents duplicate refresh calls
// (e.g. React 18 Strict Mode firing two simultaneous requests that both expire)
let refreshPromise = null;

async function doRefresh() {
  let refreshToken = null;
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) refreshToken = JSON.parse(stored).state?.refreshToken ?? null;
  } catch {}

  if (!refreshToken) throw new Error('No refresh token');

  // Use raw axios to bypass this interceptor
  const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
    refresh_token: refreshToken,
  });

  try {
    const raw = JSON.parse(localStorage.getItem('auth-storage') || '{}');
    raw.state = { ...raw.state, token: data.access_token, refreshToken: data.refresh_token };
    localStorage.setItem('auth-storage', JSON.stringify(raw));
  } catch {
    localStorage.setItem(
      'auth-storage',
      JSON.stringify({ state: { token: data.access_token, refreshToken: data.refresh_token } })
    );
  }

  return data.access_token;
}

// Handle 403: refresh access token then retry original request once
httpClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 403 && !original._retry) {
      original._retry = true;

      // All concurrent 403s share one refresh call — only the first creates the promise
      if (!refreshPromise) {
        refreshPromise = doRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      try {
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return httpClient(original);
      } catch {
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);
