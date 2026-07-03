import type { BusMessage } from '@qwenweaver/types';
import { createModuleLogger } from '../logger.js';

const log = createModuleLogger('engine/data-bus');

export type BusMessagePersistFn = (msg: BusMessage) => Promise<void>;

/**
 * Topic-based DataBus for inter-agent communication.
 *
 * Topics follow the convention:
 *   - `node:<nodeId>.output`  — agent output (default subscription target)
 *   - `node:<nodeId>.error`   — agent error
 *   - `conversation:<channelId>` — conversation exchange (multi-round)
 *
 * Regular (non-conversation) edges subscribe to `node:<sourceId>.output`.
 * Conversation edges publish to `conversation:<channelId>` for multi-round exchange.
 */
export class DataBus {
  private readonly messagesByTopic = new Map<string, BusMessage[]>();
  private readonly allMessages: BusMessage[] = [];
  private readonly persistFn?: BusMessagePersistFn;
  private readonly executionId: string;

  constructor(executionId: string, persistFn?: BusMessagePersistFn) {
    this.executionId = executionId;
    this.persistFn = persistFn;
  }

  /**
   * Publish a message to a topic.
   */
  publish(
    msg: Omit<BusMessage, 'id' | 'timestamp' | 'executionId'> & {
      id?: string;
      timestamp?: number;
    },
  ): BusMessage {
    const full: BusMessage = {
      id: msg.id ?? crypto.randomUUID(),
      executionId: this.executionId,
      timestamp: msg.timestamp ?? Date.now(),
      ...msg,
    };

    const existing = this.messagesByTopic.get(full.topic) ?? [];
    existing.push(full);
    this.messagesByTopic.set(full.topic, existing);
    this.allMessages.push(full);

    if (this.persistFn) {
      this.persistFn(full).catch((err: unknown) => {
        log.warn(
          { executionId: this.executionId, topic: full.topic, error: (err as Error).message },
          'Failed to persist bus message',
        );
      });
    }

    log.debug(
      { executionId: this.executionId, topic: full.topic, sourceNodeId: full.sourceNodeId },
      'Bus message published',
    );

    return full;
  }

  /**
   * Get all messages for a specific topic.
   */
  getMessages(topic: string): BusMessage[] {
    return this.messagesByTopic.get(topic) ?? [];
  }

  /**
   * Get all messages published on topics subscribed to by a node via incoming edges.
   * Default subscription topic: `node:<sourceId>.output`
   */
  getMessagesForNode(
    nodeId: string,
    edges: Array<{ source: string; target: string }>,
  ): BusMessage[] {
    const incomingTopics = edges
      .filter((e) => e.target === nodeId)
      .map((e) => `node:${e.source}.output`);

    const result: BusMessage[] = [];
    for (const topic of incomingTopics) {
      const msgs = this.messagesByTopic.get(topic);
      if (msgs) result.push(...msgs);
    }
    return result;
  }

  /**
   * Get conversation messages involving a node — reads from conversation topics.
   * Used for multi-round message exchanges.
   */
  getConversationMessages(
    nodeId: string,
    edges: Array<{ source: string; target: string }>,
  ): BusMessage[] {
    const topics = new Set<string>();
    for (const edge of edges) {
      if (edge.source === nodeId || edge.target === nodeId) {
        const channelId = [edge.source, edge.target].sort().join('|');
        topics.add(`conversation:${channelId}`);
      }
    }

    const result: BusMessage[] = [];
    for (const topic of topics) {
      const msgs = this.messagesByTopic.get(topic);
      if (msgs) result.push(...msgs);
    }
    return result.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get messages for a specific conversation channel.
   */
  getConversationChannelMessages(channelId: string): BusMessage[] {
    return this.messagesByTopic.get(`conversation:${channelId}`) ?? [];
  }

  /**
   * Get all messages on this bus (for persistence, debugging).
   */
  getAllMessages(): BusMessage[] {
    return [...this.allMessages];
  }

  /**
   * Remove all messages for a given topic.
   */
  removeTopic(topic: string): void {
    this.messagesByTopic.delete(topic);
    const remaining = this.allMessages.filter((m) => m.topic !== topic);
    this.allMessages.length = 0;
    this.allMessages.push(...remaining);
  }

  /**
   * Remove all messages published by a specific node on its output topic.
   */
  removeNodeOutputs(nodeId: string): void {
    this.removeTopic(`node:${nodeId}.output`);
    this.removeTopic(`node:${nodeId}.error`);
  }

  /**
   * Clear the entire bus.
   */
  clear(): void {
    this.messagesByTopic.clear();
    this.allMessages.length = 0;
  }
}
