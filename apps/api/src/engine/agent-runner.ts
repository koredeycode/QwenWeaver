import { getQueryProvider } from '@qwenweaver/database';
import type { MCPAuthConfig, NodePayload } from '@qwenweaver/types';
import { jsonSchema, streamText, tool, type Tool } from 'ai';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import { createModuleLogger } from '../logger.js';
import { agent_duration_ms, llm_tokens_total } from '../metrics.js';
import { buildHeadersFromAuthConfig, callMCPTool, discoverMCPTools } from './mcp-bridge.js';
import { getModelForNode, getModelIdForNode } from './model-router.js';
import type { AgentResult, StreamEmitter, UpstreamOutputs } from './types.js';

const log = createModuleLogger('engine/agent-runner');

const EXTENSION_MAP: Record<string, string> = {
  markdown: 'md',
  html: 'html',
  json: 'json',
  csv: 'csv',
  xml: 'xml',
  yaml: 'yaml',
  text: 'txt',
  code: 'txt',
  image: 'png',
  audio: 'mp3',
  video: 'mp4',
};

const CONTENT_TYPE_MAP: Record<string, string> = {
  markdown: 'text/markdown',
  html: 'text/html',
  json: 'application/json',
  csv: 'text/csv',
  xml: 'application/xml',
  yaml: 'text/yaml',
  text: 'text/plain',
  code: 'text/plain',
};

