import { z } from 'zod';
import { streamText, jsonSchema, tool, type Tool } from 'ai';
import type { NodePayload } from '@qwenweaver/types';
import type { AgentResult, UpstreamOutputs, StreamEmitter } from './types.js';
import { getModelForNode, getModelIdForNode } from './model-router.js';
import { discoverMCPTools, callMCPTool } from './mcp-bridge.js';
import { createModuleLogger } from '../logger.js';
import { llm_tokens_total, agent_duration_ms } from '../metrics.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const log = createModuleLogger('engine/agent-runner');

export async function runAgent(
  node: NodePayload,
  upstreamOutputs: UpstreamOutputs,
  emitter?: StreamEmitter,
  executionId?: string,
): Promise<AgentResult> {
  const startTime = performance.now();

  if (node.type === 'trigger' || node.type === 'logic') {
    return createPassthroughResult(node, startTime);
  }

  // Set up dynamic abort controller linked to SSE connection and a 120s timeout
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort('Agent execution timed out (120s)'), 120000);
  
  let pollInterval: ReturnType<typeof setInterval> | undefined;
  if (emitter) {
    pollInterval = setInterval(() => {
      if (emitter.isClosed()) {
        abortController.abort('Client disconnected');
      }
    }, 1000);
  }

  try {
    const apiKey = process.env.DASHSCOPE_API_KEY;

    // Handle Image Generation (Wanx)
    if (node.data.outputFormat === 'image') {
      const prompt = node.data.label ?? 'Generates an image';
      let buffer: Buffer;
      
      if (apiKey) {
        log.info({ nodeId: node.id, prompt }, 'Calling Wanx image generation API');
        buffer = await generateWanxImage(prompt, apiKey);
      } else {
        log.info({ nodeId: node.id }, 'No DASHSCOPE_API_KEY set, generating placeholder mock image');
        buffer = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          'base64'
        );
      }

      const runId = executionId ?? 'local-run';
      const fileUrl = writeBinaryAsset(runId, node.id, 'png', buffer);
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
      const prompt = node.data.label ?? 'Generates audio';
      let buffer: Buffer;

      if (apiKey) {
        log.info({ nodeId: node.id, prompt }, 'Calling CosyVoice speech synthesis API');
        buffer = await generateCosyVoiceAudio(prompt, apiKey);
      } else {
        log.info({ nodeId: node.id }, 'No DASHSCOPE_API_KEY set, generating placeholder mock audio');
        buffer = Buffer.from(
          '//MkxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABXhpbmcAAAADAAAAAQAAAAAAAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ohs=',
          'base64'
        );
      }

      const runId = executionId ?? 'local-run';
      const fileUrl = writeBinaryAsset(runId, node.id, 'mp3', buffer);
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
      const prompt = node.data.label ?? 'Generates a video';
      let buffer: Buffer;

      if (apiKey) {
        log.info({ nodeId: node.id, prompt }, 'Calling Wanx video generation API');
        buffer = await generateWanxVideo(prompt, apiKey);
      } else {
        log.info({ nodeId: node.id }, 'No DASHSCOPE_API_KEY set, generating placeholder mock video');
        buffer = Buffer.from(
          'AAAAGGZ0eXBtcDQyAAAAAG1wNDJpc29tAAAAKHV1aWRkZWYoY29tcGxldGVfZmlsZV9tZXRhZGF0YSkAAAAIZnJlZQAAAAttZGF0AAAAAG1vb3YAAABs',
          'base64'
        );
      }

      const runId = executionId ?? 'local-run';
      const fileUrl = writeBinaryAsset(runId, node.id, 'mp4', buffer);
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
    const mcpToolNames = await discoverMCPToolNames(node);

    const tools: Record<string, Tool<z.ZodTypeAny, unknown>> = {};
    if (node.type === 'mcp_tool' && node.data.mcpServerUrl) {
      try {
        const mcpTools = await discoverMCPTools(node);
        for (const t of mcpTools) {
          tools[t.name] = tool({
            description: t.description,
            parameters: jsonSchema(t.inputSchema),
            execute: async (args: any) => {
              log.info({ nodeId: node.id, toolName: t.name, args }, 'Executing MCP tool call');
              const typedArgs = args as Record<string, unknown>;
              return await callMCPTool(node.data.mcpServerUrl!, t.name, typedArgs);
            }
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
      { nodeId: node.id, nodeType: node.type, enableThinking, mcpToolCount: mcpToolNames.length },
      'Starting agent execution',
    );

    const result = streamText({
      model,
      system: systemPrompt,
      prompt: userMessage,
      tools: Object.keys(tools).length > 0 ? tools : undefined,
      maxSteps: 5,
      providerOptions,
      abortSignal: abortController.signal,
    } as unknown as Parameters<typeof streamText>[0]);

    let fullText = '';
    let tokensUsed = 0;

    for await (const chunk of result.textStream) {
      fullText += chunk;

      if (emitter && !emitter.isClosed()) {
        await emitter.emit('token', {
          nodeId: node.id,
          chunk,
        });
      }
    }

    const finalResult = await result;
    const usage = await finalResult.usage;
    tokensUsed = usage?.totalTokens ?? 0;
    const toolCalls = finalResult.toolCalls ? await finalResult.toolCalls : undefined;
    const toolResults = finalResult.toolResults ? await finalResult.toolResults : undefined;

    const durationMs = Math.round(performance.now() - startTime);

    const modelIdString = getModelIdForNode(node);
    llm_tokens_total.labels(modelIdString, node.type).inc(tokensUsed);
    agent_duration_ms.labels(node.type).observe(durationMs);

    log.info(
      { nodeId: node.id, tokensUsed, durationMs, toolCallsCount: (toolCalls as unknown[])?.length },
      'Agent execution completed',
    );

    const contentTypeMap: Record<string, string> = {
      markdown: 'text/markdown',
      html: 'text/html',
      json: 'application/json',
      csv: 'text/csv',
      xml: 'application/xml',
      yaml: 'text/yaml',
      text: 'text/plain',
      code: 'text/plain',
    };
    const format = node.data.outputFormat ?? 'markdown';
    const contentType = contentTypeMap[format] ?? 'text/markdown';

    return {
      nodeId: node.id,
      outputs: [
        {
          type: 'text',
          contentType,
          value: fullText,
        },
      ],
      text: fullText,
      reasoning: undefined,
      toolCalls: toolCalls as unknown[],
      toolResults: toolResults as unknown[],
      tokensUsed,
      durationMs,
      status: 'completed',
    };
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);
    const errorMessage = (error as Error).message;

    log.error(
      { nodeId: node.id, error: errorMessage, durationMs },
      'Agent execution failed',
    );

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

function createPassthroughResult(node: NodePayload, startTime: number): AgentResult {
  const durationMs = Math.round(performance.now() - startTime);
  const text = node.data.label ?? `[${node.type}] pass-through`;
  return {
    nodeId: node.id,
    outputs: [
      {
        type: 'text',
        contentType: 'text/plain',
        value: text,
      },
    ],
    text,
    tokensUsed: 0,
    durationMs,
    status: 'completed',
  };
}

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

async function discoverMCPToolNames(node: NodePayload): Promise<string[]> {
  if (node.type !== 'mcp_tool' || !node.data.mcpServerUrl) {
    return [];
  }

  try {
    const mcpTools = await discoverMCPTools(node);
    return mcpTools.map((t) => t.name);
  } catch (error) {
    log.warn(
      { nodeId: node.id, error: (error as Error).message },
      'Failed to discover MCP tools, proceeding without',
    );
    return [];
  }
}

// ─── Multimodal Helper Functions ───────────────────────────────────────────────

function writeBinaryAsset(
  executionId: string,
  nodeId: string,
  extension: string,
  dataBuffer: Buffer
): string {
  const relativeDir = path.join('public', 'storage', 'runs', executionId);
  const absoluteDir = path.resolve(relativeDir);
  
  if (!fs.existsSync(absoluteDir)) {
    fs.mkdirSync(absoluteDir, { recursive: true });
  }
  
  const filename = `${nodeId}_output.${extension}`;
  const absolutePath = path.join(absoluteDir, filename);
  fs.writeFileSync(absolutePath, dataBuffer);
  
  return `/public/storage/runs/${executionId}/${filename}`;
}

async function generateWanxImage(prompt: string, apiKey: string): Promise<Buffer> {
  const submitUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis';
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'X-DashScope-Async': 'enable',
  };
  const body = {
    model: 'wanx-v1',
    input: { prompt },
    parameters: {
      style: '<auto>',
      size: '1024*1024',
      n: 1,
    },
  };

  const response = await fetch(submitUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit Wanx task: ${await response.text()}`);
  }

  const submitData = (await response.json()) as { output?: { task_id?: string } };
  const taskId = submitData.output?.task_id;
  if (!taskId) {
    throw new Error(`Wanx task submission did not return a task_id: ${JSON.stringify(submitData)}`);
  }

  const pollUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;
  const pollHeaders = { 'Authorization': `Bearer ${apiKey}` };
  
  let attempts = 0;
  while (attempts < 30) {
    const pollResponse = await fetch(pollUrl, { headers: pollHeaders });
    if (!pollResponse.ok) {
      throw new Error(`Failed to poll Wanx task status: ${await pollResponse.text()}`);
    }
    const pollData = (await pollResponse.json()) as {
      output?: { task_status?: string; results?: Array<{ url?: string }> };
    };
    const status = pollData.output?.task_status;

    if (status === 'SUCCEEDED') {
      const imgUrl = pollData.output?.results?.[0]?.url;
      if (!imgUrl) {
        throw new Error(`Wanx succeeded but returned no image URL: ${JSON.stringify(pollData)}`);
      }
      const imgResponse = await fetch(imgUrl);
      if (!imgResponse.ok) {
        throw new Error(`Failed to download generated image from ${imgUrl}`);
      }
      return Buffer.from(await imgResponse.arrayBuffer());
    } else if (status === 'FAILED' || status === 'CANCELED') {
      throw new Error(`Wanx task failed or was canceled: ${JSON.stringify(pollData)}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1500));
    attempts++;
  }
  throw new Error('Wanx image generation timed out');
}

async function generateCosyVoiceAudio(text: string, apiKey: string): Promise<Buffer> {
  const ttsUrl = 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/cosyvoice-synthesis';
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  const body = {
    model: 'cosyvoice-v1',
    input: { text },
    parameters: {
      voice: 'longxiaochun',
      format: 'mp3',
    },
  };

  const response = await fetch(ttsUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to call CosyVoice: ${await response.text()}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function generateWanxVideo(prompt: string, apiKey: string): Promise<Buffer> {
  const submitUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2video/video-synthesis';
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'X-DashScope-Async': 'enable',
  };
  const body = {
    model: 'wanx-video-t2v-v1',
    input: { prompt },
    parameters: {
      size: '1280*720',
    },
  };

  const response = await fetch(submitUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit Wanx Video task: ${await response.text()}`);
  }

  const submitData = (await response.json()) as { output?: { task_id?: string } };
  const taskId = submitData.output?.task_id;
  if (!taskId) {
    throw new Error(`Wanx Video task submission did not return a task_id: ${JSON.stringify(submitData)}`);
  }

  const pollUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;
  const pollHeaders = { 'Authorization': `Bearer ${apiKey}` };
  
  let attempts = 0;
  while (attempts < 30) {
    const pollResponse = await fetch(pollUrl, { headers: pollHeaders });
    if (!pollResponse.ok) {
      throw new Error(`Failed to poll Wanx Video task status: ${await pollResponse.text()}`);
    }
    const pollData = (await pollResponse.json()) as {
      output?: { task_status?: string; video_url?: string };
    };
    const status = pollData.output?.task_status;

    if (status === 'SUCCEEDED') {
      const videoUrl = pollData.output?.video_url;
      if (!videoUrl) {
        throw new Error(`Wanx Video succeeded but returned no video URL: ${JSON.stringify(pollData)}`);
      }
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        throw new Error(`Failed to download generated video from ${videoUrl}`);
      }
      return Buffer.from(await videoResponse.arrayBuffer());
    } else if (status === 'FAILED' || status === 'CANCELED') {
      throw new Error(`Wanx Video task failed or was canceled: ${JSON.stringify(pollData)}`);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }
  throw new Error('Wanx video generation timed out');
}
