import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export async function writeBinaryAsset(
  executionId: string,
  nodeId: string,
  extension: string,
  dataBuffer: Buffer,
): Promise<string> {
  const relativeDir = path.join('public', 'storage', 'runs', executionId);
  const absoluteDir = path.resolve(relativeDir);

  await fs.mkdir(absoluteDir, { recursive: true });

  const filename = `${nodeId}_output.${extension}`;
  const absolutePath = path.join(absoluteDir, filename);
  await fs.writeFile(absolutePath, dataBuffer);

  return `/public/storage/runs/${executionId}/${filename}`;
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
