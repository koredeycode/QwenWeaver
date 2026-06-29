import { hc } from 'hono/client';
import { createAuthClient } from 'better-auth/client';
import type { AppType, AppType2 } from '@qwenweaver/api';

export const API_URL = import.meta.env.VITE_API_URL || '';

export const authClient = createAuthClient({
  baseURL: API_URL,
});

// Two clients because hc<T> can't intersect Hono types from separate chains.
// client1: templates, workflow, execution, copilot, mcp
// client2: mcp/registry, analytics, credits, setup, system/update
export const client = hc<AppType>(API_URL);
export const client2 = hc<AppType2>(API_URL);
export type { AppType };

/** Returns Authorization headers for the current user, or empty if not logged in */
export async function authHeaders(): Promise<Record<string, string>> {
  const session = await authClient.getSession();
  if (session?.data?.session.token) {
    return { Authorization: `Bearer ${session.data.session.token}` };
  }
  return {};
}

/** Returns the current access token or null */
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
