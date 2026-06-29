import { createModuleLogger } from '../../logger.js';

const log = createModuleLogger('engine/generators/cosyvoice');

export async function generateCosyVoiceAudio(text: string, apiKey: string): Promise<Buffer> {
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

  let ttsUrl = isIntl
    ? `${baseUrl}/api/v1/services/aigc/multimodal-generation/generation`
    : `${baseUrl}/api/v1/services/audio/tts/cosyvoice-synthesis`;

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const body = isIntl
    ? {
        model: 'qwen3-tts-flash',
        input: { text, voice: 'Cherry' },
      }
    : {
        model: 'cosyvoice-v3-plus',
        input: { text },
        parameters: {
          voice: 'longxiaochun',
          format: 'mp3',
        },
      };

  let response: Response;
  try {
    response = await fetch(ttsUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (baseUrl === 'https://dashscope.aliyuncs.com') {
      log.info('Network error on domestic endpoint, retrying CosyVoice on intl endpoint...');
      baseUrl = 'https://dashscope-intl.aliyuncs.com';
      ttsUrl = `${baseUrl}/api/v1/services/aigc/multimodal-generation/generation`;
      response = await fetch(ttsUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'qwen3-tts-flash',
          input: { text, voice: 'Cherry' },
        }),
      });
    } else {
      throw err;
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    if (errorText.includes('InvalidApiKey') && baseUrl === 'https://dashscope.aliyuncs.com') {
      log.info('Key rejected on domestic endpoint, retrying CosyVoice on intl endpoint...');
      baseUrl = 'https://dashscope-intl.aliyuncs.com';
      ttsUrl = `${baseUrl}/api/v1/services/aigc/multimodal-generation/generation`;
      response = await fetch(ttsUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'qwen3-tts-flash',
          input: { text, voice: 'Cherry' },
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to call TTS: ${await response.text()}`);
      }
    } else {
      throw new Error(`Failed to call TTS: ${errorText}`);
    }
  }

  if (baseUrl === 'https://dashscope-intl.aliyuncs.com') {
    const data = (await response.json()) as any;
    const resultUrl = data.output?.audio?.url;
    if (!resultUrl) throw new Error(`Qwen-TTS returned no audio URL: ${JSON.stringify(data)}`);
    const audioRes = await fetch(resultUrl);
    if (!audioRes.ok) throw new Error(`Failed to download Qwen-TTS result from ${resultUrl}`);
    return Buffer.from(await audioRes.arrayBuffer());
  }

  return Buffer.from(await response.arrayBuffer());
}
