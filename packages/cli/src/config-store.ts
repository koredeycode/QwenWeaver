import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import readline from 'node:readline';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface QwenWeaverConfig {
  apiSecret: string;
  databaseUrl: string;
  dashscopeApiKey: string;
  corsOrigins: string;
  port: number;
  logLevel: string;
}

const DEFAULTS: QwenWeaverConfig = {
  apiSecret: '',
  databaseUrl: './data/dev.db',
  dashscopeApiKey: '',
  corsOrigins: 'http://localhost:5173',
  port: 3001,
  logLevel: 'info',
};

/* ------------------------------------------------------------------ */
/*  Path helpers                                                       */
/* ------------------------------------------------------------------ */

function configDir(): string {
  return resolve(homedir(), '.qwenweaver');
}

function configPath(encrypted: boolean): string {
  return resolve(configDir(), encrypted ? 'config.json.enc' : 'config.json');
}

function ensureDir(): void {
  const dir = configDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/* ------------------------------------------------------------------ */
/*  AES-256-GCM encryption helpers                                     */
/* ------------------------------------------------------------------ */

function deriveKey(password: string): Buffer {
  return createHash('sha256').update(password).digest();
}

function encrypt(text: string, password: string): string {
  const key = deriveKey(password);
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf-8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // Format: iv:tag:ciphertext (all base64)
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decrypt(encoded: string, password: string): string {
  const key = deriveKey(password);
  const parts = encoded.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted payload');
  const iv = Buffer.from(parts[0], 'base64');
  const tag = Buffer.from(parts[1], 'base64');
  const encrypted = Buffer.from(parts[2], 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf-8');
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function isEncrypted(): boolean {
  return existsSync(configPath(true));
}

export function configExists(): boolean {
  return existsSync(configPath(false)) || existsSync(configPath(true));
}

export function loadConfig(password?: string): QwenWeaverConfig {
  const enc = isEncrypted();

  if (enc && !password) {
    throw new Error(
      'Config file is encrypted. Provide a password with --password or run `qwenweaver config --password <pw>` first.',
    );
  }

  const path = configPath(enc);
  if (!existsSync(path)) return { ...DEFAULTS };

  let raw = readFileSync(path, 'utf-8');
  if (enc) raw = decrypt(raw, password!);

  try {
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    throw new Error('Failed to parse config file. It may be corrupted.');
  }
}

export function saveConfig(
  config: QwenWeaverConfig,
  password?: string,
): void {
  ensureDir();
  const raw = JSON.stringify(config, null, 2);

  if (password) {
    const enc = encrypt(raw, password);
    writeFileSync(configPath(true), enc, 'utf-8');
    // Remove plaintext if it exists
    const plain = configPath(false);
    if (existsSync(plain)) writeFileSync(plain, '');
  } else {
    writeFileSync(configPath(false), raw, 'utf-8');
  }
}

/* ------------------------------------------------------------------ */
/*  Interactive prompt helpers                                         */
/* ------------------------------------------------------------------ */

function question(query: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = defaultValue
    ? `${query} [${defaultValue}]: `
    : `${query}: `;

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

export async function promptForConfig(
  existing: QwenWeaverConfig,
): Promise<QwenWeaverConfig> {
  console.log('\nConfigure your QwenWeaver instance.\n');

  const apiSecret =
    existing.apiSecret ||
    (await question('JWT secret (API_SECRET) — generate with `openssl rand -hex 32`'));
  const dashscopeApiKey =
    existing.dashscopeApiKey ||
    (await question('Dashscope API key (DASHSCOPE_API_KEY) — required for AI agents'));
  const databaseUrl =
    existing.databaseUrl ||
    (await question(
      'Database URL (DATABASE_URL)',
      './data/dev.db',
    ));
  const corsOrigins =
    existing.corsOrigins ||
    (await question(
      'CORS origins (comma-separated, or * for all)',
      'http://localhost:5173',
    ));
  const portStr = await question(
    'Port',
    String(existing.port || 3001),
  );
  const logLevel = await question(
    'Log level',
    existing.logLevel || 'info',
  );

  const useEncryption = await question(
    'Encrypt config file with a master password? (y/n)',
    'n',
  );

  let password: string | undefined;
  if (useEncryption.toLowerCase().startsWith('y')) {
    password = await question('Master password (used to decrypt on start)');
    if (!password) {
      console.log('  ⚠  No password given, saving as plaintext.');
      password = undefined;
    }
  }

  const config: QwenWeaverConfig = {
    apiSecret,
    dashscopeApiKey,
    databaseUrl,
    corsOrigins,
    port: Number(portStr) || 3001,
    logLevel,
  };

  saveConfig(config, password);
  console.log('\n✔ Config saved to ~/.qwenweaver/config.json');
  if (password) {
    console.log('  (encrypted with AES-256-GCM)');
  }

  return config;
}
