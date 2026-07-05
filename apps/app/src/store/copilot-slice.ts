import { StateCreator } from 'zustand';
import { StoreState, CopilotSlice, CopilotMessage } from './types.js';
import { API_BASE, client } from '../lib/api-client.js';
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

    const workflowId = get().workflowId;
    if (workflowId && msg.proposal.id) {
      try {
        await client.api.copilot.proposal.$put({
          json: { workflowId, proposalId: msg.proposal.id, status },
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
      const { nodes, edges, workflowName, workflowDescription, workflowId, copilotModel } = get();

      const canvasState = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: {
            label: n.data?.label,
            workerType: n.data?.workerType,
            model: n.data?.model,
            outputFormat: n.data?.outputFormat,
            mcpServerUrl: n.data?.mcpServerUrl,
            mcpServerId: n.data?.mcpServerId,
            enableThinking: n.data?.enableThinking,
            systemPrompt: n.data?.systemPrompt,
            debateArenaConfig: n.data?.debateArenaConfig,
            iconUrl: n.data?.iconUrl,
          },
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? undefined,
          targetHandle: e.targetHandle ?? undefined,
          type: e.type,
        })),
      };

      const mode = text.toLowerCase().includes('explain')
        ? 'explain'
        : nodes.length > 0
          ? 'modify'
          : 'generate';

      // Step 1: POST to create a session
      const initRes = await fetch(`${API_BASE}/api/copilot/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt: text,
          canvasState,
          workflowName: workflowName || undefined,
          workflowDescription: workflowDescription || undefined,
          mode,
          model: copilotModel,
          workflowId: workflowId || undefined,
        }),
      });

      if (!initRes.ok) {
        const errText = await initRes.text();
        updateLastAssistantMessage((msg) => ({
          ...msg,
          text: `Failed: ${errText || initRes.statusText}`,
        }));
        return;
      }

      const { sessionId } = await initRes.json();
      if (!sessionId) {
        updateLastAssistantMessage((msg) => ({
          ...msg,
          text: 'Failed: no session ID returned',
        }));
        return;
      }

      // Step 2: Open EventSource for SSE streaming (relative URL — same origin via Vite proxy)
      const eventSourceUrl = `/api/copilot/stream/${sessionId}`;
      const eventSource = new EventSource(eventSourceUrl);

      await new Promise<void>((resolve, reject) => {
        let _aborted = false;

        eventSource.addEventListener('thinking', (e: MessageEvent) => {
          try {
            const { chunk } = JSON.parse(e.data);
            if (chunk) {
              updateLastAssistantMessage((msg) => ({
                ...msg,
                thinking: (msg.thinking || '') + chunk,
              }));
            }
          } catch {
            /* ignore malformed event */
          }
        });

        eventSource.addEventListener('token', (e: MessageEvent) => {
          try {
            const { chunk } = JSON.parse(e.data);
            if (chunk) {
              updateLastAssistantMessage((msg) => {
                if (msg.proposal) {
                  return { ...msg, textAfterProposal: (msg.textAfterProposal || '') + chunk };
                }
                return { ...msg, text: (msg.text || '') + chunk };
              });
            }
          } catch {
            /* ignore malformed event */
          }
        });

        eventSource.addEventListener('proposal', (e: MessageEvent) => {
          try {
            const payload = JSON.parse(e.data);
            const rawActions =
              typeof payload.actions === 'string' ? JSON.parse(payload.actions) : payload.actions;
            const actions = Array.isArray(rawActions)
              ? rawActions
              : rawActions && typeof rawActions === 'object' && typeof rawActions.type === 'string'
                ? [rawActions]
                : rawActions && typeof rawActions === 'object' && Array.isArray(rawActions.actions)
                  ? rawActions.actions
                  : [];
            updateLastAssistantMessage((msg) => ({
              ...msg,
              proposal: { id: payload.id, status: 'pending', actions },
            }));
          } catch {
            /* ignore */
          }
        });

        eventSource.addEventListener('complete', () => {
          eventSource.close();
          _aborted = true;
          resolve();
        });

        eventSource.addEventListener('error', (e: Event) => {
          // EventSource fires error on close or connection failure.
          // If the stream ended cleanly, complete event resolves first.
          if (!_aborted) {
            eventSource.close();
            _aborted = true;
            resolve();
          }
        });

        // Safety timeout — force close after 5 minutes
        setTimeout(() => {
          if (!_aborted) {
            eventSource.close();
            _aborted = true;
            resolve();
          }
        }, 300_000);
      });
    } catch (err) {
      console.error('Copilot connection error:', err);
      set((state) => {
        const list = [...state.copilotMessages];
        if (list.length > 0) {
          const idx = list.length - 1;
          if (list[idx].role === 'assistant') {
            list[idx] = {
              ...list[idx],
              text: `Connection error: ${(err as Error).message}`,
            };
          }
        }
        return { copilotMessages: list };
      });
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
      textAfterProposal: msg.textAfterProposal || '',
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
    const hasGreeting =
      mapped.length > 0 &&
      mapped[0].role === 'assistant' &&
      mapped[0].text?.includes('Visual Architect Copilot');
    set({ copilotMessages: hasGreeting ? mapped : [defaultMsg, ...mapped] });
  },
});
