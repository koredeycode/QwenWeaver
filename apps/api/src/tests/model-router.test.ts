import { describe, it, expect } from 'vitest';
import { getModelIdForNode } from '../engine/model-router.js';
import type { NodePayload } from '@qwenweaver/types';

function node(
  id: string,
  type: 'trigger' | 'input_trigger' | 'agent' | 'supervisor' | 'mcp_tool' | 'logic',
  data: Record<string, unknown> = {},
): NodePayload {
  return { id, type, position: { x: 0, y: 0 }, data };
}

describe('model-router', () => {
  it('assigns qwen3.7-max to supervisor nodes', () => {
    expect(getModelIdForNode(node('s1', 'supervisor'))).toBe('qwen3.7-max');
  });

  it('assigns qwen3.7-plus to agent nodes', () => {
    expect(getModelIdForNode(node('a1', 'agent'))).toBe('qwen3.7-plus');
  });

  it('assigns qwen3.7-plus to mcp_tool nodes', () => {
    expect(getModelIdForNode(node('m1', 'mcp_tool'))).toBe('qwen3.7-plus');
  });

  it('assigns qwen3.6-flash to trigger nodes', () => {
    expect(getModelIdForNode(node('t1', 'trigger'))).toBe('qwen3.6-flash');
  });

  it('assigns qwen3.6-flash to input_trigger nodes', () => {
    expect(getModelIdForNode(node('it1', 'input_trigger'))).toBe('qwen3.6-flash');
  });

  it('assigns qwen3.6-flash to logic nodes', () => {
    expect(getModelIdForNode(node('l1', 'logic'))).toBe('qwen3.6-flash');
  });

  it('respects user-specified model override', () => {
    expect(getModelIdForNode(node('a1', 'agent', { model: 'qwen3-coder' }))).toBe('qwen3-coder');
  });

  it('falls back to qwen-plus for unknown node types', () => {
    const n = node('x1', 'agent');
    (n as Record<string, unknown>).type = 'unknown_type';
    expect(getModelIdForNode(n)).toBe('qwen-plus');
  });
});
