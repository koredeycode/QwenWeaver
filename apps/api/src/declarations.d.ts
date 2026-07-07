declare module 'ali-oss' {
  interface OSSOptions {
    region: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    endpoint?: string;
    internal?: boolean;
    secure?: boolean;
    authorizationV4?: boolean;
  }

  interface PutOptions {
    headers?: Record<string, string>;
  }

  interface PutResult {
    name: string;
    url: string;
    res: { status: number; headers: Record<string, string> };
  }

  interface GetResult {
    content: Buffer;
    res: { status: number; headers: Record<string, string> };
  }

  interface ListResult {
    objects?: Array<{ name: string; url: string }>;
    prefixes?: string[];
    isTruncated: boolean;
    nextMarker: string;
    res: { status: number; headers: Record<string, string> };
  }

  interface DeleteResult {
    res: { status: number; headers: Record<string, string> };
  }

  class OSS {
    constructor(options: OSSOptions);
    put(name: string, file: Buffer | string, options?: PutOptions): Promise<PutResult>;
    get(name: string): Promise<GetResult>;
    list(query?: { prefix?: string; marker?: string; 'max-keys'?: number }): Promise<ListResult>;
    delete(name: string): Promise<DeleteResult>;
    signatureUrlV4(
      method: string,
      expires: number,
      request: Record<string, unknown>,
      objectName: string,
      additionalHeaders?: Record<string, string>,
    ): Promise<string>;
  }

  export default OSS;
}
