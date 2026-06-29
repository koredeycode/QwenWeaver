import { StateCreator } from 'zustand';
import { StoreState, CopilotSlice, CopilotMessage } from './types.js';
import { client, getAccessToken } from '../lib/api-client.js';
import type { CopilotHistoryMessage } from '@qwenweaver/types';

export const createCopilotSlice: StateCreator<StoreState, [], [], CopilotSlice> = (set, get) => ({
  copilotMessages: [
    {
      role: 'assistant',
      text: 'Hi! I am the Visual Architect Copilot. I can help configure your workflow or generate complex multi-agent workflows. Try typing "generate search workflow" or asking questions.',
      thinking: '',
    },
  ],
  isCopilotTyping: false,
  copilotModel: 'qwen3.7-max',

  setCopilotModel: (model) => set({ copilotModel: model }),

  updateProposalStatus: async (messageIndex, status) => {
    const list = [...get().copilotMessages];
    const msg = list[messageIndex];
    if (!msg || msg.role !== 'assistant' || !msg.proposal) return;

    // 1. Update local Zustand state
    set((state) => {
      const newList = [...state.copilotMessages];
      const target = newList[messageIndex];
      if (target && target.role === 'assistant' && target.proposal) {
        newList[messageIndex] = {
          ...target,
          proposal: {
            ...target.proposal,
            status,
          },
        };
      }
      return { copilotMessages: newList };
    });

    // 2. Persist to backend database
    const workflowId = get().workflowId;
    if (workflowId && msg.proposal.id) {
      try {
        await client.api.copilot.proposal.$put({
          json: {
            workflowId,
            proposalId: msg.proposal.id,
            status,
          },
        });
      } catch (err) {
        console.error('Failed to persist proposal status update:', err);
      }
    }
  },

  sendCopilotMessage: async (text) => {
    const userMsg = { role: 'user' as const, text };
    const assistantMsg = { role: 'assistant' as const, text: '', thinking: '' };

    set((state) => ({
      copilotMessages: [...state.copilotMessages, userMsg, assistantMsg],
      isCopilotTyping: true,
    }));

    const updateLastAssistantMessage = (updater: (msg: CopilotMessage) => CopilotMessage) => {
      set((state) => {
        const list = [...state.copilotMessages];
        if (list.length > 0) {
          const idx = list.length - 1;
          if (list[idx].role === 'assistant') {
            list[idx] = updater(list[idx]);
          }
        }
        return { copilotMessages: list };
      });
    };

    try {
      const nodes = get().nodes;
      const edges = get().edges;
      const copilotModel = get().copilotModel;

      const canvasState = {
        nodes: nodes.map((n) => ({ id: n.id, type: n.type, data: n.data })),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      };

      const mode = text.toLowerCase().includes('explain')
        ? 'explain'
        : nodes.length > 0
          ? 'modify'
          : 'generate';

      const token = await getAccessToken();
      const workflowId = get().workflowId;

      const response = await client.api.copilot.$post({
        json: {
          prompt: text,
          canvasState,
          mode: mode as any,
          model: copilotModel,
          workflowId: workflowId || undefined,
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        updateLastAssistantMessage((msg) => ({
          ...msg,
          text: `Failed: ${errText || response.statusText}`,
        }));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        updateLastAssistantMessage((msg) => ({
          ...msg,
          text: 'No response body stream received',
        }));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || ''; // Hold onto incomplete last block

        for (const block of blocks) {
          if (!block.trim()) continue;

          let eventName = '';
          let dataStr = '';
          const lines = block.split('\n');

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataStr = line.slice(5).trim();
            }
          }

          if (dataStr) {
            try {
              const payload = JSON.parse(dataStr);
              if (eventName === 'thinking') {
                updateLastAssistantMessage((msg) => ({
                  ...msg,
                  thinking: (msg.thinking || '') + payload.chunk,
                }));
              } else if (eventName === 'token') {
                updateLastAssistantMessage((msg) => ({
                  ...msg,
                  text: (msg.text || '') + payload.chunk,
                }));
              } else if (eventName === 'proposal') {
                const rawActions = payload.actions;
                const actions = Array.isArray(rawActions)
                  ? rawActions
                  : rawActions &&
                      typeof rawActions === 'object' &&
                      typeof rawActions.type === 'string'
                    ? [rawActions]
                    : rawActions &&
                        typeof rawActions === 'object' &&
                        Array.isArray(rawActions.actions)
                      ? rawActions.actions
                      : [];
                updateLastAssistantMessage((msg) => ({
                  ...msg,
                  proposal: {
                    id: payload.id,
                    status: 'pending',
                    actions,
                  },
                }));
              } else if (eventName === 'error') {
                updateLastAssistantMessage((msg) => ({
                  ...msg,
                  text: (msg.text || '') + `\n\n[Error: ${payload.error || 'Unknown error'}]`,
                }));
              }
            } catch (err) {
              console.error('Failed to parse SSE chunk JSON:', err);
            }
          }
        }
      }
    } catch (err) {
      console.error('Copilot connection error:', err);
      updateLastAssistantMessage((msg) => ({
        ...msg,
        text: `Connection error: ${(err as Error).message}`,
      }));
    } finally {
      set({ isCopilotTyping: false });
    }
  },

  loadCopilotHistory: (history: CopilotHistoryMessage[]) => {
    const defaultMsg: CopilotMessage = {
      role: 'assistant',
      text: 'Hi! I am the Visual Architect Copilot. I can help configure your workflow or generate complex multi-agent workflows. Try typing "generate search workflow" or asking questions.',
      thinking: '',
    };
    if (!history || history.length === 0) {
      set({ copilotMessages: [defaultMsg] });
      return;
    }

    const mapped = history.map((msg: any) => ({
      role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
      text: msg.content,
      thinking: msg.thinking || '',
      proposal: msg.proposal
        ? {
            id: msg.proposal.id,
            status: msg.proposal.status || 'pending',
            actions: Array.isArray(msg.proposal.actions)
              ? msg.proposal.actions
              : msg.proposal.actions &&
                  typeof msg.proposal.actions === 'object' &&
                  typeof msg.proposal.actions.type === 'string'
                ? [msg.proposal.actions]
                : msg.proposal.actions &&
                    typeof msg.proposal.actions === 'object' &&
                    Array.isArray(msg.proposal.actions.actions)
                  ? msg.proposal.actions.actions
                  : [],
          }
        : undefined,
    }));
    set({ copilotMessages: [defaultMsg, ...mapped] });
  },
});
