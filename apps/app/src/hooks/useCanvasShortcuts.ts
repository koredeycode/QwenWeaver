import { useEffect } from 'react';
import type { ReactFlowInstance } from '@xyflow/react';
import { useStore } from '../store/index.js';

export interface UseCanvasShortcutsParams {
  status: string;
  nodesLength: number;
  runWorkflow: () => void;
  rearrangeGraph: () => void;
  selectNode: (id: string | null) => void;
  duplicateNode: (id: string) => void;
  maximizedNodeId: string | null;
  setMaximizedNodeId: (id: string | null) => void;
  setIsLocked: (fn: (prev: boolean) => boolean | boolean) => void;
  setIsClearConfirmOpen: (v: boolean) => void;
  reactFlowInstance: ReactFlowInstance;
}

export function useCanvasShortcuts({
  status,
  nodesLength,
  runWorkflow,
  rearrangeGraph,
  selectNode,
  duplicateNode,
  maximizedNodeId,
  setMaximizedNodeId,
  setIsLocked,
  setIsClearConfirmOpen,
  reactFlowInstance,
}: UseCanvasShortcutsParams): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInput) return;

      // 1. Run Workflow: Ctrl + Enter or Cmd + Enter
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (status !== 'running' && nodesLength > 0) {
          runWorkflow();
        }
      }

      // 2. Rearrange Layout or Toggle Lock: Ctrl + L / Ctrl + Shift + L
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        if (event.shiftKey) {
          setIsLocked((prev) => !prev);
        } else {
          rearrangeGraph();
          setTimeout(() => reactFlowInstance.fitView({ duration: 200 }), 50);
        }
      }

      // 3. Zoom In: Ctrl + =
      if ((event.ctrlKey || event.metaKey) && (event.key === '=' || event.key === '+')) {
        event.preventDefault();
        reactFlowInstance.zoomIn();
      }

      // 4. Zoom Out: Ctrl + -
      if ((event.ctrlKey || event.metaKey) && event.key === '-') {
        event.preventDefault();
        reactFlowInstance.zoomOut();
      }

      // 5. Clear Canvas: Ctrl + Alt + C
      if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        setIsClearConfirmOpen(true);
      }

      // 6. Close Maximized Node or Deselect Node: Escape
      if (event.key === 'Escape') {
        event.preventDefault();
        if (maximizedNodeId) {
          setMaximizedNodeId(null);
        } else {
          selectNode(null);
        }
      }

      // 7. Duplicate selected node: Ctrl + D
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        const selectedId = useStore.getState().selectedNodeId;
        if (selectedId) {
          duplicateNode(selectedId);
        }
      }

      // 8. Undo: Ctrl + Z
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        useStore.getState().undo();
      }

      // 9. Redo: Ctrl + Shift + Z or Ctrl + Y
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))
      ) {
        event.preventDefault();
        useStore.getState().redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    status,
    nodesLength,
    runWorkflow,
    rearrangeGraph,
    selectNode,
    duplicateNode,
    reactFlowInstance,
    maximizedNodeId,
    setMaximizedNodeId,
    setIsLocked,
    setIsClearConfirmOpen,
  ]);
}
