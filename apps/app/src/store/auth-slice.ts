import { StateCreator } from 'zustand';
import { StoreState, AuthSlice } from './types.js';
import { client, setAccessToken, setRefreshToken, clearAuth } from '../lib/api-client.js';

export const createAuthSlice: StateCreator<StoreState, [], [], AuthSlice> = (set, get) => {
  if (typeof window !== 'undefined') {
    window.addEventListener('auth:expired', () => {
      clearAuth();
      set({ token: null, refreshToken: null, user: null });
    });
  }

  return {
  token: localStorage.getItem('qw_token'),
  refreshToken: localStorage.getItem('qw_refresh'),
  user: localStorage.getItem('qw_user') ? JSON.parse(localStorage.getItem('qw_user')!) : null,

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
    set({ token: null, refreshToken: null, user: null });
    return false;
  },

  logout: () => {
    clearAuth();
    set({ token: null, refreshToken: null, user: null });
  },
};
};
