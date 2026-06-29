import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { PUBLIC_URL } from '../config.js';
import type { StorageService } from './types.js';

const BASE_DIR = path.resolve('public', 'storage', 'runs');

function sanitize(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export class LocalStorageDriver implements StorageService {
  async write(key: string, data: Buffer, _contentType: string): Promise<string> {
    const normalizedKey = key.split('/').map(sanitize).join('/');
    const dir = path.dirname(normalizedKey);
    const absoluteDir = path.resolve(BASE_DIR, dir);
    const absolutePath = path.resolve(BASE_DIR, normalizedKey);

    if (!absolutePath.startsWith(BASE_DIR)) {
      throw new Error('Path traversal detected');
    }

    await fs.mkdir(absoluteDir, { recursive: true });
    await fs.writeFile(absolutePath, data);

    return `/public/storage/runs/${normalizedKey}`;
  }

  getUrl(key: string): string {
    const base = PUBLIC_URL || 'http://localhost:3001';
    return `${base}/public/storage/runs/${key}`;
  }
}
