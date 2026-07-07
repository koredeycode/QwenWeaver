import OSS from 'ali-oss';
import {
  OSS_REGION,
  OSS_ACCESS_KEY_ID,
  OSS_ACCESS_KEY_SECRET,
  OSS_BUCKET,
  OSS_ENDPOINT,
} from '../config.js';
import type { StorageService } from './types.js';

export class OSSStorageDriver implements StorageService {
  private client: OSS;

  constructor() {
    this.client = new OSS({
      region: OSS_REGION,
      accessKeyId: OSS_ACCESS_KEY_ID,
      accessKeySecret: OSS_ACCESS_KEY_SECRET,
      bucket: OSS_BUCKET,
      endpoint: OSS_ENDPOINT || undefined,
      secure: true,
      authorizationV4: true,
    });
  }

  async write(key: string, data: Buffer, contentType: string): Promise<string> {
    await this.client.put(key, data, {
      headers: { 'Content-Type': contentType },
    });
    return `/api/storage/proxy?key=${encodeURIComponent(key)}`;
  }

  getUrl(key: string): string {
    return `/api/storage/proxy?key=${encodeURIComponent(key)}`;
  }

  async getSignedUrl(key: string, expires: number = 3600): Promise<string> {
    const url = await this.client.signatureUrlV4('GET', expires, {}, key);
    return url;
  }
}
