export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'signup_bonus' | 'execution_cost' | 'admin_grant';
  description: string | null;
  executionId: string | null;
  createdAt: string;
}

// ─── Model-aware credit pricing ──────────────────────────────────────────
// All prices are in credits, at a ratio of 10,000 credits = $1.00 USD.
// This matches actual Qwen Cloud API pricing (International region, June 2026).

/** Blended credit cost per 1 million tokens (70% input / 30% output split). */
export const MODEL_TOKEN_COST_PER_1M: Record<string, number> = {
  'qwen3.7-max': 20000, // $1.25 inp + $3.75 out → 20,000 cr / 1M
  'qwen3.7-plus': 6080, // $0.32 inp + $1.28 out → 6,080 cr / 1M
  'qwen3.6-flash': 4720, // $0.19 inp + $1.13 out → 4,720 cr / 1M
  'qwen3.6-max-preview': 32500, // $1.30 inp + $7.80 out → 32,500 cr / 1M
  'qwen-turbo': 1550, // $0.05 inp + $0.40 out (Qwen Flash) → 1,550 cr / 1M
  'qwen-plus': 6000, // $0.50 inp + $3.00 out (Qwen3.6 Plus proxy) → 6,000 cr / 1M
  'qwen-max': 20000, // Qwen3-Max → 20,000 cr / 1M
  default: 20000, // Fallback to most expensive tier
};

/** Models whose ID starts with a given prefix that maps to a cost key. */
const MODEL_PREFIX_MAP: [string, string][] = [
  ['qwen3.7-max', 'qwen3.7-max'],
  ['qwen3.7-plus', 'qwen3.7-plus'],
  ['qwen3.6-max-preview', 'qwen3.6-max-preview'],
  ['qwen3.6-flash', 'qwen3.6-flash'],
  ['qwen3.6-plus', 'qwen3.6-plus'],
  ['qwen-turbo', 'qwen-turbo'],
  ['qwen-plus', 'qwen-plus'],
  ['qwen-max', 'qwen-max'],
];

/** Model IDs that generate images (charged per image, not per token). */
const IMAGE_MODEL_PREFIXES = ['qwen-image', 'wanx', 'wan2.', 'z-image'];

/** Model IDs that generate audio/speech (charged per character, not per token). */
const AUDIO_MODEL_PREFIXES = ['qwen3-tts', 'cosyvoice'];

/**
 * Resolve a model ID string to the appropriate pricing tier key.
 */
export function resolveCostTier(modelId: string): string {
  for (const [prefix, tier] of MODEL_PREFIX_MAP) {
    if (modelId.startsWith(prefix)) return tier;
  }
  return 'default';
}

/**
 * Get the credit cost for a single token for the given model.
 */
export function getTokenCost(modelId: string): number {
  const tier = resolveCostTier(modelId);
  const per1M = MODEL_TOKEN_COST_PER_1M[tier] ?? MODEL_TOKEN_COST_PER_1M['default'];
  return per1M / 1_000_000;
}

/**
 * Check if a model ID is an image generation model.
 */
export function isImageModel(modelId: string): boolean {
  return IMAGE_MODEL_PREFIXES.some((p) => modelId.startsWith(p));
}

/**
 * Check if a model ID is an audio/speech model.
 */
export function isAudioModel(modelId: string): boolean {
  return AUDIO_MODEL_PREFIXES.some((p) => modelId.startsWith(p));
}

/** Fixed credit cost for generating one image. */
export const IMAGE_GEN_COST = 750; // $0.075 at 10K = $1

/** Fixed credit cost for TTS (estimated ~1,000 chars). */
export const AUDIO_GEN_COST = 100; // $0.10/10K chars → ~100 cr for ~1K chars

/** Default model for each node type (mirrors MODEL_DEFAULTS in model-router.ts). */
const NODE_DEFAULT_MODEL: Record<string, string> = {
  supervisor: 'qwen3.7-max',
  agent: 'qwen3.7-plus',
  mcp_tool: 'qwen3.7-plus',
  trigger: 'qwen3.6-flash',
  input_trigger: 'qwen3.6-flash',
  logic: 'qwen3.6-flash',
};

/**
 * Get the effective model ID for a node (user override or type default).
 */
function getEffectiveModel(nodeType: string, userModel?: string): string {
  return userModel ?? NODE_DEFAULT_MODEL[nodeType] ?? 'qwen3.7-plus';
}

/**
 * Estimated max tokens a node type might consume (for credit reservation).
 */
const ESTIMATED_MAX_TOKENS: Record<string, number> = {
  agent: 3000,
  supervisor: 5000,
  mcp_tool: 2000,
  trigger: 0,
  input_trigger: 0,
  logic: 0,
};

/**
 * Estimate the maximum possible credit cost for a node (for pre-execution reservation).
 * Uses generous token estimates with the most expensive applicable model tier.
 */
export function estimateNodeMaxCost(nodeType: string, userModel?: string): number {
  if (userModel && isImageModel(userModel)) return IMAGE_GEN_COST;
  if (userModel && isAudioModel(userModel)) return AUDIO_GEN_COST;
  const tokenEstimate = ESTIMATED_MAX_TOKENS[nodeType] ?? 500;
  const modelId = getEffectiveModel(nodeType, userModel);
  const costPerToken = getTokenCost(modelId);
  return Math.max(Math.round(tokenEstimate * costPerToken), 10); // minimum 10 credits per node
}

/**
 * Calculate the actual credit cost for a node given actual token usage.
 */
export function calculateNodeCost(
  nodeType: string,
  userModel: string | undefined,
  tokensUsed: number,
): number {
  const modelId = getEffectiveModel(nodeType, userModel);
  if (isImageModel(modelId)) return IMAGE_GEN_COST;
  if (isAudioModel(modelId)) return AUDIO_GEN_COST;
  const costPerToken = getTokenCost(modelId);
  return Math.max(Math.round(tokensUsed * costPerToken), 1);
}

export const SIGNUP_CREDITS = 5000;
export const LOW_CREDIT_WARNING = 100;
