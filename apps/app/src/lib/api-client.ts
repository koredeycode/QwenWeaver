import { hc } from 'hono/client';
import { createAuthClient } from 'better-auth/client';
import type { AppType } from '@qwenweaver/api';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const customFetch: typeof fetch = (input, init) => {
  return fetch(input, { ...init, credentials: 'include' });
};

export const authClient = createAuthClient({
  baseURL: API_URL,
  fetch: customFetch,
});

export const client = hc<AppType>(API_URL, { fetch: customFetch });
export const client2 = client;
export type { AppType };

/** Returns the current access token or null (for EventSource streaming) */
export async function getAccessToken(): Promise<string | null> {
  const session = await authClient.getSession();
  if (session?.data?.session.token) {
    return session.data.session.token;
  }
  return null;
}

/**
 * Wraps an API call with refresh-on-401 logic.
 * With Better Auth (cookie-based), auto-refresh is handled transparently,
 * so this is now just an identity function.
 */
export async function withRefresh<T>(fn: () => Promise<T>): Promise<T> {
  return fn();
}

export function getTemplateApiUrl(): string {
  return API_URL;
}
