import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ENV_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY;
const FALLBACK_KEY = process.env.API_SECRET;

function getMasterKey(): string {
  if (ENV_KEY) return ENV_KEY;
  if (FALLBACK_KEY) return FALLBACK_KEY;
  throw new Error(
    'CREDENTIALS_ENCRYPTION_KEY environment variable is required for credential encryption. ' +
      'Generate one with: openssl rand -hex 32',
  );
}

function deriveKey(password: string): Buffer {
  return createHash('sha256').update(password).digest();
}

export function encrypt(text: string): string {
  const key = deriveKey(getMasterKey());
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decrypt(encoded: string): string {
  const key = deriveKey(getMasterKey());
  const parts = encoded.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted payload');
  const iv = Buffer.from(parts[0], 'base64');
  const tag = Buffer.from(parts[1], 'base64');
  const encrypted = Buffer.from(parts[2], 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf-8');
}

export function encryptWithCustomKey(text: string, masterKey: string): string {
  const key = deriveKey(masterKey);
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptWithCustomKey(encoded: string, masterKey: string): string {
  const key = deriveKey(masterKey);
  const parts = encoded.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted payload');
  const iv = Buffer.from(parts[0], 'base64');
  const tag = Buffer.from(parts[1], 'base64');
  const encrypted = Buffer.from(parts[2], 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf-8');
}
