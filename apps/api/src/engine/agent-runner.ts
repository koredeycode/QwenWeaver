import { getQueryProvider } from '@qwenweaver/database';
import type { NodePayload, BusMessage } from '@qwenweaver/types';
import { jsonSchema, streamText, tool, type Tool } from 'ai';
import { z } from 'zod';
import { createModuleLogger } from '../logger.js';
import { createDiagnosticLogger, type CopilotDiag } from '../diagnostic-logger.js';
import { agent_duration_ms, llm_tokens_total } from '../metrics.js';
import { buildHeadersFromAuthConfig, callMCPTool, discoverMCPTools } from './mcp-bridge.js';
import { getModelForNode, getModelIdForNode } from './model-router.js';
import { createWorkspaceTools } from './workspace-tools.js';
import type { AgentResult, StreamEmitter } from './types.js';
import { EXTENSION_MAP, CONTENT_TYPE_MAP } from './constants.js';
import { writeBinaryAsset } from './file-asset.js';
import { buildSystemPrompt, buildUserMessageFromBus } from './prompt-builder.js';
import { resolveCredentialAuth } from './credential-resolver.js';
import { generateWanxImage } from './generators/wanx-image.js';
import { generateQwenImage } from './generators/qwen-image.js';
import { generateWanxVideo } from './generators/wanx-video.js';
import { generateHappyhorseVideo } from './generators/happyhorse-video.js';
import { generateHappyhorseImageToVideo } from './generators/happyhorse-i2v.js';
import { generateCosyVoiceAudio } from './generators/cosyvoice.js';

const log = createModuleLogger('engine/agent-runner');

