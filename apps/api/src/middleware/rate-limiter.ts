/**
 * Sliding-window rate limiter middleware for Hono.
 * Backed by Redis when REDIS_URL is configured, falls back to in-memory.
 */
import type { MiddlewareHandler } from 'hono';
import { Redis } from 'ioredis';
import { createModuleLogger } from '../logger.js';
import { REDIS_URL } from '../config.js';

const log = createModuleLogger('middleware/rate-limiter');

interface RateLimitOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Max requests per window */
  maxRequests: number;
  /** Key extractor — defaults to JWT sub or IP */
  keyExtractor?: (c: any) => string;
}

// ─── Redis client (lazy) ────────────────────────────────────────────────

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  if (!REDIS_URL) return null;
  try {
    _redis = new Redis(REDIS_URL, {
      lazyConnect: false,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });
    _redis.on('error', (err) => {
      log.error({ error: err.message }, 'Redis rate limiter error, falling back to in-memory');
    });
    return _redis;
  } catch {
    return null;
  }
}

// ─── In-memory fallback store ────────────────────────────────────────────

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

// ─── Key extractor ──────────────────────────────────────────────────────

function defaultKey(c: any): string {
  return (
    c.get('user')?.id ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    c.req.raw?.socket?.remoteAddress ??
    'anonymous'
  );
}

// ─── Middleware factory ──────────────────────────────────────────────────

export function rateLimiter(name: string, options: RateLimitOptions): MiddlewareHandler {
  const { windowMs, maxRequests, keyExtractor } = options;
  const redis = getRedis();
  const useRedis = redis !== null;

  return useRedis
    ? redisHandler(redis!, name, windowMs, maxRequests, keyExtractor)
    : memoryHandler(name, windowMs, maxRequests, keyExtractor);
}

function redisHandler(
  redis: Redis,
  name: string,
  windowMs: number,
  maxRequests: number,
  keyExtractor?: (c: any) => string,
): MiddlewareHandler {
  const windowSec = Math.ceil(windowMs / 1000);
  const now = () => Date.now();

  return async (c, next) => {
    const key = keyExtractor ? keyExtractor(c) : defaultKey(c);
    const redisKey = `ratelimit:${name}:${key}`;
    const threshold = now() - windowMs;

    try {
      // Remove stale entries and count remaining in a single pipeline
      const pipe = redis.pipeline();
      pipe.zremrangebyscore(redisKey, 0, threshold);
      pipe.zadd(redisKey, now(), `${now()}-${Math.random()}`);
      pipe.zcard(redisKey);
      pipe.expire(redisKey, windowSec);
      const results = await pipe.exec();
      const count = (results?.[2]?.[1] as number) ?? 0;

      const remaining = Math.max(0, maxRequests - count);
      c.header('X-RateLimit-Limit', String(maxRequests));
      c.header('X-RateLimit-Remaining', String(remaining));
      c.header('X-RateLimit-Reset', String(Math.ceil((now() + windowMs) / 1000)));

      if (count > maxRequests) {
        const retryAfter = Math.ceil((threshold + windowMs - now()) / 1000);
        c.header('Retry-After', String(retryAfter));
        log.warn({ key, limiter: name, count, maxRequests }, 'Rate limit exceeded');
        return c.json({ error: 'Too many requests. Please try again later.' }, 429);
      }

      await next();
    } catch (err) {
      log.error(
        { error: (err as Error).message, limiter: name },
        'Redis rate limiter failed, allowing request',
      );
      await next();
    }
  };
}

function memoryHandler(
  name: string,
  windowMs: number,
  maxRequests: number,
  keyExtractor?: (c: any) => string,
): MiddlewareHandler {
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

    const key = keyExtractor ? keyExtractor(c) : defaultKey(c);

    let entry = entries.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      entries.set(key, entry);
    }

    entry.count++;

    const remaining = Math.max(0, maxRequests - entry.count);
    c.header('X-RateLimit-Limit', String(maxRequests));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      log.warn({ key, limiter: name, count: entry.count, maxRequests }, 'Rate limit exceeded');
      return c.json({ error: 'Too many requests. Please try again later.' }, 429);
    }

    await next();
  };
}
