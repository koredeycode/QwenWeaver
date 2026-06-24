import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { streamSSE } from 'hono/streaming';
import type { RouteHandler } from '@hono/zod-openapi';
import type { Variables } from '../../index.js';
import type { getUpdateInfoRoute, triggerUpdateRoute, systemHealthRoute, updateStreamRoute } from './index.js';
import { checkForUpdate, startUpdate, updateEvents, getUpdateInfo } from '../../updater.js';
import { getQueryProvider } from '@qwenweaver/database';
import { createModuleLogger } from '../../logger.js';

const log = createModuleLogger('routes/update.handlers');

export const handleGetUpdateInfo: RouteHandler<typeof getUpdateInfoRoute, { Variables: Variables }> = async (c) => {
  const info = await checkForUpdate();
  return c.json(info, 200);
};

export const handleTriggerUpdate: RouteHandler<typeof triggerUpdateRoute, { Variables: Variables }> = async (c) => {
  const result = startUpdate();
  if (result.status === 'already_running') {
    return c.json({ error: 'Update already in progress', logs: result.logs }, 409);
  }
  log.info('Update triggered by user');
  return c.json(result, 200);
};

async function checkDockerVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn('docker', ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout?.on('data', (chunk) => { out += String(chunk); });
    child.on('close', (code) => {
      resolve(code === 0 ? out.trim() : null);
    });
    child.on('error', () => resolve(null));
  });
}

function readAppVersion(): string | null {
  try {
    const pkgPath = join('/usr/lib/node_modules/@qwenweaver/cli', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version || null;
  } catch {
    return process.env.INSTALL_COMMIT_SHA || null;
  }
}

async function readDbStatus(): Promise<{ type: string; reachable: boolean }> {
  try {
    const provider = getQueryProvider();
    await provider.healthCheck();
    const mod = await import('@qwenweaver/database');
    return { type: mod.getConnection().dialect as string, reachable: true };
  } catch {
    return { type: 'unknown', reachable: false };
  }
}

export const handleSystemHealth: RouteHandler<typeof systemHealthRoute, { Variables: Variables }> = async (c) => {
  const [dockerVersion, db] = await Promise.all([
    checkDockerVersion(),
    readDbStatus(),
  ]);

  return c.json({
    node: process.version,
    database: db,
    docker: { available: dockerVersion !== null, version: dockerVersion },
    installMode: process.env.INSTALL_MODE || 'npm',
    version: readAppVersion(),
  }, 200);
};

export const handleUpdateStream: RouteHandler<typeof updateStreamRoute, { Variables: Variables }> = async (c) => {
  const info = getUpdateInfo();
  let eventId = 0;

  return streamSSE(c, async (stream) => {
    for (const logLine of info.updateLogs) {
      await stream.writeSSE({ data: JSON.stringify({ type: 'log', message: logLine }), id: String(eventId++), event: 'log' });
    }

    if (info.updateRunning) {
      await stream.writeSSE({ data: JSON.stringify({ type: 'status', updateRunning: true }), id: String(eventId++), event: 'status' });
    }

    const onLog = (line: string) => {
      stream.writeSSE({ data: JSON.stringify({ type: 'log', message: line }), id: String(eventId++), event: 'log' }).catch(() => {});
    };

    const onStatus = (status: { updateRunning: boolean; updateFinishedAt: string | null; error: string | null }) => {
      stream.writeSSE({ data: JSON.stringify({ type: 'status', ...status }), id: String(eventId++), event: 'status' }).catch(() => {});
    };

    updateEvents.on('log', onLog);
    updateEvents.on('status', onStatus);

    stream.onAbort(() => {
      updateEvents.off('log', onLog);
      updateEvents.off('status', onStatus);
    });
  });
};
