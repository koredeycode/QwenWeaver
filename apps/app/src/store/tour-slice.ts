import { StateCreator } from 'zustand';
import type { StoreState, TourSlice } from './types.js';
import { tourConfig } from '../tour/tourConfig.js';

export const createTourSlice: StateCreator<StoreState, [], [], TourSlice> = (set, get) => ({
  isTourActive: false,
  currentStepIndex: 0,
  steps: tourConfig,

  startTour: () => {
    const { nodes, addNode } = get();
    // Place a sample agent so step 3 has something to highlight
    if (nodes.length === 0) {
      addNode('agent', { x: 300, y: 150 });
    }
    set({ isTourActive: true, currentStepIndex: 0 });
  },

  nextStep: () => {
    const { currentStepIndex, steps, nodes, selectNode } = get();
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      set({ currentStepIndex: nextIndex });
      const step = steps[nextIndex];
      if (!step) return;
      // Auto-select the first node when entering canvas-node or inspector step
      if ((step.id === 'canvas-node' || step.id === 'inspector-panel') && nodes.length > 0) {
        selectNode(nodes[0].id);
      }
    }
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },

  endTour: () => set({ isTourActive: false, currentStepIndex: 0 }),
});
