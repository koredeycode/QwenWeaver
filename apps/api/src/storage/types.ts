export interface StorageService {
  write(key: string, data: Buffer, contentType: string): Promise<string>;
  getUrl(key: string): string;
  getSignedUrl(key: string, expires?: number): Promise<string>;
}
