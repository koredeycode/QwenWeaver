import { AsyncLocalStorage } from 'node:async_hooks';
import pino from 'pino';
import type { MiddlewareHandler } from 'hono';
import { routePath } from 'hono/route';
import { http_request_duration_ms } from './metrics.js';

export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

const stdout = pino.destination(1);
const fileLog = pino.destination({ dest: './qwenweaver.log', mkdir: true, sync: false });

const level = process.env.LOG_LEVEL || 'info';

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
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  },
  pino.multistream([
    { stream: stdout, level },
    { stream: fileLog, level },
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
