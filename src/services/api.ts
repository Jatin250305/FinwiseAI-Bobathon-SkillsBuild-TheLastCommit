// ── Centralized Axios instance ───────────────────────────────────────────────
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach bearer token from memory (set by authStore)
apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('finwise_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize error responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth and redirect to login
      sessionStorage.removeItem('finwise_token');
      window.location.href = '/login';
    }
    // Never surface raw backend errors to the UI — callers handle friendly messages
    return Promise.reject(error);
  }
);

export default apiClient;
