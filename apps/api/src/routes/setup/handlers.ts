import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import bcrypt from 'bcryptjs';
import type { Context } from 'hono';
import type { Variables } from '../../index.js';
import { getQueryProvider } from '@qwenweaver/database';
import { CredentialInput } from '@qwenweaver/types';
import { createModuleLogger } from '../../logger.js';

const log = createModuleLogger('routes/setup.handlers');

interface StoredSetup {
  ownerCreated: boolean;
  runtimeConfigured: boolean;
  completedAt?: string;
}

function getSetupFilePath(): string {
  const dataDir = process.env.DATA_DIR || resolve(process.cwd(), 'data');
  return resolve(dataDir, '.setup-complete.json');
}

function readSetupStatus(): StoredSetup {
  const path = getSetupFilePath();
  if (!existsSync(path)) {
    return { ownerCreated: false, runtimeConfigured: false };
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return { ownerCreated: false, runtimeConfigured: false };
  }
}

function writeSetupStatus(status: StoredSetup): void {
  const path = getSetupFilePath();
  writeFileSync(path, JSON.stringify(status, null, 2), 'utf-8');
}

async function checkOwnerExists(): Promise<boolean> {
  try {
    const provider = getQueryProvider();
    const result = await provider.getUserByEmail('admin@localhost');
    return result !== null;
  } catch {
    return false;
  }
}

export const handleGetSetupStatus = async (c: Context<{ Variables: Variables }>) => {
  const stored = readSetupStatus();
  const ownerExists = await checkOwnerExists();

  const complete = stored.ownerCreated && stored.runtimeConfigured && ownerExists;

  const runtimeConfig = stored.runtimeConfigured
    ? {
        dbPath: process.env.DATABASE_URL || './data/qwenweaver.db',
      }
    : undefined;

  return c.json(
    {
      complete,
      ownerExists,
      runtimeConfig,
    },
    200,
  );
};

export const handleSetup = async (c: Context<{ Variables: Variables }>) => {
  const raw = await c.req.json();
  const parsed = (await import('./schema.js')).SetupPayloadSchema.safeParse(raw);

  if (!parsed.success) {
    return c.json({ error: 'Invalid setup payload', details: parsed.error.format() }, 400);
  }

  const body = parsed.data;
  const stored = readSetupStatus();

  // Create owner account
  let ownerUserId: string | undefined;
  if (body.owner) {
    const ownerExists = await checkOwnerExists();
    if (ownerExists) {
      return c.json({ error: 'Owner account already exists. Use /api/auth/login instead.' }, 400);
    }

    try {
      ownerUserId = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(body.owner.password, 10);
      const provider = getQueryProvider();
      await provider.createUser(ownerUserId, body.owner.email, passwordHash);
      stored.ownerCreated = true;
      log.info({ userId: ownerUserId, email: body.owner.email }, 'Owner account created');
    } catch (err) {
      log.error({ error: (err as Error).message }, 'Failed to create owner');
      return c.json({ error: 'Failed to create owner account' }, 400);
    }
  }

  // Auto-create dashscope_api_key credential if an API key was provided
  const dashscopeKey = body.runtime?.dashscopeApiKey;
  if (dashscopeKey && ownerUserId) {
    try {
      const provider = getQueryProvider();
      await provider.createCredential(ownerUserId, {
        name: 'DashScope API Key',
        type: 'dashscope_api_key',
        value: dashscopeKey,
        description: 'Auto-created during initial setup',
      });
      log.info('DashScope API key credential auto-created for owner');
    } catch (err) {
      log.error({ error: (err as Error).message }, 'Failed to auto-create DashScope credential');
    }
  }

  // Apply runtime config
  if (body.runtime) {
    const envPath = process.env.QWENWEAVER_ENV_PATH || resolve(process.cwd(), '.env');
    const envContent: string[] = [];

    if (existsSync(envPath)) {
      const existing = readFileSync(envPath, 'utf-8');
      envContent.push(existing);
    }

    // Auto-generate JWT secret if none exists
    const existingJwt = process.env.API_SECRET || process.env.JWT_SECRET || '';
    const jwtSecret = existingJwt || crypto.randomUUID();

    const envVars: Record<string, string> = {
      DASHSCOPE_API_KEY: body.runtime.dashscopeApiKey || process.env.DASHSCOPE_API_KEY || '',
      API_SECRET: jwtSecret,
      JWT_SECRET: jwtSecret,
      DATABASE_URL: body.runtime.databaseUrl || process.env.DATABASE_URL || './data/qwenweaver.db',
      PORT: String(process.env.PORT || 3001),
      CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:3001',
      PUBLIC_URL: process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`,
    };

    for (const [key, value] of Object.entries(envVars)) {
      const regex = new RegExp(`^${key}=.*`, 'm');
      const line = `${key}=${value}`;
      if (envContent.some((c) => regex.test(c))) {
        for (let i = 0; i < envContent.length; i++) {
          envContent[i] = envContent[i].replace(regex, line);
        }
      } else {
        envContent.push(line);
      }
    }

    writeFileSync(envPath, envContent.join('\n'), 'utf-8');
    stored.runtimeConfigured = true;
    log.info('Runtime configuration applied');
  }

  stored.completedAt = new Date().toISOString();
  writeSetupStatus(stored);

  return c.json(
    {
      success: true,
      message: 'Setup completed successfully',
    },
    200,
  );
};

export const handleReconfigure = async (c: Context<{ Variables: Variables }>) => {
  const raw = await c.req.json();
  const parsed = (await import('./schema.js')).ReconfigurePayloadSchema.safeParse(raw);

  if (!parsed.success) {
    return c.json({ error: 'Invalid reconfigure payload', details: parsed.error.format() }, 400);
  }

  const body = parsed.data;
  const envPath = process.env.QWENWEAVER_ENV_PATH || resolve(process.cwd(), '.env');
  const envContent: string[] = [];

  if (existsSync(envPath)) {
    const existing = readFileSync(envPath, 'utf-8');
    envContent.push(existing);
  }

  const envVars: Record<string, string> = {};

  if (body.dashscopeApiKey !== undefined) envVars['DASHSCOPE_API_KEY'] = body.dashscopeApiKey;
  if (body.databaseUrl !== undefined) envVars['DATABASE_URL'] = body.databaseUrl;
  if (body.port !== undefined) envVars['PORT'] = String(body.port);
  if (body.corsOrigins !== undefined) envVars['CORS_ORIGINS'] = body.corsOrigins;
  if (body.publicUrl !== undefined) envVars['PUBLIC_URL'] = body.publicUrl;

  if (Object.keys(envVars).length === 0) {
    return c.json({ error: 'No configuration values provided' }, 400);
  }

  for (const [key, value] of Object.entries(envVars)) {
    const regex = new RegExp(`^${key}=.*`, 'm');
    const line = `${key}=${value}`;
    if (envContent.some((c) => regex.test(c))) {
      for (let i = 0; i < envContent.length; i++) {
        envContent[i] = envContent[i].replace(regex, line);
      }
    } else {
      envContent.push(line);
    }
  }

  writeFileSync(envPath, envContent.join('\n'), 'utf-8');
  log.info({ updatedKeys: Object.keys(envVars) }, 'Runtime configuration updated via reconfigure');

  return c.json(
    {
      success: true,
      message: 'Configuration updated. Restart the server for changes to take effect.',
    },
    200,
  );
};
