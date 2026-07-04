import { createModuleLogger } from '../../logger.js';
import { pollWithBackoff } from '../file-asset.js';

const log = createModuleLogger('engine/generators/happyhorse-i2v');

export async function generateHappyhorseImageToVideo(
  prompt: string,
  imageUrl: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<Buffer> {
  let baseUrl = apiKey.startsWith('sk-ws-')
    ? 'https://dashscope-intl.aliyuncs.com'
    : 'https://dashscope.aliyuncs.com';

  if (process.env.DASHSCOPE_BASE_URL) {
    try {
      baseUrl = new URL(process.env.DASHSCOPE_BASE_URL).origin;
    } catch {
      // ignore
    }
  }

  const isIntl = baseUrl === 'https://dashscope-intl.aliyuncs.com';

  let submitUrl = isIntl
    ? `${baseUrl}/api/v1/services/aigc/video-generation/video-synthesis`
    : `${baseUrl}/api/v1/services/aigc/text2video/video-synthesis`;

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'X-DashScope-Async': 'enable',
  };

  const body = isIntl
    ? {
        model: 'happyhorse-1.1-i2v',
        input: {
          prompt,
          media: [
            {
              type: 'first_frame',
              url: imageUrl,
            },
          ],
        },
        parameters: {
          resolution: '720P',
          prompt_extend: true,
          duration: 5,
        },
      }
    : {
        model: 'happyhorse-1.1-i2v',
        input: {
          prompt,
          media: [
            {
              type: 'first_frame',
              url: imageUrl,
            },
          ],
        },
        parameters: {
          size: '1280*720',
          duration: 5,
        },
      };

  let response: Response;
  try {
    response = await fetch(submitUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (baseUrl === 'https://dashscope.aliyuncs.com') {
      log.info('Network error on domestic endpoint, retrying HappyI2V on intl endpoint...');
      baseUrl = 'https://dashscope-intl.aliyuncs.com';
      submitUrl = `${baseUrl}/api/v1/services/aigc/video-generation/video-synthesis`;
      response = await fetch(submitUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      });
    } else {
      throw err;
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    if (errorText.includes('InvalidApiKey') && baseUrl === 'https://dashscope.aliyuncs.com') {
      log.info('Key rejected on domestic endpoint, retrying HappyI2V on intl endpoint...');
      baseUrl = 'https://dashscope-intl.aliyuncs.com';
      submitUrl = `${baseUrl}/api/v1/services/aigc/video-generation/video-synthesis`;
      response = await fetch(submitUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      });
      if (!response.ok) {
        throw new Error(`Failed to submit HappyI2V task: ${await response.text()}`);
      }
    } else {
      throw new Error(`Failed to submit HappyI2V task: ${errorText}`);
    }
  }

  const submitData = (await response.json()) as { output?: { task_id?: string } };
  const taskId = submitData.output?.task_id;
  if (!taskId) {
    throw new Error(
      `HappyI2V task submission did not return a task_id: ${JSON.stringify(submitData)}`,
    );
  }

  return pollWithBackoff(
    `${baseUrl}/api/v1/tasks/${taskId}`,
    { Authorization: `Bearer ${apiKey}` },
    {
      maxAttempts: 20,
      initialDelayMs: 2000,
      maxDelayMs: 16000,
      statusExtractor: (data: any) => data.output?.task_status,
      resultExtractor: (data: any) => data.output?.video_url,
      taskName: 'HappyI2V generation',
      signal,
    },
  );
}
