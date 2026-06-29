import { getStorage } from '../storage/index.js';

function sanitizeNodeId(nodeId: string): string {
  return nodeId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function sanitizeExtension(ext: string): string {
  return ext.replace(/[^a-zA-Z0-9]/g, '');
}

export async function writeBinaryAsset(
  executionId: string,
  nodeId: string,
  extension: string,
  dataBuffer: Buffer,
): Promise<string> {
  const safeNodeId = sanitizeNodeId(nodeId);
  const safeExt = sanitizeExtension(extension);
  const key = `${executionId}/${safeNodeId}_output.${safeExt}`;
  const contentType = contentTypeForExt(safeExt);
  return getStorage().write(key, dataBuffer, contentType);
}

function contentTypeForExt(ext: string): string {
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    mp4: 'video/mp4',
    webm: 'video/webm',
    txt: 'text/plain',
    md: 'text/markdown',
    html: 'text/html',
    json: 'application/json',
    csv: 'text/csv',
    xml: 'application/xml',
    yaml: 'text/yaml',
    yml: 'text/yaml',
  };
  return map[ext] || 'application/octet-stream';
}

export async function pollWithBackoff(
  pollUrl: string,
  headers: Record<string, string>,
  opts: {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    statusExtractor: (data: any) => string | undefined;
    resultExtractor: (data: any) => string | undefined;
    taskName: string;
    signal?: AbortSignal;
  },
): Promise<Buffer> {
  let delay = opts.initialDelayMs;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    if (opts.signal?.aborted) {
      throw new Error(`${opts.taskName} aborted by signal`);
    }

    const pollResponse = await fetch(pollUrl, { headers, signal: opts.signal });
    if (!pollResponse.ok) {
      throw new Error(`Failed to poll ${opts.taskName} status: ${await pollResponse.text()}`);
    }
    const pollData = await pollResponse.json();
    const status = opts.statusExtractor(pollData);

    if (status === 'SUCCEEDED') {
      const resultUrl = opts.resultExtractor(pollData);
      if (!resultUrl) {
        throw new Error(
          `${opts.taskName} succeeded but returned no result URL: ${JSON.stringify(pollData)}`,
        );
      }
      const resultResponse = await fetch(resultUrl, { signal: opts.signal });
      if (!resultResponse.ok) {
        throw new Error(`Failed to download ${opts.taskName} result from ${resultUrl}`);
      }
      return Buffer.from(await resultResponse.arrayBuffer());
    } else if (status === 'FAILED' || status === 'CANCELED') {
      throw new Error(`${opts.taskName} failed or was canceled: ${JSON.stringify(pollData)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 2, opts.maxDelayMs);
  }
  throw new Error(`${opts.taskName} timed out after ${opts.maxAttempts} attempts`);
}
