export interface StorageService {
  write(key: string, data: Buffer, contentType: string): Promise<string>;
  getUrl(key: string): string;
}