export async function runAgent(
  node: NodePayload,
  busMessages: BusMessage[],
  emitter?: StreamEmitter,
  executionId?: string,
  userId?: string,
  conversationContext?: string,
  externalSignal?: AbortSignal,
  diag?: CopilotDiag,
): Promise<AgentResult> {
  const startTime = performance.now();
  const nodeLabel = node.data.label || node.id;

  diag?.log(`=== AGENT START: ${node.id} (${node.type}) "${nodeLabel}" ===`);

  if (
    node.type === 'trigger' ||
    node.type === 'input_trigger' ||
    node.type === 'file_trigger' ||
    node.type === 'logic'
  ) {
    if (node.type === 'file_trigger' && node.data.fileUrl) {
      const fileUrl = node.data.fileUrl;
      const durationMs = Math.round(performance.now() - startTime);
      diag?.log(`FILE TRIGGER node ${node.id} — fileUrl: ${fileUrl}`);
      return {
        nodeId: node.id,
        outputs: [{ type: 'image', contentType: 'image/png', value: fileUrl }],
        text: `[File Trigger] ${node.data.fileName || 'Image'}: ${fileUrl}`,
        tokensUsed: 0,
        durationMs,
        status: 'completed',
      };
    }
    const text = node.data.label || '';
    const format = node.data.outputFormat ?? 'text';
    const ext = EXTENSION_MAP[format] ?? 'txt';
    const contentType = CONTENT_TYPE_MAP[format] ?? 'text/plain';
    const buffer = Buffer.from(text, 'utf-8');
    const runId = executionId ?? 'local-run';
    const fileUrl = await writeBinaryAsset(runId, node.id, ext, buffer);
    const durationMs = Math.round(performance.now() - startTime);
    diag?.log(`PASS-THROUGH node ${node.id} (type=${node.type}) — text length: ${text.length}`);
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

  // Link external abort signal to internal controller
  if (externalSignal) {
    if (externalSignal.aborted) {
      abortController.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener(
        'abort',
        () => {
          abortController.abort(externalSignal.reason);
        },
        { once: true },
      );
    }
  }
  const nodeTimeoutMs = 600000;
  const timeoutId = setTimeout(
    () => abortController.abort(`Agent execution timed out (${nodeTimeoutMs / 1000}s)`),
    nodeTimeoutMs,
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
      diag?.log(`IMAGE GEN: node=${node.id}, prompt="${prompt.substring(0, 100)}"`);
      let buffer: Buffer;

      if (apiKey) {
        if (node.data.model === 'qwen-image-2.0-pro') {
          log.info({ nodeId: node.id, prompt }, 'Calling Qwen-Image generation API');
          buffer = await generateQwenImage(prompt, apiKey, abortController.signal);
        } else {
          log.info({ nodeId: node.id, prompt }, 'Calling Wanx image generation API');
          buffer = await generateWanxImage(prompt, apiKey, abortController.signal);
        }
      } else {
        throw new Error(`Node "${node.id}" has outputFormat "image" but no DASHSCOPE_API_KEY set`);
      }

      const runId = executionId ?? 'local-run';
      const fileUrl = await writeBinaryAsset(runId, node.id, 'png', buffer);
      const durationMs = Math.round(performance.now() - startTime);
      diag?.log(`IMAGE DONE: node=${node.id}, fileUrl=${fileUrl}, duration=${durationMs}ms`);

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
      // Use upstream bus messages as the text to narrate
      let ttsText = '';
      for (const msg of busMessages) {
        const textContent = extractBusPayloadText(msg);
        if (textContent) {
          ttsText += (ttsText ? '\n\n' : '') + textContent;
        }
      }
      if (!ttsText) {
        ttsText = node.data.label || 'Generates audio';
      }
      diag?.log(`AUDIO GEN: node=${node.id}, ttsTextLength=${ttsText.length}`);
      let buffer: Buffer;

      if (apiKey) {
        log.info(
          { nodeId: node.id, textLength: ttsText.length },
          'Calling CosyVoice speech synthesis API',
        );
        buffer = await generateCosyVoiceAudio(ttsText, apiKey);
      } else {
        throw new Error(`Node "${node.id}" has outputFormat "audio" but no DASHSCOPE_API_KEY set`);
      }

      const runId = executionId ?? 'local-run';
      const fileUrl = await writeBinaryAsset(runId, node.id, 'mp3', buffer);
      const durationMs = Math.round(performance.now() - startTime);
      diag?.log(`AUDIO DONE: node=${node.id}, fileUrl=${fileUrl}, duration=${durationMs}ms`);

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
      diag?.log(`VIDEO GEN: node=${node.id}, prompt="${prompt.substring(0, 100)}"`);
      let buffer: Buffer;

      if (apiKey) {
        if (node.data.model === 'happyhorse-1.1-t2v') {
          log.info({ nodeId: node.id, prompt }, 'Calling HappyVideo generation API');
          buffer = await generateHappyhorseVideo(prompt, apiKey, abortController.signal);
        } else if (node.data.model === 'happyhorse-1.1-i2v') {
          const imageUrl = node.data.imageUrl ?? extractImageFromBus(busMessages);
          if (!imageUrl) {
            throw new Error(
              'happyhorse-1.1-i2v requires an input image (set imageUrl in config or connect an image node upstream)',
            );
          }
          log.info({ nodeId: node.id, prompt, imageUrl }, 'Calling HappyI2V generation API');
          buffer = await generateHappyhorseImageToVideo(
            prompt,
            imageUrl,
            apiKey,
            abortController.signal,
          );
        } else {
          log.info({ nodeId: node.id, prompt }, 'Calling Wanx video generation API');
          buffer = await generateWanxVideo(prompt, apiKey, abortController.signal);
        }
      } else {
        throw new Error(`Node "${node.id}" has outputFormat "video" but no DASHSCOPE_API_KEY set`);
      }

      const runId = executionId ?? 'local-run';
      const fileUrl = await writeBinaryAsset(runId, node.id, 'mp4', buffer);
      const durationMs = Math.round(performance.now() - startTime);
      diag?.log(`VIDEO DONE: node=${node.id}, fileUrl=${fileUrl}, duration=${durationMs}ms`);

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
    const userMessage = buildUserMessageFromBus(
      node,
      busMessages,
      busMessages.filter((m) => m.messageType === 'conversation'),
      [],
      node.data._revisionFeedback,
    );
    const finalPrompt = conversationContext
      ? `${userMessage}\n\n---\n\n[CONVERSATION CONTEXT]:\n${conversationContext}`
      : userMessage;

    const tools: Record<string, Tool<z.ZodTypeAny, unknown>> = {};
    let mcpToolCount = 0;

    if (node.type === 'mcp_tool' && node.data.mcpServerUrl) {
      diag?.log(`MCP TOOL DISCOVERY: node=${node.id}, server=${node.data.mcpServerUrl}`);
      try {
        const mcpTools = await discoverMCPTools(node, mcpAuthHeaders);
        mcpToolCount = mcpTools.length;
        diag?.log(`MCP TOOLS DISCOVERED: ${mcpToolCount} tools for ${node.id}`);
        for (const t of mcpTools) {
          diag?.log(`  MCP tool: "${t.name}" — ${t.description?.substring(0, 80)}`);
          tools[t.name] = tool({
            description: t.description,
            parameters: jsonSchema(t.inputSchema),
            execute: async (args: any) => {
              log.info({ nodeId: node.id, toolName: t.name, args }, 'Executing MCP tool call');
              diag?.log(`MCP EXEC: node=${node.id}, tool="${t.name}"`);
              diag?.logJson(`MCP args for ${t.name}`, args);
              const typedArgs = args as Record<string, unknown>;
              try {
                const result = await callMCPTool(
                  node.data.mcpServerUrl!,
                  t.name,
                  typedArgs,
                  mcpAuthHeaders,
                );
                diag?.log(`MCP RESULT: tool="${t.name}" — success`);
                diag?.logJson(
                  `MCP result for ${t.name}`,
                  typeof result === 'string' ? result.substring(0, 500) : result,
                );
                return result;
              } catch (err) {
                const msg = (err as Error).message;
                diag?.log(`MCP ERROR: tool="${t.name}" — ${msg}`);
                throw err;
              }
            },
          } as any);
        }
      } catch (err) {
        const msg = (err as Error).message;
        log.warn({ nodeId: node.id, error: msg }, 'Failed to load MCP tools');
        diag?.log(`MCP DISCOVERY ERROR: ${msg}`);
      }
    }

    // Inject built-in workspace tools (blackboard)
    if (executionId) {
      const workspaceTools = createWorkspaceTools(executionId, node.id, emitter);
      Object.assign(tools, workspaceTools);
      diag?.log(`Workspace tools injected: ${Object.keys(workspaceTools).join(', ')}`);
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

    diag?.log(
      `LLM START: node=${node.id}, model=${getModelIdForNode(node)}, thinking=${enableThinking}`,
    );
    diag?.log(`System prompt length: ${systemPrompt.length} chars`);
    diag?.log(`User message length: ${finalPrompt.length} chars`);
    diag?.log(`Tools available: ${Object.keys(tools).length}`);

    const streamOptions = {
      model,
      system: systemPrompt,
      prompt: finalPrompt,
      tools: Object.keys(tools).length > 0 ? tools : undefined,
      maxSteps: Math.min(Math.max(Number(process.env.MAX_STEPS) || 10, 1), 50),
      providerOptions: providerOptions as Record<string, Record<string, any>> | undefined,
      abortSignal: abortController.signal,
    };

    diag?.logJson('streamText options', {
      ...streamOptions,
      model: getModelIdForNode(node),
      tools: Object.keys(tools).length > 0 ? Object.keys(tools) : 'none',
    });

    const result = streamText(streamOptions);

    let fullText = '';
    let tokensUsed = 0;
    let reasoningText = '';
    let toolInputBuffer = '';
    let streamPartCount = 0;

    if (enableThinking) {
      diag?.log('fullStream loop (thinking enabled)');
      for await (const part of result.fullStream) {
        streamPartCount++;
        if (part.type === 'reasoning-delta') {
          const textChunk = (part as any).text || '';
          if (textChunk) {
            reasoningText += textChunk;
            diag?.log(
              `[${node.id}] THINKING (${textChunk.length}c): ${textChunk.substring(0, 150)}`,
            );
            if (emitter && !emitter.isClosed()) {
              await emitter.emit('thinking', { nodeId: node.id, chunk: textChunk });
            }
          }
        } else if (part.type === 'text-delta') {
          const textChunk = (part as any).text || '';
          if (textChunk) {
            fullText += textChunk;
            diag?.log(`[${node.id}] TOKEN (${textChunk.length}c): ${textChunk.substring(0, 150)}`);
            if (emitter && !emitter.isClosed()) {
              await emitter.emit('token', { nodeId: node.id, chunk: textChunk });
            }
          }
        } else if (part.type === 'tool-call') {
          const tc = part as any;
          const toolArgs = tc.args ?? tc.toolCall?.args ?? tc.arguments;
          diag?.log(`[${node.id}] TOOL CALL: "${tc.toolName}"`);
          diag?.logJson(`[${node.id}] Tool args`, toolArgs);
        } else if (part.type === 'tool-result') {
          const tr = part as any;
          const toolResult = tr.result ?? tr;
          diag?.log(`[${node.id}] TOOL RESULT: "${tr.toolName || tr.name}"`);
          diag?.logJson(`[${node.id}] Tool result`, toolResult);
        } else if (part.type === 'tool-input-delta') {
          const chunk = (part as any).text || (part as any).delta || '';
          if (chunk) toolInputBuffer += chunk;
        } else if (part.type === 'tool-input-start') {
          toolInputBuffer = '';
        } else if (part.type === 'tool-input-end') {
          diag?.log(`[${node.id}] TOOL INPUT (full JSON): ${toolInputBuffer.substring(0, 1000)}`);
          toolInputBuffer = '';
        } else if (part.type === 'error') {
          const errPart = part as any;
          const errMsg = errPart.error || JSON.stringify(errPart);
          diag?.log(`[${node.id}] STREAM ERROR: ${errMsg}`);
        }
      }
      diag?.log(`[${node.id}] Stream parts processed: ${streamPartCount}`);
    } else {
      diag?.log('textStream loop (no thinking)');
      for await (const chunk of result.textStream) {
        fullText += chunk;
        diag?.log(`[${node.id}] TOKEN (${chunk.length}c): ${chunk.substring(0, 150)}`);
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

    // Fallback: if no text-delta parts were captured, try finalResult.text
    if (!fullText) {
      const finalText = await finalResult.text;
      if (finalText) {
        fullText = finalText;
      }
    }

    diag?.log(
      `[${node.id}] LLM DONE: tokens=${tokensUsed}, textLength=${fullText.length}, reasoningLength=${reasoningText.length}`,
    );
    diag?.log(`[${node.id}] Tool calls count: ${(toolCalls as unknown[])?.length || 0}`);
    if (toolCalls) {
      diag?.logJson(`[${node.id}] Final tool calls`, toolCalls);
    }
    if (toolResults) {
      diag?.logJson(`[${node.id}] Final tool results`, toolResults);
    }

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
    const errorStack = (error as Error).stack;

    log.error({ nodeId: node.id, error: errorMessage, durationMs }, 'Agent execution failed');
    diag?.log(`[${node.id}] AGENT FAILED: ${errorMessage}`);
    if (errorStack) diag?.log(`[${node.id}] Stack: ${errorStack}`);

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

function extractImageFromBus(busMessages: BusMessage[]): string | undefined {
  for (const msg of busMessages) {
    const payload = msg.payload as Record<string, unknown> | undefined;
    const outputs = payload?.outputs as Array<{ type: string; value: string }> | undefined;
    if (outputs) {
      const img = outputs.find((o) => o.type === 'image');
      if (img?.value) return img.value;
    }
  }
  return undefined;
}

function extractBusPayloadText(msg: BusMessage): string {
  if (typeof msg.payload === 'string') return msg.payload;
  if (msg.payload && typeof msg.payload === 'object') {
    const p = msg.payload as Record<string, unknown>;
    return (p.text as string) ?? (p.value as string) ?? JSON.stringify(msg.payload);
  }
  return String(msg.payload ?? '');
}
