import { describe, it, expect, beforeEach } from 'vitest';
import { MessageBus } from '../engine/message-bus.js';

describe('MessageBus', () => {
  let bus: MessageBus;

  beforeEach(() => {
    bus = new MessageBus();
  });

  it('creates a channel and allows sending messages', async () => {
    bus.createChannel('a|b', ['a', 'b'], { maxRounds: 5 });
    const msg = await bus.send('a', 'a|b', 'Hello from a');
    expect(msg.channelId).toBe('a|b');
    expect(msg.fromNodeId).toBe('a');
    expect(msg.toNodeId).toBe('b');
    expect(msg.content).toBe('Hello from a');
    expect(msg.round).toBe(1);
  });

  it('throws when sending on non-existent channel', async () => {
    await expect(bus.send('a', 'nonexistent', 'msg')).rejects.toThrow('not found');
  });

  it('throws when non-participant sends on channel', async () => {
    bus.createChannel('a|b', ['a', 'b']);
    await expect(bus.send('c', 'a|b', 'msg')).rejects.toThrow('not a participant');
  });

  it('advances round when all participants have responded', async () => {
    bus.createChannel('a|b', ['a', 'b'], { maxRounds: 3 });
    expect(bus.getCurrentRound('a|b')).toBe(1);
    await bus.send('a', 'a|b', 'Message from a');
    expect(bus.getCurrentRound('a|b')).toBe(1);
    await bus.send('b', 'a|b', 'Message from b');
    expect(bus.getCurrentRound('a|b')).toBe(2);
  });

  it('does not advance beyond maxRounds', async () => {
    bus.createChannel('a|b', ['a', 'b'], { maxRounds: 1 });
    await bus.send('a', 'a|b', 'Msg a');
    await bus.send('b', 'a|b', 'Msg b');
    expect(bus.getCurrentRound('a|b')).toBe(2);
    expect(bus.isComplete('a|b')).toBe(true);
  });

  it('receives messages addressed to a specific agent', async () => {
    bus.createChannel('a|b', ['a', 'b']);
    await bus.send('a', 'a|b', 'Hello from a');
    await bus.send('b', 'a|b', 'Reply from b');
    const msgsForA = bus.receive('a', 'a|b');
    expect(msgsForA).toHaveLength(1);
    expect(msgsForA[0].content).toBe('Reply from b');
  });

  it('receives messages filtered by sinceRound', async () => {
    bus.createChannel('a|b', ['a', 'b'], { maxRounds: 3 });
    await bus.send('a', 'a|b', 'R1 a');
    await bus.send('b', 'a|b', 'R1 b');
    await bus.send('a', 'a|b', 'R2 a');
    await bus.send('b', 'a|b', 'R2 b');
    const msgs = bus.receive('a', 'a|b', 2);
    expect(msgs.every((m) => m.round >= 2)).toBe(true);
    expect(msgs.length).toBeGreaterThanOrEqual(1);
  });

  it('returns full transcript via getTranscript', async () => {
    bus.createChannel('a|b', ['a', 'b']);
    await bus.send('a', 'a|b', 'First');
    await bus.send('b', 'a|b', 'Second');
    const transcript = bus.getTranscript('a|b');
    expect(transcript).toHaveLength(2);
    expect(transcript[0].content).toBe('First');
    expect(transcript[1].content).toBe('Second');
  });

  it('gets channels for a node', () => {
    bus.createChannel('a|b', ['a', 'b']);
    bus.createChannel('a|c', ['a', 'c']);
    const channels = bus.getChannelsForNode('a');
    expect(channels).toContain('a|b');
    expect(channels).toContain('a|c');
  });

  it('returns isComplete true for non-existent channel', () => {
    expect(bus.isComplete('nonexistent')).toBe(true);
  });

  it('waits for new messages with timeout', async () => {
    bus.createChannel('a|b', ['a', 'b']);
    const waitPromise = bus.waitForMessages('b', 'a|b', 200);
    await bus.send('a', 'a|b', 'Async message');
    const msgs = await waitPromise;
    expect(msgs.some((m) => m.content === 'Async message')).toBe(true);
  });

  it('times out when waiting with no messages', async () => {
    bus.createChannel('a|b', ['a', 'b']);
    const msgs = await bus.waitForMessages('b', 'a|b', 100);
    expect(msgs).toEqual([]);
  });

  it('destroys all channels', () => {
    bus.createChannel('a|b', ['a', 'b']);
    bus.createChannel('a|c', ['a', 'c']);
    bus.destroy();
    expect(bus.isComplete('a|b')).toBe(true);
    expect(bus.getChannelsForNode('a')).toEqual([]);
  });
});