export async function runAgent(
  node: NodePayload,
  upstreamOutputs: UpstreamOutputs,
  emitter?: StreamEmitter,
  executionId?: string,
  userId?: string,
): Promise<AgentResult> {
  const startTime = performance.now();

  if (node.type === 'trigger' || node.type === 'input_trigger' || node.type === 'logic') {
    const text = node.data.label ?? `[${node.type}] pass-through`;
    const format = node.data.outputFormat ?? 'text';
    const ext = EXTENSION_MAP[format] ?? 'txt';
    const contentType = CONTENT_TYPE_MAP[format] ?? 'text/plain';
    const buffer = Buffer.from(text, 'utf-8');
    const runId = executionId ?? 'local-run';
    const fileUrl = await writeBinaryAsset(runId, node.id, ext, buffer);
    const durationMs = Math.round(performance.now() - startTime);
    return {
      nodeId: node.id,
      outputs: [{ type: 'text', contentType, value: fileUrl }],
      text,
      tokensUsed: 0,
      durationMs,
      status: 'completed',
    };
  }

  // Set up dynamic abort controller linked to SSE connection and a 120s timeout
  const abortController = new AbortController();
  const timeoutId = setTimeout(
    () => abortController.abort('Agent execution timed out (120s)'),
    120000,
  );

  let pollInterval: ReturnType<typeof setInterval> | undefined;
  if (emitter) {
    pollInterval = setInterval(() => {
      if (emitter.isClosed()) {
        abortController.abort('Client disconnected');
      }
    }, 1000);
  }

  try {
    // Resolve DashScope API key: check user credential first, then env var
    let apiKey = process.env.DASHSCOPE_API_KEY;
    if (userId && !apiKey) {
      try {
        const provider = getQueryProvider();
        const creds = await provider.listCredentials(userId);
        const dashscopeCred = creds.find((c) => c.type === 'dashscope_api_key');
        if (dashscopeCred) {
          const full = await provider.getCredential(dashscopeCred.id, userId);
          if (full?.value) {
            apiKey = full.value;
          }
        }
      } catch (err) {
        log.warn({ error: (err as Error).message }, 'Failed to resolve DashScope credential');
      }
    }

    // Resolve MCP auth headers if credentialId is set
    let mcpAuthHeaders: Record<string, string> | undefined;
    if (node.data.mcpAuthConfig?.credentialId && userId) {
      try {
        const provider = getQueryProvider();
        const resolved = await resolveCredentialAuth(node.data.mcpAuthConfig, userId, provider);
        mcpAuthHeaders = buildHeadersFromAuthConfig(resolved);
      } catch (err) {
        log.warn(
          { nodeId: node.id, error: (err as Error).message },
          'Failed to resolve MCP credential, proceeding with inline auth',
        );
      }
    }

    // Handle Image Generation (Wanx)
    if (node.data.outputFormat === 'image') {
      const prompt = node.data.systemPrompt || node.data.label || 'Generates an image';
      let buffer: Buffer;

      if (apiKey) {
        log.info({ nodeId: node.id, prompt }, 'Calling Wanx image generation API');
        buffer = await generateWanxImage(prompt, apiKey, abortController.signal);
      } else {
        log.info(
          { nodeId: node.id },
          'No DASHSCOPE_API_KEY set, generating placeholder mock image',
        );
        buffer = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          'base64',
        );
      }

      const runId = executionId ?? 'local-run';
      const fileUrl = await writeBinaryAsset(runId, node.id, 'png', buffer);
      const durationMs = Math.round(performance.now() - startTime);

      return {
        nodeId: node.id,
        outputs: [
          {
            type: 'image',
            contentType: 'image/png',
            value: fileUrl,
          },
        ],
        text: `[Image Generated] ${fileUrl}`,
        tokensUsed: 0,
        durationMs,
        status: 'completed',
      };
    }

    // Handle Audio Generation (CosyVoice)
    if (node.data.outputFormat === 'audio') {
      const prompt = node.data.systemPrompt || node.data.label || 'Generates audio';
      let buffer: Buffer;

      if (apiKey) {
        log.info({ nodeId: node.id, prompt }, 'Calling CosyVoice speech synthesis API');
        buffer = await generateCosyVoiceAudio(prompt, apiKey);
      } else {
        log.info(
          { nodeId: node.id },
          'No DASHSCOPE_API_KEY set, generating placeholder mock audio',
        );
        buffer = Buffer.from(
          '//MkxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABXhpbmcAAAADAAAAAQAAAAAAAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ohs=',
          'base64',
        );
      }

      const runId = executionId ?? 'local-run';
      const fileUrl = await writeBinaryAsset(runId, node.id, 'mp3', buffer);
      const durationMs = Math.round(performance.now() - startTime);

      return {
        nodeId: node.id,
        outputs: [
          {
            type: 'audio',
            contentType: 'audio/mpeg',
            value: fileUrl,
          },
        ],
        text: `[Audio Generated] ${fileUrl}`,
        tokensUsed: 0,
        durationMs,
        status: 'completed',
      };
    }

    // Handle Video Generation (Wanx Video)
    if (node.data.outputFormat === 'video') {
      const prompt = node.data.systemPrompt || node.data.label || 'Generates a video';
      let buffer: Buffer;

      if (apiKey) {
        log.info({ nodeId: node.id, prompt }, 'Calling Wanx video generation API');
        buffer = await generateWanxVideo(prompt, apiKey, abortController.signal);
      } else {
        log.info(
          { nodeId: node.id },
          'No DASHSCOPE_API_KEY set, generating placeholder mock video',
        );
        buffer = Buffer.from(
          'AAAAGGZ0eXBtcDQyAAAAAG1wNDJpc29tAAAAKHV1aWRkZWYoY29tcGxldGVfZmlsZV9tZXRhZGF0YSkAAAAIZnJlZQAAAAttZGF0AAAAAG1vb3YAAABs',
          'base64',
        );
      }

      const runId = executionId ?? 'local-run';
      const fileUrl = await writeBinaryAsset(runId, node.id, 'mp4', buffer);
      const durationMs = Math.round(performance.now() - startTime);

      return {
        nodeId: node.id,
        outputs: [
          {
            type: 'video',
            contentType: 'video/mp4',
            value: fileUrl,
          },
        ],
        text: `[Video Generated] ${fileUrl}`,
        tokensUsed: 0,
        durationMs,
        status: 'completed',
      };
    }

    const { model, enableThinking, thinkingBudget } = getModelForNode(node);
    const systemPrompt = buildSystemPrompt(node);
    const userMessage = buildUserMessage(node, upstreamOutputs);

    // Single MCP tool discovery call — used for both logging and tool binding
    const tools: Record<string, Tool<z.ZodTypeAny, unknown>> = {};
    let mcpToolCount = 0;

    if (node.type === 'mcp_tool' && node.data.mcpServerUrl) {
      try {
        const mcpTools = await discoverMCPTools(node, mcpAuthHeaders);
        mcpToolCount = mcpTools.length;
        for (const t of mcpTools) {
          tools[t.name] = tool({
            description: t.description,
            parameters: jsonSchema(t.inputSchema),
            execute: async (args: any) => {
              log.info({ nodeId: node.id, toolName: t.name, args }, 'Executing MCP tool call');
              const typedArgs = args as Record<string, unknown>;
              return await callMCPTool(node.data.mcpServerUrl!, t.name, typedArgs, mcpAuthHeaders);
            },
          } as any);
        }
      } catch (err) {
        log.warn({ nodeId: node.id, error: (err as Error).message }, 'Failed to load MCP tools');
      }
    }

    const providerOptions = enableThinking
      ? {
          alibaba: {
            enableThinking: true,
            thinkingBudget: thinkingBudget ?? 4096,
          },
        }
      : undefined;

    log.info(
      { nodeId: node.id, nodeType: node.type, enableThinking, mcpToolCount },
      'Starting agent execution',
    );

    // Explicit type annotation for streamText options.
    // The providerOptions.alibaba shape is provider-specific and not in the base type,
    // so we use a scoped type assertion on just the provider options field.
    const streamOptions = {
      model,
      system: systemPrompt,
      prompt: userMessage,
      tools: Object.keys(tools).length > 0 ? tools : undefined,
      maxSteps: 5,
      providerOptions: providerOptions as Record<string, Record<string, any>> | undefined,
      abortSignal: abortController.signal,
    };

    const result = streamText(streamOptions);

    let fullText = '';
    let tokensUsed = 0;
    let reasoningText = '';

    if (enableThinking) {
      for await (const part of result.fullStream) {
        if (part.type === 'reasoning-delta') {
          const textChunk =
            (part as any).textDelta || (part as any).text || (part as any).reasoning || '';
          if (textChunk) {
            reasoningText += textChunk;
            if (emitter && !emitter.isClosed()) {
              await emitter.emit('thinking', {
                nodeId: node.id,
                chunk: textChunk,
              });
            }
          }
        } else if (part.type === 'text-delta') {
          const textChunk = (part as any).textDelta || (part as any).text || '';
          if (textChunk) {
            fullText += textChunk;
            if (emitter && !emitter.isClosed()) {
              await emitter.emit('token', {
                nodeId: node.id,
                chunk: textChunk,
              });
            }
          }
        }
      }
    } else {
      for await (const chunk of result.textStream) {
        fullText += chunk;
        if (emitter && !emitter.isClosed()) {
          await emitter.emit('token', {
            nodeId: node.id,
            chunk,
          });
        }
      }
    }

    const finalResult = await result;
    const usage = await finalResult.usage;
    tokensUsed = usage?.totalTokens ?? 0;
    const toolCalls = finalResult.toolCalls ? await finalResult.toolCalls : undefined;
    const toolResults = finalResult.toolResults ? await finalResult.toolResults : undefined;

    // Write final text output to file
    const format = node.data.outputFormat ?? 'markdown';
    const ext = EXTENSION_MAP[format] ?? 'txt';
    const contentType = CONTENT_TYPE_MAP[format] ?? 'text/markdown';
    const runId = executionId ?? 'local-run';
    const textBuffer = Buffer.from(fullText, 'utf-8');
    const fileUrl = await writeBinaryAsset(runId, node.id, ext, textBuffer);

    const durationMs = Math.round(performance.now() - startTime);

    const modelIdString = getModelIdForNode(node);
    llm_tokens_total.labels(modelIdString, node.type).inc(tokensUsed);
    agent_duration_ms.labels(node.type).observe(durationMs);

    log.info(
      { nodeId: node.id, tokensUsed, durationMs, toolCallsCount: (toolCalls as unknown[])?.length },
      'Agent execution completed',
    );

    return {
      nodeId: node.id,
      outputs: [
        {
          type: 'text',
          contentType,
          value: fileUrl,
        },
      ],
      text: fullText,
      reasoning: reasoningText || undefined,
      toolCalls: toolCalls as unknown[],
      toolResults: toolResults as unknown[],
      tokensUsed,
      durationMs,
      status: 'completed',
    };
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);
    const errorMessage = (error as Error).message;

    log.error({ nodeId: node.id, error: errorMessage, durationMs }, 'Agent execution failed');

    return {
      nodeId: node.id,
      outputs: [],
      text: '',
      tokensUsed: 0,
      durationMs,
      status: 'failed',
      error: errorMessage,
    };
  } finally {
    clearTimeout(timeoutId);
    if (pollInterval) clearInterval(pollInterval);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function buildSystemPrompt(node: NodePayload): string {
  let base = node.data.systemPrompt ?? '';
  if (!base && node.type !== 'supervisor') {
    base = `You are a helpful AI assistant working as part of a multi-agent workflow. Complete your assigned task accurately and concisely.`;
  }

  if (node.type === 'supervisor') {
    base = `${base}\n\nYou are a Supervisor agent. Analyze the outputs from subordinate agents carefully. Use your reasoning capabilities to evaluate arguments, detect contradictions, and produce an authoritative synthesis.`;
  }

  if (node.data.outputFormat) {
    const rules: Record<string, string> = {
      markdown: 'Provide your output formatted in Markdown.',
      html: 'Provide your output as raw, clean HTML tags.',
      json: 'Provide your output as a single, strictly valid raw JSON object. Do not include markdown code block backticks.',
      csv: 'Provide your output strictly formatted in CSV (comma-separated values) format.',
      xml: 'Provide your output as raw, clean XML tags.',
      yaml: 'Provide your output strictly formatted in valid YAML.',
      text: 'Provide your output as plain unformatted text. Do not use Markdown, HTML, or JSON structures.',
      code: 'Provide your output strictly as a clean code block or script without any surrounding conversational text.',
    };
    const formatRule = rules[node.data.outputFormat];
    if (formatRule) {
      base = `${base}\n\n[FORMATTING INSTRUCTION]: ${formatRule}`;
    }
  }

  return base;
}

function buildUserMessage(node: NodePayload, upstreamOutputs: UpstreamOutputs): string {
  if (upstreamOutputs.size === 0) {
    return node.data.label ?? 'Begin your task.';
  }

  const parts: string[] = [];

  for (const [sourceId, result] of upstreamOutputs) {
    let textContent = result.text;
    if (!textContent && result.outputs) {
      textContent = result.outputs.map((o) => o.value).join('\n\n');
    }
    parts.push(`## Output from upstream agent "${sourceId}":\n${textContent}`);
  }

  const taskContext = node.data.label ? `\n\n## Your task:\n${node.data.label}` : '';

  return parts.join('\n\n---\n\n') + taskContext;
}

// ─── Multimodal Helper Functions ───────────────────────────────────────────────

// Use async FS APIs to avoid blocking the event loop
async function writeBinaryAsset(
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

// Exponential backoff helper for polling DashScope async tasks
async function pollWithBackoff(
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

async function generateWanxImage(
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
    // If it fails due to network error (e.g. IPv6 timeout on dashscope.aliyuncs.com), fallback to intl
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

async function generateCosyVoiceAudio(text: string, apiKey: string): Promise<Buffer> {
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

async function resolveCredentialAuth(
  authConfig: NonNullable<NodePayload['data']['mcpAuthConfig']>,
  userId: string,
  provider: ReturnType<typeof getQueryProvider>,
): Promise<MCPAuthConfig> {
  if (!authConfig.credentialId) {
    return authConfig as MCPAuthConfig;
  }

  const credential = await provider.getCredential(authConfig.credentialId, userId);
  if (!credential?.value) {
    log.warn(
      { credentialId: authConfig.credentialId },
      'Credential not found for MCP auth, falling back to inline config',
    );
    return authConfig as MCPAuthConfig;
  }

  return {
    ...authConfig,
    apiKey: credential.value,
    token: credential.value,
    username: authConfig.username,
    password: authConfig.password,
  } as MCPAuthConfig;
}

async function generateWanxVideo(
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
        model: 'wan2.7-t2v',
        input: { prompt },
        parameters: {
          resolution: '720P',
          ratio: '16:9',
        },
      }
    : {
        model: 'wan2.7-t2v',
        input: { prompt },
        parameters: {
          size: '1280*720',
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
      log.info('Network error on domestic endpoint, retrying Wanx Video on intl endpoint...');
      baseUrl = 'https://dashscope-intl.aliyuncs.com';
      submitUrl = `${baseUrl}/api/v1/services/aigc/video-generation/video-synthesis`;
      response = await fetch(submitUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'wan2.7-t2v',
          input: { prompt },
          parameters: { resolution: '720P', ratio: '16:9' },
        }),
        signal,
      });
    } else {
      throw err;
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    if (errorText.includes('InvalidApiKey') && baseUrl === 'https://dashscope.aliyuncs.com') {
      log.info('Key rejected on domestic endpoint, retrying Wanx Video on intl endpoint...');
      baseUrl = 'https://dashscope-intl.aliyuncs.com';
      submitUrl = `${baseUrl}/api/v1/services/aigc/video-generation/video-synthesis`;
      response = await fetch(submitUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'wan2.7-t2v',
          input: { prompt },
          parameters: { resolution: '720P', ratio: '16:9' },
        }),
        signal,
      });
      if (!response.ok) {
        throw new Error(`Failed to submit Wanx Video task: ${await response.text()}`);
      }
    } else {
      throw new Error(`Failed to submit Wanx Video task: ${errorText}`);
    }
  }

  const submitData = (await response.json()) as { output?: { task_id?: string } };
  const taskId = submitData.output?.task_id;
  if (!taskId) {
    throw new Error(
      `Wanx Video task submission did not return a task_id: ${JSON.stringify(submitData)}`,
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
      taskName: 'Wanx video generation',
      signal,
    },
  );
}
