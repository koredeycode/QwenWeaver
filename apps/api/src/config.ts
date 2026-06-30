const NODE_ENV = process.env.NODE_ENV ?? 'development';
const isDev = NODE_ENV === 'development' || NODE_ENV === 'test';

if (!process.env.BETTER_AUTH_SECRET && !isDev) {
  throw new Error(
    'FATAL: BETTER_AUTH_SECRET environment variable is required in production. ' +
      'Set it to a strong random string (e.g. `openssl rand -hex 32`).',
  );
}
if (!process.env.BETTER_AUTH_URL && !isDev) {
  throw new Error(
    'FATAL: BETTER_AUTH_URL environment variable is required in production. ' +
      'Set it to the public base URL of the API server (e.g. https://api.qwenweaver.xyz/api).',
  );
}
if (!process.env.PUBLIC_URL && !isDev) {
  throw new Error(
    'FATAL: PUBLIC_URL environment variable is required in production. ' +
      'Set it to the public base URL (e.g. https://api.qwenweaver.xyz).',
  );
}

export const BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET || (isDev ? 'dev-only-insecure-secret-for-development-only' : '');
export const BETTER_AUTH_URL =
  process.env.BETTER_AUTH_URL || (isDev ? 'http://localhost:3001' : '');

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const GITHUB_CLIENT_ID = process.env.GH_CLIENT_ID || process.env.GITHUB_CLIENT_ID;
export const GITHUB_CLIENT_SECRET =
  process.env.GH_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET;

// ─── Credential Encryption ──────────────────────────────────────────────
if (!process.env.CREDENTIALS_ENCRYPTION_KEY && !isDev && !process.env.BETTER_AUTH_SECRET) {
  throw new Error(
    'FATAL: CREDENTIALS_ENCRYPTION_KEY or BETTER_AUTH_SECRET environment variable is required in production. ' +
      'Set it to a strong random string (e.g. `openssl rand -hex 32`).',
  );
}
export const CREDENTIALS_ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY;

// ─── CORS Origins ─────────────────────────────────────────────────────
export const CORS_ORIGINS: string[] = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : isDev
    ? [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        'http://localhost:3001',
        'https://app.qwenweaver.xyz',
        'https://api.qwenweaver.xyz',
      ]
    : [];

// ─── Public URL (used for generating absolute asset URLs) ────────────
export const PUBLIC_URL = process.env.PUBLIC_URL || (isDev ? 'http://localhost:3001' : '');

// ─── Storage ─────────────────────────────────────────────────────────
export const STORAGE_DRIVER = process.env.STORAGE_DRIVER || 'local';

export const OSS_REGION = process.env.OSS_REGION || '';
export const OSS_ACCESS_KEY_ID = process.env.OSS_ACCESS_KEY_ID || '';
export const OSS_ACCESS_KEY_SECRET = process.env.OSS_ACCESS_KEY_SECRET || '';
export const OSS_BUCKET = process.env.OSS_BUCKET || '';
export const OSS_ENDPOINT = process.env.OSS_ENDPOINT || '';

// ─── Metrics Token ────────────────────────────────────────────────────
export const METRICS_TOKEN = process.env.METRICS_TOKEN;

// ─── Redis ────────────────────────────────────────────────────────────
export const REDIS_URL = process.env.REDIS_URL || '';

// ─── Rate Limiting ────────────────────────────────────────────────────
export const RATE_LIMIT = {
  copilot: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 120,
  },
};

// ─── Brevo (Email Verification) ───────────────────────────────────────
export const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
export const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || '';
export const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'QwenWeaver';

// ─── Credits & Limits ─────────────────────────────────────────────────
export const SIGNUP_CREDITS = 1000;
export const MAX_FREE_WORKFLOWS = 2;
export const LOW_CREDIT_WARNING = 100;
export const NODE_BASE_COST: Record<string, number> = {
  trigger: 0,
  input_trigger: 0,
  agent: 5,
  supervisor: 15,
  mcp_tool: 2,
  logic: 1,
};
export const FIXED_COST = 5;
export const PROMPT_TOKEN_COST = 0.001;
export const COMPLETION_TOKEN_COST = 0.002;
export const MIN_COST = 5;
