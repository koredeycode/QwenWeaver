import { hc } from 'hono/client';
import type { AppType } from '@qwenweaver/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const TEMPLATE_API_URL = import.meta.env.VITE_TEMPLATE_API_URL || '';

export const client = hc<AppType>(API_URL);
export type { AppType };

export function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('qw_token');
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
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
