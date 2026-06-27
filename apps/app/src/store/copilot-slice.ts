import { StateCreator } from 'zustand';
import { StoreState, CopilotSlice, CopilotMessage } from './types.js';
import { getAccessToken, API_URL } from '../lib/api-client.js';

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

  updateProposalStatus: (messageIndex, status) => {
    set((state) => {
      const list = [...state.copilotMessages];
      const msg = list[messageIndex];
      if (msg && msg.role === 'assistant' && msg.proposal) {
        list[messageIndex] = {
          ...msg,
          proposal: {
            ...msg.proposal,
            status,
          },
        };
      }
      return { copilotMessages: list };
    });
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

      const token = getAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/api/copilot`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: text,
          canvasState,
          mode,
          model: copilotModel,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        updateLastAssistantMessage((msg) => ({
          ...msg,
          text: `Error calling copilot: ${errText || response.statusText}`,
        }));
        set({ isCopilotTyping: false });
        return;
      }

      if (!response.body) {
        updateLastAssistantMessage((msg) => ({
          ...msg,
          text: 'Error: No response body returned from server.',
        }));
        set({ isCopilotTyping: false });
        return;
      }

      const reader = response.body.getReader();
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
                let parsedActions = payload.actions;
                if (typeof parsedActions === 'string') {
                  try {
                    parsedActions = JSON.parse(parsedActions);
                  } catch (e) {
                    parsedActions = [];
                  }
                }
                updateLastAssistantMessage((msg) => ({
                  ...msg,
                  proposal: {
                    id: payload.id,
                    status: 'pending',
                    actions: parsedActions || [],
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
});
