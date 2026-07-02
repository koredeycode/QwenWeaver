import { createModuleLogger } from '../logger.js';

const log = createModuleLogger('engine/message-bus');

export interface Message {
  id: string;
  channelId: string;
  fromNodeId: string;
  toNodeId: string;
  content: string;
  round: number;
  timestamp: number;
}

interface Channel {
  id: string;
  participantIds: string[];
  maxRounds: number;
  turnBased: boolean;
  messages: Message[];
  currentRound: number;
  roundHistory: Map<number, Set<string>>; // round -> set of nodeIds that have responded
}

export interface MessageBusConfig {
  maxRounds?: number;
  turnBased?: boolean;
}

export class MessageBus {
  private channels = new Map<string, Channel>();
  private waitingResolvers = new Map<string, Array<() => void>>();

  /**
   * Create a message channel between participants.
   * Channel ID is typically `${nodeA}|${nodeB}` (sorted).
   */
  createChannel(channelId: string, participantIds: string[], config?: MessageBusConfig): void {
    if (this.channels.has(channelId)) return;
    this.channels.set(channelId, {
      id: channelId,
      participantIds: [...participantIds],
      maxRounds: config?.maxRounds ?? 5,
      turnBased: config?.turnBased ?? true,
      messages: [],
      currentRound: 1,
      roundHistory: new Map(),
    });
    log.info({ channelId, participantIds }, 'Message channel created');
  }

  /**
   * Send a message from one participant to another on a channel.
   */
  async send(senderId: string, channelId: string, content: string): Promise<Message> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }
    if (!channel.participantIds.includes(senderId)) {
      throw new Error(`Sender ${senderId} is not a participant of channel ${channelId}`);
    }

    // Determine recipients (everyone except the sender)
    const recipients = channel.participantIds.filter((id) => id !== senderId);

    const message: Message = {
      id: crypto.randomUUID(),
      channelId,
      fromNodeId: senderId,
      toNodeId: recipients[0] ?? senderId,
      content,
      round: channel.currentRound,
      timestamp: Date.now(),
    };

    channel.messages.push(message);

    // Track who has responded this round
    const roundSet = channel.roundHistory.get(channel.currentRound) ?? new Set();
    roundSet.add(senderId);
    channel.roundHistory.set(channel.currentRound, roundSet);

    // If all participants have responded this round, advance to next round
    if (
      roundSet.size >= channel.participantIds.length &&
      channel.currentRound < channel.maxRounds
    ) {
      channel.currentRound++;
    }

    log.info(
      { channelId, senderId, round: message.round, channelCurrentRound: channel.currentRound },
      'Message sent on channel',
    );

    // Resolve any waiting promises for the recipients
    for (const recipientId of recipients) {
      const key = `${channelId}:${recipientId}`;
      const resolvers = this.waitingResolvers.get(key);
      if (resolvers) {
        for (const resolve of resolvers) {
          resolve();
        }
        this.waitingResolvers.delete(key);
      }
    }

    return message;
  }

  /**
   * Get all messages addressed to a specific agent on a channel, optionally filtered by round.
   */
  receive(agentId: string, channelId: string, sinceRound?: number): Message[] {
    const channel = this.channels.get(channelId);
    if (!channel) return [];

    return channel.messages.filter(
      (m) => m.toNodeId === agentId && (sinceRound === undefined || m.round >= sinceRound),
    );
  }

  /**
   * Get all channels a node participates in.
   */
  getChannelsForNode(nodeId: string): string[] {
    const result: string[] = [];
    for (const [channelId, channel] of this.channels) {
      if (channel.participantIds.includes(nodeId)) {
        result.push(channelId);
      }
    }
    return result;
  }

  /**
   * Wait for new messages on a channel, with timeout.
   */
  async waitForMessages(agentId: string, channelId: string, timeoutMs = 30000): Promise<Message[]> {
    const key = `${channelId}:${agentId}`;
    const channel = this.channels.get(channelId);
    if (!channel) return [];

    return new Promise<Message[]>((resolve) => {
      const timeout = setTimeout(() => {
        const resolvers = this.waitingResolvers.get(key);
        if (resolvers) {
          const idx = resolvers.indexOf(resolveFn);
          if (idx !== -1) resolvers.splice(idx, 1);
        }
        resolve(this.receive(agentId, channelId));
      }, timeoutMs);

      const resolveFn = () => {
        clearTimeout(timeout);
        resolve(this.receive(agentId, channelId));
      };

      const existing = this.waitingResolvers.get(key) ?? [];
      existing.push(resolveFn);
      this.waitingResolvers.set(key, existing);
    });
  }

  /**
   * Get the full transcript of a channel.
   */
  getTranscript(channelId: string): Message[] {
    return this.channels.get(channelId)?.messages ?? [];
  }

  /**
   * Get current round for a channel.
   */
  getCurrentRound(channelId: string): number {
    return this.channels.get(channelId)?.currentRound ?? 0;
  }

  /**
   * Check if a channel has reached its max rounds.
   */
  isComplete(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return true;
    return channel.currentRound > channel.maxRounds;
  }

  /**
   * Clean up all channels.
   */
  destroy(): void {
    this.channels.clear();
    this.waitingResolvers.clear();
  }
}
