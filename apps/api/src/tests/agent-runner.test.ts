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

    const result = await runAgent(triggerNode, new Map());

    expect(result.status).toBe('completed');
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0].type).toBe('text');
    expect(result.outputs[0].value).toBe('Start Trigger');
  });

  it('generates placeholder mock image and writes to local disk when outputFormat is image', async () => {
    const imageNode: NodePayload = {
      id: 'I1',
      type: 'agent',
      position: { x: 0, y: 0 },
      data: {
        label: 'A cute red cat',
        outputFormat: 'image',
      },
    };

    const result = await runAgent(imageNode, new Map(), undefined, 'test-run-id');

    expect(result.status).toBe('completed');
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0].type).toBe('image');
    expect(result.outputs[0].contentType).toBe('image/png');

    const fileUrl = result.outputs[0].value;
    expect(fileUrl).toContain('/public/storage/runs/test-run-id/I1_output.png');

    // Assert that the file was actually written to disk
    const absolutePath = path.resolve('.' + fileUrl);
    expect(fs.existsSync(absolutePath)).toBe(true);
  });

  it('generates placeholder mock audio and writes to local disk when outputFormat is audio', async () => {
    const audioNode: NodePayload = {
      id: 'A1',
      type: 'agent',
      position: { x: 0, y: 0 },
      data: {
        label: 'Hello world narration',
        outputFormat: 'audio',
      },
    };

    const result = await runAgent(audioNode, new Map(), undefined, 'test-run-id');

    expect(result.status).toBe('completed');
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0].type).toBe('audio');
    expect(result.outputs[0].contentType).toBe('audio/mpeg');

    const fileUrl = result.outputs[0].value;
    expect(fileUrl).toContain('/public/storage/runs/test-run-id/A1_output.mp3');

    // Assert that the file was actually written to disk
    const absolutePath = path.resolve('.' + fileUrl);
    expect(fs.existsSync(absolutePath)).toBe(true);
  });

  it('generates placeholder mock video and writes to local disk when outputFormat is video', async () => {
    const videoNode: NodePayload = {
      id: 'V1',
      type: 'agent',
      position: { x: 0, y: 0 },
      data: {
        label: 'A panoramic view of a mountain range',
        outputFormat: 'video',
      },
    };

    const result = await runAgent(videoNode, new Map(), undefined, 'test-run-id');

    expect(result.status).toBe('completed');
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0].type).toBe('video');
    expect(result.outputs[0].contentType).toBe('video/mp4');

    const fileUrl = result.outputs[0].value;
    expect(fileUrl).toContain('/public/storage/runs/test-run-id/V1_output.mp4');

    // Assert that the file was actually written to disk
    const absolutePath = path.resolve('.' + fileUrl);
    expect(fs.existsSync(absolutePath)).toBe(true);
  });
});
