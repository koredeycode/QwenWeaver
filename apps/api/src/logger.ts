import pino from 'pino';
import type { MiddlewareHandler } from 'hono';
import type { Variables } from './index.js';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    bindings() {
      return { service: 'qwenweaver-api' };
    },
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

export function createModuleLogger(module: string): pino.Logger {
  return logger.child({ module });
}

export interface RequestLog {
  method: string;
  path: string;
  status: number;
  duration: string;
  requestId?: string;
}

export function requestLogger(): MiddlewareHandler<{ Variables: Variables }> {
  return async (c, next) => {
    const start = performance.now();
    const requestId = crypto.randomUUID().slice(0, 8);
    c.set('requestId', requestId);

    await next();

    const duration = performance.now() - start;
    const log: RequestLog = {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration: `${Math.round(duration)}ms`,
      requestId,
    };

    if (c.res.status >= 500) {
      logger.error(log, 'request failed');
    } else if (c.res.status >= 400) {
      logger.warn(log, 'request warning');
    } else {
      logger.info(log, 'request completed');
    }
  };
}
