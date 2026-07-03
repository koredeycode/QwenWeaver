import { describe, it, expect, afterAll } from 'vitest';
import { runAgent } from '../engine/agent-runner.js';
import type { NodePayload } from '@qwenweaver/types';
import * as fs from 'node:fs';
import * as path from 'node:path';

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
