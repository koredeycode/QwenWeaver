import { create } from 'zustand';
import type { StoreState } from './types.js';
import { createAuthSlice } from './auth-slice.js';
import { createGraphSlice } from './graph-slice.js';
import { createExecutionSlice } from './execution-slice.js';
import { createCopilotSlice } from './copilot-slice.js';
import { createTemplateSlice } from './templates-slice.js';
import { createTourSlice } from './tour-slice.js';
import { createHistorySlice } from './history-slice.js';

function buildStore() {
  return create<StoreState>()((...a) => ({
    ...createAuthSlice(...a),
    ...createGraphSlice(...a),
    ...createExecutionSlice(...a),
    ...createCopilotSlice(...a),
    ...createTemplateSlice(...a),
    ...createTourSlice(...a),
    ...createHistorySlice(...a),
  }));
}

// Persist store instance across Vite HMR so components don't lose subscriptions
let _store: ReturnType<typeof buildStore>;
if (import.meta.hot) {
  _store = (import.meta.hot as any).data._qwenweaverStore ?? buildStore();
  (import.meta.hot as any).data._qwenweaverStore = _store;
} else {
  _store = buildStore();
}
export const useStore = _store;
export type { StoreState };
