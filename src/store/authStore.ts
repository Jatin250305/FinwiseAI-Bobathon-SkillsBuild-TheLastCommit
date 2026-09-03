// ── Auth Store ────────────────────────────────────────────────────────────────
import { create } from 'zustand';
import type { User } from '@/types/auth';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (user, token) => {
    // Store token + user in sessionStorage (clears on tab close)
    sessionStorage.setItem('finwise_token', token);
    sessionStorage.setItem('finwise_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  clearAuth: () => {
    sessionStorage.removeItem('finwise_token');
    sessionStorage.removeItem('finwise_user');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));

// ── Rehydrate from sessionStorage on app load ──────────────────────────────
const storedToken = sessionStorage.getItem('finwise_token');
const storedUserRaw = sessionStorage.getItem('finwise_user');

if (storedToken) {
  let restoredUser: User | null = null;
  if (storedUserRaw) {
    try { restoredUser = JSON.parse(storedUserRaw) as User; } catch { /* ignore */ }
  }
  useAuthStore.setState({ token: storedToken, isAuthenticated: true, user: restoredUser });
}
