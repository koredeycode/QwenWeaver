/**
 * Simple in-memory sliding-window rate limiter middleware for Hono.
 * No external dependencies required.
 */
import type { MiddlewareHandler } from 'hono';
import { createModuleLogger } from '../logger.js';

const log = createModuleLogger('middleware/rate-limiter');

interface RateLimitOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Max requests per window */
  maxRequests: number;
  /** Key extractor — defaults to IP + JWT sub */
  keyExtractor?: (c: any) => string;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Map<string, WindowEntry>>();

// Sweep expired entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [prefix, entries] of buckets) {
    for (const [key, entry] of entries) {
      if (now > entry.resetAt) {
        entries.delete(key);
      }
    }
    if (entries.size === 0) {
      buckets.delete(prefix);
    }
  }
}, 60_000).unref();

export function rateLimiter(name: string, options: RateLimitOptions): MiddlewareHandler {
  const { windowMs, maxRequests, keyExtractor } = options;

  // Create a dedicated bucket for this limiter instance
  if (!buckets.has(name)) {
    buckets.set(name, new Map());
  }

  return async (c, next) => {
    let entries = buckets.get(name);
    if (!entries) {
      entries = new Map();
      buckets.set(name, entries);
    }
    const now = Date.now();

    // Extract key: prefer JWT sub, fall back to IP
    const key = keyExtractor
      ? keyExtractor(c)
      : ((c.get('jwtPayload') as any)?.sub ?? c.req.header('x-forwarded-for') ?? 'anonymous');

    let entry = entries.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      entries.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - entry.count);
    c.header('X-RateLimit-Limit', String(maxRequests));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      c.header('Retry-After', String(retryAfter));

      log.warn(
        { key, limiter: name, count: entry.count, maxRequests },
        'Rate limit exceeded',
      );

      return c.json(
        { error: 'Too many requests. Please try again later.' },
        429,
      );
    }

    await next();
  };
}
