import { AsyncLocalStorage } from 'node:async_hooks';
import pino from 'pino';
import type { MiddlewareHandler } from 'hono';

export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
      bindings() {
        return { service: 'qwenweaver-api' };
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
  pino.transport({
    targets: [
      {
        target: 'pino/file',
        options: { destination: 1 },
        level: process.env.LOG_LEVEL || 'info',
      },
      {
        target: 'pino/file',
        options: { destination: './qwenweaver.log', mkdir: true },
        level: process.env.LOG_LEVEL || 'info',
      },
    ],
  })
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
