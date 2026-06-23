import { hc } from 'hono/client';
import type { AppType } from '@qwenweaver/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const TEMPLATE_API_URL = import.meta.env.VITE_TEMPLATE_API_URL || '';

export const client = hc<AppType>(API_URL);
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

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    if (getRefreshToken()) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(`${API_URL}${path}`, { ...options, headers });
        return res;
      }
    }
    clearAuth();
    notifyAuthExpired();
  }

  return res;
}

export function isSelfHosted(): boolean {
  return !!TEMPLATE_API_URL;
}

export function getTemplateApiUrl(): string {
  return TEMPLATE_API_URL || API_URL;
}

export function getSaaSUrl(): string {
  return TEMPLATE_API_URL || 'https://app.qwenweaver.com';
}
