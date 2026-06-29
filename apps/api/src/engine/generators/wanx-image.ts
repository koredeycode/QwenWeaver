import { createModuleLogger } from '../../logger.js';

const log = createModuleLogger('engine/generators/wanx-image');

export async function generateWanxImage(
  prompt: string,
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
  let submitUrl = `${baseUrl}/api/v1/services/aigc/multimodal-generation/generation`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (process.env.DASHSCOPE_WORKSPACE_ID) {
    headers['X-DashScope-WorkSpace'] = process.env.DASHSCOPE_WORKSPACE_ID;
  }

  const body = {
    model: 'wan2.7-image-pro',
    input: {
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }],
        },
      ],
    },
    parameters: {
      size: '1024*1024',
      n: 1,
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
      log.info('Network error on domestic endpoint, retrying on international endpoint...');
      submitUrl =
        'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
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
      log.info('Key rejected on domestic endpoint, retrying on international endpoint...');
      submitUrl =
        'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
      response = await fetch(submitUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      });
      if (!response.ok) {
        throw new Error(`Failed to submit Wan2.7 Image task: ${await response.text()}`);
      }
    } else {
      throw new Error(`Failed to submit Wan2.7 Image task: ${errorText}`);
    }
  }

  const data = (await response.json()) as any;
  const imageUrl = data.output?.choices?.[0]?.message?.content?.[0]?.image;

  if (!imageUrl) {
    throw new Error(`Wan2.7 Image task did not return an image url: ${JSON.stringify(data)}`);
  }

  const imageRes = await fetch(imageUrl, { signal });
  if (!imageRes.ok) {
    throw new Error(`Failed to download Wan2.7 image from ${imageUrl}`);
  }
  return Buffer.from(await imageRes.arrayBuffer());
}
