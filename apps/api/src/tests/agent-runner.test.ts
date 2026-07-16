import { describe, it, expect, afterAll } from 'vitest';
import { runAgent, mergeWorkspaceContent } from '../engine/agent-runner.js';
import type { NodePayload } from '@qwenweaver/types';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('mergeWorkspaceContent', () => {
  it('returns text unchanged when there are no tool calls', () => {
    expect(mergeWorkspaceContent('hello', undefined)).toBe('hello');
    expect(mergeWorkspaceContent('hello', [])).toBe('hello');
  });

  it('merges workspace content when streamed text is only a preamble (prod bug repro)', () => {
    const preamble =
      "I'll research and compile findings on the latest advances in LLM agent orchestration, drawing on recent academic papers, preprints, and notable blog posts in this rapidly evolving field.\n\n";
    const papers = 'x'.repeat(9265);
    const result = mergeWorkspaceContent(preamble, [
      { toolName: 'workspace_write', args: { key: 'literature_search.topic', value: 'topic' } },
      { toolName: 'workspace_write', args: { key: 'literature_search.papers', value: papers } },
    ]);
    expect(result).toContain("I'll research and compile findings");
    expect(result).toContain(papers);
  });

  it('uses workspace content directly when streamed text is empty', () => {
    const content = 'y'.repeat(500);
    const result = mergeWorkspaceContent('', [
      { toolName: 'workspace_write', args: { key: 'k', value: content } },
    ]);
    expect(result).toBe(content);
  });

  it('does not merge when streamed text is already substantial', () => {
    const genuine = 'z'.repeat(1488);
    const workspaceValue = 'w'.repeat(1581);
    const result = mergeWorkspaceContent(genuine, [
      { toolName: 'workspace_write', args: { key: 'k', value: workspaceValue } },
    ]);
    expect(result).toBe(genuine);
  });

  it('does not merge tiny workspace values', () => {
    const result = mergeWorkspaceContent('short answer', [
      { toolName: 'workspace_write', args: { key: 'k', value: 'tiny' } },
    ]);
    expect(result).toBe('short answer');
  });

  it('stringifies non-string workspace values', () => {
    const obj = { findings: 'a'.repeat(300), sources: ['b', 'c'] };
    const result = mergeWorkspaceContent('', [
      { toolName: 'workspace_write', args: { key: 'k', value: obj } },
    ]);
    expect(result).toContain('a'.repeat(300));
    expect(result).toContain('"sources"');
  });

  it('ignores non-workspace_write tool calls', () => {
    const result = mergeWorkspaceContent('short', [
      { toolName: 'workspace_read', args: { key: 'k' } },
      { toolName: 'some_mcp_tool', args: { value: 'q'.repeat(500) } },
    ]);
    expect(result).toBe('short');
  });

  it('supports alternate tool call shapes (name/input)', () => {
    const content = 'v'.repeat(400);
    const result = mergeWorkspaceContent('', [
      { name: 'workspace_write', input: { key: 'k', value: content } },
    ]);
    expect(result).toBe(content);
  });
});

describe('agent-runner', () => {
  const publicDir = path.resolve('public');

  afterAll(() => {
    // Clean up temporary local runs storage
    const testStorageDir = path.join(publicDir, 'storage', 'runs', 'test-run-id');
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  it('runs trigger and logic nodes as pass-throughs', async () => {
    const triggerNode: NodePayload = {
      id: 'T1',
      type: 'trigger',
      position: { x: 0, y: 0 },
      data: { label: 'Start Trigger' },
    };

    const result = await runAgent(triggerNode, []);

    expect(result.status).toBe('completed');
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0].type).toBe('text');
    expect(result.outputs[0].value).toContain('/public/storage/runs/');
  });

  it('fails image generation gracefully when DASHSCOPE_API_KEY is not set', async () => {
    const imageNode: NodePayload = {
      id: 'I1',
      type: 'agent',
      position: { x: 0, y: 0 },
      data: {
        label: 'A cute red cat',
        outputFormat: 'image',
      },
    };

    const result = await runAgent(imageNode, [], undefined, 'test-run-id');

    expect(result.status).toBe('failed');
  });

  it('fails audio generation gracefully when DASHSCOPE_API_KEY is not set', async () => {
    const audioNode: NodePayload = {
      id: 'A1',
      type: 'agent',
      position: { x: 0, y: 0 },
      data: {
        label: 'Hello world narration',
        outputFormat: 'audio',
      },
    };

    const result = await runAgent(audioNode, [], undefined, 'test-run-id');

    expect(result.status).toBe('failed');
  });

  it('fails video generation gracefully when DASHSCOPE_API_KEY is not set', async () => {
    const videoNode: NodePayload = {
      id: 'V1',
      type: 'agent',
      position: { x: 0, y: 0 },
      data: {
        label: 'A panoramic view of a mountain range',
        outputFormat: 'video',
      },
    };

    const result = await runAgent(videoNode, [], undefined, 'test-run-id');

    expect(result.status).toBe('failed');
  });
});
