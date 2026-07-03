import { describe, it, expect, beforeEach } from 'vitest';
import { DataBus } from '../engine/message-bus.js';

describe('DataBus', () => {
  let bus: DataBus;

  beforeEach(() => {
    bus = new DataBus('test-exec');
  });

  it('publishes and retrieves messages by topic', () => {
    const msg = bus.publish({
      topic: 'node:a.output',
      sourceNodeId: 'a',
      messageType: 'output',
      payload: 'Hello from a',
    });

    expect(msg.topic).toBe('node:a.output');
    expect(msg.sourceNodeId).toBe('a');
    expect(msg.id).toBeDefined();
    expect(msg.timestamp).toBeGreaterThan(0);

    const messages = bus.getMessages('node:a.output');
    expect(messages).toHaveLength(1);
    expect(messages[0].payload).toBe('Hello from a');
  });

  it('retrieves messages for a node based on incoming edges', () => {
    bus.publish({
      topic: 'node:a.output',
      sourceNodeId: 'a',
      messageType: 'output',
      payload: 'A out',
    });
    bus.publish({
      topic: 'node:b.output',
      sourceNodeId: 'b',
      messageType: 'output',
      payload: 'B out',
    });

    const edges = [
      { source: 'a', target: 'c' },
      { source: 'b', target: 'c' },
    ];

    const msgsForC = bus.getMessagesForNode('c', edges);
    expect(msgsForC).toHaveLength(2);
    expect(msgsForC.map((m) => m.sourceNodeId)).toContain('a');
    expect(msgsForC.map((m) => m.sourceNodeId)).toContain('b');
  });

  it('returns empty for node with no incoming edges', () => {
    bus.publish({
      topic: 'node:a.output',
      sourceNodeId: 'a',
      messageType: 'output',
      payload: 'A out',
    });

    const msgsForOrphan = bus.getMessagesForNode('orphan', []);
    expect(msgsForOrphan).toHaveLength(0);
  });

  it('handles conversation messages', () => {
    bus.publish({
      topic: 'conversation:a|b',
      sourceNodeId: 'a',
      messageType: 'conversation',
      payload: 'Hi from a',
      round: 1,
    });
    bus.publish({
      topic: 'conversation:a|b',
      sourceNodeId: 'b',
      messageType: 'conversation',
      payload: 'Hi from b',
      round: 1,
    });

    const conversationMsgs = bus.getConversationChannelMessages('a|b');
    expect(conversationMsgs).toHaveLength(2);

    const edges = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'a' },
    ];
    const msgsForA = bus.getConversationMessages('a', edges);
    expect(msgsForA).toHaveLength(2);
  });

  it('publishes messages with custom id and timestamp', () => {
    const customId = 'my-custom-id';
    const customTs = 1234567890;
    const msg = bus.publish({
      id: customId,
      timestamp: customTs,
      topic: 'node:x.output',
      sourceNodeId: 'x',
      messageType: 'output',
      payload: 'test',
    });

    expect(msg.id).toBe(customId);
    expect(msg.timestamp).toBe(customTs);
  });

  it('removes topic messages', () => {
    bus.publish({ topic: 'node:a.output', sourceNodeId: 'a', messageType: 'output', payload: '1' });
    bus.publish({ topic: 'node:a.output', sourceNodeId: 'a', messageType: 'output', payload: '2' });
    bus.publish({ topic: 'node:b.output', sourceNodeId: 'b', messageType: 'output', payload: '3' });

    expect(bus.getMessages('node:a.output')).toHaveLength(2);
    expect(bus.getMessages('node:b.output')).toHaveLength(1);

    bus.removeTopic('node:a.output');

    expect(bus.getMessages('node:a.output')).toHaveLength(0);
    expect(bus.getMessages('node:b.output')).toHaveLength(1);
  });

  it('removes node outputs', () => {
    bus.publish({ topic: 'node:a.output', sourceNodeId: 'a', messageType: 'output', payload: '1' });
    bus.publish({ topic: 'node:a.output', sourceNodeId: 'a', messageType: 'output', payload: '2' });
    bus.publish({ topic: 'node:a.error', sourceNodeId: 'a', messageType: 'error', payload: 'err' });

    bus.removeNodeOutputs('a');

    expect(bus.getMessages('node:a.output')).toHaveLength(0);
    expect(bus.getMessages('node:a.error')).toHaveLength(0);
  });

  it('clears all messages', () => {
    bus.publish({ topic: 'node:a.output', sourceNodeId: 'a', messageType: 'output', payload: '1' });
    bus.publish({ topic: 'node:b.output', sourceNodeId: 'b', messageType: 'output', payload: '2' });

    expect(bus.getAllMessages()).toHaveLength(2);

    bus.clear();

    expect(bus.getAllMessages()).toHaveLength(0);
    expect(bus.getMessages('node:a.output')).toHaveLength(0);
  });

  it('uses provided executionId in published messages', () => {
    const msg = bus.publish({
      topic: 'node:a.output',
      sourceNodeId: 'a',
      messageType: 'output',
      payload: 'test',
    });

    expect(msg.executionId).toBe('test-exec');
  });

  it('handles multiple topics independently', () => {
    bus.publish({ topic: 'node:a.output', sourceNodeId: 'a', messageType: 'output', payload: 'a' });
    bus.publish({ topic: 'node:b.output', sourceNodeId: 'b', messageType: 'output', payload: 'b' });
    bus.publish({ topic: 'node:c.output', sourceNodeId: 'c', messageType: 'output', payload: 'c' });

    expect(bus.getMessages('node:a.output')).toHaveLength(1);
    expect(bus.getMessages('node:b.output')).toHaveLength(1);
    expect(bus.getMessages('node:c.output')).toHaveLength(1);
    expect(bus.getAllMessages()).toHaveLength(3);
  });
});
