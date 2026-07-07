import { StateCreator } from 'zustand';
import { StoreState, AuthSlice } from './types.js';
import { authClient, client2 } from '../lib/api-client.js';
import { toast } from 'sonner';
import { clearDraft } from './auto-save.js';

export const createAuthSlice: StateCreator<StoreState, [], [], AuthSlice> = (set, _get) => {
  const fetchCredits = async () => {
    try {
      const res = await client2.api.credits.$get();
      if (res.ok) {
        const data = (await res.json()) as any;
        set({ credits: data });
        if (data.lowBalance && data.balance > 0) {
          toast.warning(`Low credits: ${data.balance}. Some executions may be blocked.`);
        }
      }
    } catch {
      // silently fail — credits are non-critical
    }
  };

  // Initialize session
  authClient.getSession().then((session) => {
    if (session?.data) {
      set({
        user: session.data.user,
        session: session.data.session,
        authLoading: false,
      });
      fetchCredits();
    } else {
      set({ authLoading: false });
    }
  });

  return {
    user: null,
    session: null,
    credits: null,
    authLoading: true,

    login: async (email, password) => {
      try {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) {
          console.error('Login error', result.error);
          return false;
        }
        const session = await authClient.getSession();
        if (session?.data) {
          set({ user: session.data.user, session: session.data.session });
          fetchCredits();
          return true;
        }
      } catch (e) {
        console.error('Login error', e);
      }
      return false;
    },

    register: async (email, password, name) => {
      try {
        const result = await authClient.signUp.email({ email, password, name });
        if (result.error) {
          console.error('Register error', result.error);
          return false;
        }
        const signUpData = result.data as unknown as { user: any; session?: any } | null;
        if (signUpData?.session) {
          set({ user: signUpData.user, session: signUpData.session });
          fetchCredits();
        }
        return true;
      } catch (e) {
        console.error('Registration error', e);
      }
      return false;
    },

    fetchCredits,

    logout: () => {
      authClient.signOut();
      clearDraft();
      set({ user: null, session: null, credits: null });
    },
  };
};
