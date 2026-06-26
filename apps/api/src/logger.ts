import { AsyncLocalStorage } from 'node:async_hooks';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import pino from 'pino';
import type { MiddlewareHandler } from 'hono';
import { routePath } from 'hono/route';
import { http_request_duration_ms } from './metrics.js';

export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

const level = process.env.LOG_LEVEL || 'info';

// Ensure the data directory exists for the log file
const logDir = resolve(process.cwd(), 'data');
if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });

const logPath = resolve(logDir, 'qwenweaver.log');
const fileStream = createWriteStream(logPath, { flags: 'a' });

export const logger = pino(
  {
    level,
    formatters: {
      bindings() {
        return { service: 'qwenweaver-api' };
      },
      level(label) {
        return { level: label };
      },
    },
    mixin() {
      const store = requestContext.getStore();
      return store ? { requestId: store.requestId } : {};
    },
  },
  pino.multistream([
    { stream: process.stdout, level },
    { stream: fileStream, level },
  ]),
);

export function createModuleLogger(module: string): pino.Logger {
  return logger.child({ module });
}

export interface RequestLog {
  method: string;
  path: string;
  status: number;
  duration: string;
}

export function requestLogger(): MiddlewareHandler {
  return async (c, next) => {
    const start = performance.now();
    const requestId = crypto.randomUUID().slice(0, 8);
    c.set('requestId', requestId);

    await requestContext.run({ requestId }, async () => {
      await next();

      const duration = performance.now() - start;
      const log: RequestLog = {
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        duration: `${Math.round(duration)}ms`,
      };

      http_request_duration_ms
        .labels(c.req.method, routePath(c), c.res.status.toString())
        .observe(duration);

      if (c.res.status >= 500) {
        logger.error(log, 'request failed');
      } else if (c.res.status >= 400) {
        logger.warn(log, 'request warning');
      } else {
        logger.info(log, 'request completed');
      }
    });
  };
}
