import { StateCreator } from 'zustand';
import type { StoreState, TourSlice } from './types.js';
import { tourConfig } from '../tour/tourConfig.js';

export const createTourSlice: StateCreator<StoreState, [], [], TourSlice> = (set, get) => ({
  isTourActive: false,
  currentStepIndex: 0,
  steps: tourConfig,

  startTour: () => set({ isTourActive: true, currentStepIndex: 0 }),

  nextStep: () => {
    const { currentStepIndex, steps, nodes, selectNode } = get();
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      set({ currentStepIndex: nextIndex });
      // Auto-select the first canvas node when entering the inspector step
      if (steps[nextIndex]?.id === 'inspector-panel' && nodes.length > 0) {
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
