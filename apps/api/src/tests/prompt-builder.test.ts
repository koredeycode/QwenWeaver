import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  buildUserMessage,
  buildMessagePrompt,
} from '../engine/prompt-builder.js';
import type { NodePayload } from '@qwenweaver/types';

function node(id: string, type: string, data: Record<string, unknown> = {}): NodePayload {
  return { id, type: type as any, position: { x: 0, y: 0 }, data };
}

describe('prompt-builder', () => {
  describe('buildSystemPrompt', () => {
    it('returns the node systemPrompt when set', () => {
      const n = node('a1', 'agent', { systemPrompt: 'You are an expert researcher.' });
      expect(buildSystemPrompt(n)).toContain('expert researcher');
    });

    it('adds formatting instruction for outputFormat', () => {
      const n = node('a1', 'agent', { outputFormat: 'json' });
      const prompt = buildSystemPrompt(n);
      expect(prompt).toContain('[FORMATTING INSTRUCTION]');
      expect(prompt).toContain('valid raw JSON');
    });

    it('adds supervisor role instruction for supervisor type', () => {
      const n = node('s1', 'supervisor', { systemPrompt: 'You are the overseer.' });
      const prompt = buildSystemPrompt(n);
      expect(prompt).toContain('Supervisor agent');
      expect(prompt).toContain('detect contradictions');
    });

    it('provides default prompt when no systemPrompt is set', () => {
      const n = node('a1', 'agent', {});
      const prompt = buildSystemPrompt(n);
      expect(prompt).toContain('helpful AI assistant');
    });
  });

  describe('buildUserMessage', () => {
    it('returns label when no upstream outputs and no revision feedback', () => {
      const n = node('a1', 'agent', { label: 'Analyze the data.' });
      const result = buildUserMessage(n, new Map());
      expect(result).toBe('Analyze the data.');
    });

    it('returns label fallback when no upstream, no revision feedback, no label', () => {
      const n = node('a1', 'agent', {});
      const result = buildUserMessage(n, new Map());
      expect(result).toBe('Begin your task.');
    });

    it('includes upstream outputs in the message', () => {
      const n = node('a1', 'agent', { label: 'Summarize.' });
      const upstream = new Map();
      upstream.set('src1', {
        nodeId: 'src1',
        outputs: [],
        text: 'Raw upstream text',
        tokensUsed: 10,
        durationMs: 5,
        status: 'completed',
      });
      const result = buildUserMessage(n, upstream);
      expect(result).toContain('Raw upstream text');
      expect(result).toContain('src1');
      expect(result).toContain('Summarize.');
    });

    it('includes _revisionFeedback as a dedicated revision section', () => {
      const n = node('a1', 'agent', {
        label: 'Write code.',
        _revisionFeedback: 'Your code lacks error handling. Please add try-catch blocks.',
      });
      const upstream = new Map();
      upstream.set('src1', {
        nodeId: 'src1',
        outputs: [],
        text: 'Some context',
        tokensUsed: 5,
        durationMs: 3,
        status: 'completed',
      });
      const result = buildUserMessage(n, upstream);
      expect(result).toContain('REVISION REQUESTED BY SUPERVISOR');
      expect(result).toContain('error handling');
      expect(result).toContain('revise your previous response');
      expect(result).toContain('Some context');
    });

    it('includes revision section even when no upstream outputs', () => {
      const n = node('a1', 'agent', {
        _revisionFeedback: 'Please add more detail.',
      });
      const result = buildUserMessage(n, new Map());
      expect(result).toContain('REVISION REQUESTED BY SUPERVISOR');
      expect(result).toContain('Please add more detail');
    });
  });

  describe('buildMessagePrompt', () => {
    it('generates initial message prompt for empty transcript', () => {
      const result = buildMessagePrompt('a1', [], 'ch1', 1, 5);
      expect(result).toContain('ch1');
      expect(result).toContain('initial message');
    });

    it('includes transcript history for non-empty transcript', () => {
      const transcript = [
        { sender: 'a1', text: 'Hello', round: 1 },
        { sender: 'a2', text: 'Hi back', round: 1 },
      ];
      const result = buildMessagePrompt('a1', transcript, 'ch1', 2, 5);
      expect(result).toContain('Hello');
      expect(result).toContain('Hi back');
      expect(result).not.toContain('FINAL');
    });

    it('marks final round', () => {
      const transcript = [{ sender: 'a1', text: 'Hello', round: 1 }];
      const result = buildMessagePrompt('a1', transcript, 'ch1', 5, 5);
      expect(result).toContain('FINAL');
    });
  });
});
