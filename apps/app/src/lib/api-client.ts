import { hc } from 'hono/client';
import type { AppType, AppType2 } from '@qwenweaver/api';

export const API_URL = import.meta.env.VITE_API_URL || '';

// Custom fetch that auto-retries on 401 by refreshing the token.
// This wraps every hc client call so individual calls don't need `withRefresh()`.
const authedFetch: typeof window.fetch = async (input, init) => {
  let res = await window.fetch(input, init);
  if (res.status === 401 && getRefreshToken()) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const headers = new Headers(init?.headers);
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await window.fetch(input, { ...init, headers });
    }
  }
  return res;
};

// Two clients because hc<T> can't intersect Hono types from separate chains.
// client1: templates, auth, workflow, execution, copilot, mcp
// client2: mcp/registry, analytics, credits, setup, system/update
export const client = hc<AppType>(API_URL, { fetch: authedFetch });
export const client2 = hc<AppType2>(API_URL, { fetch: authedFetch });
export type { AppType };

let refreshPromise: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  return localStorage.getItem('qw_token');
}

export function setAccessToken(token: string | null) {
  if (token) {
    localStorage.setItem('qw_token', token);
  } else {
    localStorage.removeItem('qw_token');
  }
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('qw_refresh');
}

export function setRefreshToken(token: string | null) {
  if (token) {
    localStorage.setItem('qw_refresh', token);
  } else {
    localStorage.removeItem('qw_refresh');
  }
}

export function clearAuth() {
  localStorage.removeItem('qw_token');
  localStorage.removeItem('qw_refresh');
  localStorage.removeItem('qw_user');
}

async function refreshAccessTokenInternal(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    notifyAuthExpired();
    return null;
  }

  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clearAuth();
      notifyAuthExpired();
      return null;
    }
    const data = await res.json();
    setAccessToken(data.token);
    return data.token;
  } catch {
    clearAuth();
    notifyAuthExpired();
    return null;
  }
}

function notifyAuthExpired() {
  window.dispatchEvent(new CustomEvent('auth:expired'));
}

export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessTokenInternal().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * Wraps a hc typed-client call with automatic 401 → token refresh → retry.
 * Use this for write operations or reads that must not fail silently on expiry.
 *
 * @example
 *   const res = await withRefresh(() => client.api.workflow.$get({}, { headers: authHeaders() }));
 */
export async function withRefresh(call: () => Promise<Response>): Promise<Response> {
  let res = await call();
  if (res.status === 401 && getRefreshToken()) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await call();
    } else {
      clearAuth();
      notifyAuthExpired();
    }
  }
  return res;
}

/** Returns Authorization headers for the current user, or empty if not logged in */
export function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getTemplateApiUrl(): string {
  return API_URL;
}
