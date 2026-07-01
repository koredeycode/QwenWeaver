export function isAgent(type?: string): boolean {
  return type === 'agent' || type === 'supervisor' || type === 'debate_arena';
}

export function isDebateArena(type?: string): boolean {
  return type === 'debate_arena';
}

export function isTrigger(type?: string): boolean {
  return type === 'trigger' || type === 'input_trigger';
}

export function doesNotSupportTools(node: {
  data?: { model?: string; workerType?: string };
}): boolean {
  const model = node.data?.model || '';
  const workerType = node.data?.workerType || '';
  const mediaModels = ['wan2.7-image-pro', 'wan2.7-t2v', 'cosyvoice-v3-plus', 'qwen3-tts-flash'];
  const mediaTypes = ['image', 'video', 'audio'];
  return mediaModels.includes(model) || mediaTypes.includes(workerType);
}

export interface HandleResult {
  sourceHandle?: string;
  targetHandle?: string;
}

export function autoDetectHandles(sourceNodeType?: string, targetNodeType?: string): HandleResult {
  const agent = isAgent(sourceNodeType) && isAgent(targetNodeType);
  const agentToTool = isAgent(sourceNodeType) && targetNodeType === 'mcp_tool';
  const triggerToAgent = isTrigger(sourceNodeType) && isAgent(targetNodeType);
  const toolToAgent = sourceNodeType === 'mcp_tool' && isAgent(targetNodeType);

  if (agent) {
    return { sourceHandle: 'source-right', targetHandle: 'target-left' };
  }
  if (agentToTool) {
    return { sourceHandle: 'source-bottom', targetHandle: 'target' };
  }
  if (triggerToAgent) {
    return { sourceHandle: 'source', targetHandle: 'target-left' };
  }
  if (toolToAgent) {
    return { sourceHandle: 'source-bottom', targetHandle: 'target-top' };
  }
  if (isAgent(targetNodeType)) {
    return { targetHandle: 'target-left' };
  }
  if (targetNodeType === 'mcp_tool') {
    return { targetHandle: 'target' };
  }
  return {};
}
