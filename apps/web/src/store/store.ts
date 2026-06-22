import { create } from 'zustand';
import { StoreState } from './types.js';
import { createAuthSlice } from './auth-slice.js';
import { createGraphSlice } from './graph-slice.js';
import { createExecutionSlice } from './execution-slice.js';
import { createCopilotSlice } from './copilot-slice.js';

// Combine all slice creators into a single unified Zustand hook
export const useStore = create<StoreState>((...a) => ({
  ...createAuthSlice(...a),
  ...createGraphSlice(...a),
  ...createExecutionSlice(...a),
  ...createCopilotSlice(...a),
}));
export type { StoreState };
