import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserMessageFromBus } from '../engine/prompt-builder.js';
import type { NodePayload, BusMessage } from '@qwenweaver/types';

function node(id: string, type: string, data: Record<string, unknown> = {}): NodePayload {
  return { id, type: type as any, position: { x: 0, y: 0 }, data };
}

function busMsg(
  sourceNodeId: string,
  messageType: 'output' | 'error' | 'conversation' | 'status' | 'tool_call' | 'tool_result',
  payload: string | Record<string, unknown>,
  overrides: Partial<BusMessage> = {},
): BusMessage {
  return {
    id: overrides.id ?? `msg-${sourceNodeId}-${Date.now()}`,
    executionId: 'test-exec',
    topic: `node:${sourceNodeId}.output`,
    sourceNodeId,
    messageType,
    payload,
    timestamp: Date.now(),
    ...overrides,
  } as BusMessage;
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

  describe('buildUserMessageFromBus', () => {
    it('returns label when no messages and no revision feedback', () => {
      const n = node('a1', 'agent', { label: 'Analyze the data.' });
      const result = buildUserMessageFromBus(n, [], [], []);
      expect(result).toBe('Analyze the data.');
    });

    it('returns label fallback when no messages and no label', () => {
      const n = node('a1', 'agent', {});
      const result = buildUserMessageFromBus(n, [], [], []);
      expect(result).toBe('Begin your task.');
    });

    it('includes upstream output messages in the result', () => {
      const n = node('a1', 'agent', { label: 'Summarize.' });
      const upstreamMessages = [busMsg('src1', 'output', 'Raw upstream text')];
      const result = buildUserMessageFromBus(n, upstreamMessages, [], []);
      expect(result).toContain('Raw upstream text');
      expect(result).toContain('src1');
      expect(result).toContain('Summarize.');
    });

    it('includes revision feedback as a dedicated section', () => {
      const n = node('a1', 'agent', {
        label: 'Write code.',
        _revisionFeedback: 'Your code lacks error handling. Please add try-catch blocks.',
      });
      const upstreamMessages = [busMsg('src1', 'output', 'Some context')];
      const result = buildUserMessageFromBus(
        n,
        upstreamMessages,
        [],
        [],
        'Your code lacks error handling. Please add try-catch blocks.',
      );
      expect(result).toContain('REVISION REQUESTED BY SUPERVISOR');
      expect(result).toContain('error handling');
      expect(result).toContain('revise your previous response');
      expect(result).toContain('Some context');
    });

    it('includes revision section even when no upstream messages', () => {
      const n = node('a1', 'agent', { _revisionFeedback: 'Please add more detail.' });
      const result = buildUserMessageFromBus(n, [], [], [], 'Please add more detail.');
      expect(result).toContain('REVISION REQUESTED BY SUPERVISOR');
      expect(result).toContain('Please add more detail');
    });

    it('includes conversation messages in the result', () => {
      const n = node('a1', 'agent', { label: 'Respond.' });
      const conversationMessages = [
        busMsg('a1', 'conversation', 'Hello', {
          topic: 'conversation:a1|a2',
          round: 1,
        }),
        busMsg('a2', 'conversation', 'Hi there', {
          topic: 'conversation:a1|a2',
          round: 1,
        }),
      ];
      const result = buildUserMessageFromBus(n, [], conversationMessages, [
        {
          source: 'a1',
          target: 'a2',
          data: { subscription: { conversationMode: true, maxRounds: 5 } },
        },
      ]);
      expect(result).toContain('Hello');
      expect(result).toContain('Hi there');
      expect(result).toContain('Conversation transcript');
    });
  });
});
