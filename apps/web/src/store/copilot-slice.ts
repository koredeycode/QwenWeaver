import { StateCreator } from 'zustand';
import { StoreState, CopilotSlice } from './types.js';

export const createCopilotSlice: StateCreator<StoreState, [], [], CopilotSlice> = (set, get) => ({
  copilotMessages: [
    { role: 'assistant', text: 'Hi! I am the Qwen3-Max Visual Architect Copilot. I can help configure your workflow or generate complex multi-agent swarms. Try typing "generate search swarm" or "clear canvas".' }
  ],
  isCopilotTyping: false,

  sendCopilotMessage: async (text) => {
    const newMsg = { role: 'user' as const, text };
    set((state) => ({ 
      copilotMessages: [...state.copilotMessages, newMsg],
      isCopilotTyping: true
    }));

    setTimeout(() => {
      let reply = '';
      const promptLower = text.toLowerCase();

      if (promptLower.includes('generate') || promptLower.includes('swarm') || promptLower.includes('build')) {
        get().loadTemplate('research');
        reply = 'Generated a standard **Research Swarm** template on your canvas! It connects a Trigger to two parallel scraper agents ("Academic Searcher" & "Patent Scanner"), which then aggregate outputs into a "Consensus Supervisor" that uses Qwen3-Max logic gates. Finally, it formats the result and pushes it to GitHub via MCP tool connection.';
      } else if (promptLower.includes('clear') || promptLower.includes('empty')) {
        get().clearGraph();
        reply = 'Canvas cleared. You can start fresh or drag and drop items from the Left Component Palette.';
      } else if (promptLower.includes('model') || promptLower.includes('qwen')) {
        reply = 'We support Alibaba Cloud Qwen models: `qwen-turbo` (fast, efficient Workers) and `qwen3-max` (highly logical Supervisor nodes with thinking budgets enabled).';
      } else if (promptLower.includes('mcp')) {
        reply = 'Model Context Protocol (MCP) servers allow Qwen agents to execute local commands, write to file systems, scan databases, or fetch internet urls. Simply connect an MCP tool node to your agent.';
      } else {
        reply = `I've received your request: "${text}". \n\nAs the QwenWeaver Copilot, I can help you structure multi-agent flows. If you want to instantiate this flow, type "build research swarm" to load a pre-configured architecture.`;
      }

      set((state) => ({
        copilotMessages: [...state.copilotMessages, { role: 'assistant', text: reply }],
        isCopilotTyping: false
      }));
    }, 1200);
  }
});
