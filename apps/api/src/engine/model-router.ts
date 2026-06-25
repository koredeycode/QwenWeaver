import { createAlibaba } from '@ai-sdk/alibaba';
import type { LanguageModel } from 'ai';
import type { NodePayload } from '@qwenweaver/types';
import { createModuleLogger } from '../logger.js';

const log = createModuleLogger('engine/model-router');

/**
 * Default model assignments per node type.
 * Users can override via `node.data.model`.
 */
const MODEL_DEFAULTS: Record<string, string> = {
  supervisor: 'qwen3-max',
  agent: 'qwen-plus',
  mcp_tool: 'qwen-plus',
  trigger: 'qwen-turbo',
  input_trigger: 'qwen-turbo',
  logic: 'qwen-turbo',
};

/**
 * Node types that should use the thinking/reasoning mode.
 */
const THINKING_ENABLED_TYPES = new Set(['supervisor']);

/** Default thinking budget tokens for supervisor nodes. */
const DEFAULT_THINKING_BUDGET = 4096;

// Lazily initialize the Alibaba provider (requires DASHSCOPE_API_KEY)
let _provider: ReturnType<typeof createAlibaba> | null = null;

export function getProvider(): ReturnType<typeof createAlibaba> {
  if (!_provider) {
    _provider = createAlibaba({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: process.env.DASHSCOPE_BASE_URL,
    });
  }
  return _provider;
}

export interface ModelConfig {
  model: LanguageModel;
  enableThinking: boolean;
  thinkingBudget?: number;
}

/**
 * Selects the appropriate Qwen model for a given node.
 *
 * - Supervisors → `qwen-max` with thinking mode enabled
 * - Agents → `qwen-plus` (or custom via `node.data.model`)
 * - MCP tools → `qwen-plus` (needs tool-calling capability)
 * - Trigger/Logic → `qwen-turbo` (lightweight pass-through)
 *
 * The user can override any model by setting `node.data.model`.
 */
export function getModelForNode(node: NodePayload): ModelConfig {
  const provider = getProvider();

  const modelId = node.data.model ?? MODEL_DEFAULTS[node.type] ?? 'qwen-plus';
  const model = provider(modelId);

  const enableThinking = node.data.enableThinking ?? THINKING_ENABLED_TYPES.has(node.type);

  const thinkingBudget = enableThinking
    ? (node.data.thinkingBudget ?? DEFAULT_THINKING_BUDGET)
    : undefined;

  log.debug(
    { nodeId: node.id, nodeType: node.type, modelId, enableThinking, thinkingBudget },
    'Model selected for node',
  );

  return { model, enableThinking, thinkingBudget };
}

/**
 * Returns the model ID string that would be selected for a node (useful for logging/tests).
 */
export function getModelIdForNode(node: NodePayload): string {
  return node.data.model ?? MODEL_DEFAULTS[node.type] ?? 'qwen-plus';
}
