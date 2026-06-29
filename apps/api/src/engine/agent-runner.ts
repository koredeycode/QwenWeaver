import { getQueryProvider } from '@qwenweaver/database';
import type { NodePayload } from '@qwenweaver/types';
import { jsonSchema, streamText, tool, type Tool } from 'ai';
import { z } from 'zod';
import { createModuleLogger } from '../logger.js';
import { agent_duration_ms, llm_tokens_total } from '../metrics.js';
import { buildHeadersFromAuthConfig, callMCPTool, discoverMCPTools } from './mcp-bridge.js';
import { getModelForNode, getModelIdForNode } from './model-router.js';
import type { AgentResult, StreamEmitter, UpstreamOutputs } from './types.js';
import { EXTENSION_MAP, CONTENT_TYPE_MAP } from './constants.js';
import { writeBinaryAsset } from './file-asset.js';
import { buildSystemPrompt, buildUserMessage } from './prompt-builder.js';
import { resolveCredentialAuth } from './credential-resolver.js';
import { generateWanxImage } from './generators/wanx-image.js';
import { generateWanxVideo } from './generators/wanx-video.js';
import { generateCosyVoiceAudio } from './generators/cosyvoice.js';

const log = createModuleLogger('engine/agent-runner');

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
        outputs: [{ type: 'image', contentType: 'image/png', value: fileUrl }],
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
        outputs: [{ type: 'audio', contentType: 'audio/mpeg', value: fileUrl }],
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
        outputs: [{ type: 'video', contentType: 'video/mp4', value: fileUrl }],
        text: `[Video Generated] ${fileUrl}`,
        tokensUsed: 0,
        durationMs,
        status: 'completed',
      };
    }

    const { model, enableThinking, thinkingBudget } = getModelForNode(node);
    const systemPrompt = buildSystemPrompt(node);
    const userMessage = buildUserMessage(node, upstreamOutputs);

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
              await emitter.emit('thinking', { nodeId: node.id, chunk: textChunk });
            }
          }
        } else if (part.type === 'text-delta') {
          const textChunk = (part as any).textDelta || (part as any).text || '';
          if (textChunk) {
            fullText += textChunk;
            if (emitter && !emitter.isClosed()) {
              await emitter.emit('token', { nodeId: node.id, chunk: textChunk });
            }
          }
        }
      }
    } else {
      for await (const chunk of result.textStream) {
        fullText += chunk;
        if (emitter && !emitter.isClosed()) {
          await emitter.emit('token', { nodeId: node.id, chunk });
        }
      }
    }

    const finalResult = await result;
    const usage = await finalResult.usage;
    tokensUsed = usage?.totalTokens ?? 0;
    const toolCalls = finalResult.toolCalls ? await finalResult.toolCalls : undefined;
    const toolResults = finalResult.toolResults ? await finalResult.toolResults : undefined;

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
      outputs: [{ type: 'text', contentType, value: fileUrl }],
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
