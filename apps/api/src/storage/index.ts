import { STORAGE_DRIVER } from '../config.js';
import { LocalStorageDriver } from './local.js';
import { OSSStorageDriver } from './oss.js';
import type { StorageService } from './types.js';

let instance: StorageService | null = null;

export function getStorage(): StorageService {
  if (!instance) {
    switch (STORAGE_DRIVER) {
      case 'oss':
        instance = new OSSStorageDriver();
        break;
      case 'local':
      default:
        instance = new LocalStorageDriver();
        break;
    }
  }
  return instance;
}

export type { StorageService };
