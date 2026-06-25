import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, configExists, isEncrypted } from '../config-store.js';
import readline from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..', '..', '..');

interface StartOptions {
  port?: string;
  password?: string;
}

function question(query: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function startCommand(options: StartOptions = {}): Promise<void> {
  if (!configExists()) {
    console.error('No config found. Run `qwenweaver init` first.');
    process.exit(1);
  }

  let password = options.password;
  if (isEncrypted() && !password) {
    password = await question('Config is encrypted. Enter master password: ');
    if (!password) {
      console.error('Password is required to decrypt config.');
      process.exit(1);
    }
  }

  const config = loadConfig(password ?? undefined);
  const port = options.port || String(config.port) || '3001';

  console.log(`Starting QwenWeaver API on port ${port}...`);

  // We set environment variables from the config so the API picks them up
  const envs: Record<string, string> = {
    ...(process.env as Record<string, string>),
    NODE_ENV: 'production',
    PORT: port,
    API_SECRET: config.apiSecret,
    DATABASE_URL: config.databaseUrl,
    DASHSCOPE_API_KEY: config.dashscopeApiKey,
    CORS_ORIGINS: config.corsOrigins,
    LOG_LEVEL: config.logLevel,
  };

  delete envs['password'];

  const apiEntry = resolve(ROOT, 'apps', 'api', 'dist', 'index.js');

  try {
    execSync(`node ${apiEntry}`, {
      cwd: resolve(ROOT, 'apps', 'api'),
      stdio: 'inherit',
      env: envs,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Server stopped: ${msg}`);
    process.exit(1);
  }
}
