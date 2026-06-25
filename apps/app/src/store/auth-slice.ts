import { StateCreator } from 'zustand';
import { StoreState, AuthSlice } from './types.js';
import { client, client2, setAccessToken, setRefreshToken, clearAuth, authHeaders } from '../lib/api-client.js';
import { toast } from 'sonner';

export const createAuthSlice: StateCreator<StoreState, [], [], AuthSlice> = (set, _get) => {
  if (typeof window !== 'undefined') {
    window.addEventListener('auth:expired', () => {
      clearAuth();
      set({ token: null, refreshToken: null, user: null, credits: null });
    });
  }

  const fetchCredits = async () => {
    try {
      const res = await client2.api.credits.$get({}, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json() as any;
        set({ credits: data });
        if (data.lowBalance && data.balance > 0) {
          toast.warning(`Low credits: ${data.balance}. Some executions may be blocked.`);
        }
      }
    } catch {
      // silently fail — credits are non-critical
    }
  };

  return {
  token: localStorage.getItem('qw_token'),
  refreshToken: localStorage.getItem('qw_refresh'),
  user: localStorage.getItem('qw_user') ? JSON.parse(localStorage.getItem('qw_user')!) : null,
  credits: null,

  login: async (email, password) => {
    try {
      const res = await client.api.auth.login.$post({ json: { email, password } });
      if (res.ok) {
        const body = await res.json() as { token: string; refreshToken?: string; user: { id: string; email: string } };
        if (body.token) {
          setAccessToken(body.token);
          if (body.refreshToken) setRefreshToken(body.refreshToken);
          localStorage.setItem('qw_user', JSON.stringify(body.user));
          set({ token: body.token, refreshToken: body.refreshToken ?? null, user: body.user });
          fetchCredits();
          return true;
        }
      }
    } catch (e) {
      console.error('Login error', e);
    }
    return false;
  },

  register: async (email, password) => {
    try {
      const res = await client.api.auth.register.$post({ json: { email, password } });
      if (res.ok) {
        const body = await res.json() as { token: string; refreshToken?: string; user: { id: string; email: string } };
        if (body.token) {
          setAccessToken(body.token);
          if (body.refreshToken) setRefreshToken(body.refreshToken);
          localStorage.setItem('qw_user', JSON.stringify(body.user));
          set({ token: body.token, refreshToken: body.refreshToken ?? null, user: body.user });
          fetchCredits();
          return true;
        }
      }
    } catch (e) {
      console.error('Registration error', e);
    }
    return false;
  },

  refreshAccessToken: async () => {
    const { refreshAccessToken: refresh } = await import('../lib/api-client.js');
    const newToken = await refresh();
    if (newToken) {
      set({ token: newToken });
      return true;
    }
    clearAuth();
    set({ token: null, refreshToken: null, user: null, credits: null });
    return false;
  },

  fetchCredits,

  logout: () => {
    clearAuth();
    set({ token: null, refreshToken: null, user: null, credits: null });
  },
};
};
