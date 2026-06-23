import { StateCreator } from 'zustand';
import { StoreState, AuthSlice } from './types.js';
import { client } from '../lib/api-client.js';

export const createAuthSlice: StateCreator<StoreState, [], [], AuthSlice> = (set, get) => ({
  token: localStorage.getItem('qw_token'),
  user: localStorage.getItem('qw_user') ? JSON.parse(localStorage.getItem('qw_user')!) : null,

  login: async (email, password) => {
    try {
      const res = await client.api.auth.login.$post({ json: { email, password } });
      if (res.ok) {
        const body = await res.json();
        if ('token' in body) {
          localStorage.setItem('qw_token', body.token);
          localStorage.setItem('qw_user', JSON.stringify(body.user));
          set({ token: body.token, user: body.user });
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
        const body = await res.json();
        if ('token' in body) {
          localStorage.setItem('qw_token', body.token);
          localStorage.setItem('qw_user', JSON.stringify(body.user));
          set({ token: body.token, user: body.user });
          return true;
        }
      }
    } catch (e) {
      console.error('Registration error', e);
    }
    return false;
  },

  logout: () => {
    localStorage.removeItem('qw_token');
    localStorage.removeItem('qw_user');
    set({ token: null, user: null });
  },
});
