/**
 * Centralized configuration with env validation.
 * Crashes on startup if required secrets are missing in production.
 */

const NODE_ENV = process.env.NODE_ENV ?? 'development';
const isDev = NODE_ENV === 'development' || NODE_ENV === 'test';

// ─── JWT Secret (C-1) ──────────────────────────────────────────────────────
if (!process.env.API_SECRET && !isDev) {
  throw new Error(
    'FATAL: API_SECRET environment variable is required in production. ' +
    'Set it to a strong random string (e.g. `openssl rand -hex 32`).'
  );
}

export const JWT_SECRET = process.env.API_SECRET || (isDev ? 'dev-only-insecure-secret' : '');

// ─── CORS Origins (C-2) ─────────────────────────────────────────────────────
export const CORS_ORIGINS: string[] = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : isDev
    ? ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001']
    : [];

// ─── Metrics Token (C-4) ────────────────────────────────────────────────────
export const METRICS_TOKEN = process.env.METRICS_TOKEN;

// ─── Rate Limiting (C-3) ────────────────────────────────────────────────────
export const RATE_LIMIT = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20,           // 20 auth attempts per window
  },
  copilot: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 10,           // 10 copilot requests per minute
  },
  api: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 120,          // 120 general API requests per minute
  },
};

// ─── JWT Token Expiry (L-6) ─────────────────────────────────────────────────
export const ACCESS_TOKEN_EXPIRY_SECONDS = 60 * 60; // 1 hour
export const REFRESH_TOKEN_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days
