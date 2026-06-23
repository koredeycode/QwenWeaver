import { SpotlightBox } from './types.js';

/**
 * Mock helper: returns a SpotlightBox for a canvas node by ID.
 *
 * In the real integration this will be wired into the React Flow / Zustand
 * canvas state engine:
 *
 *   1. Read the node's absolute position and dimensions from the store:
 *        const node = useStore.getState().nodes.find(n => n.id === nodeId);
 *   2. Read the current viewport transform:
 *        const [x, y, zoom] = useStore.getState().transform;
 *   3. Multiply the node position by the zoom level and add the pan offset
 *      to convert from canvas-space to screen-space coordinates:
 *        const screenX = node.position.x * zoom + x;
 *        const screenY = node.position.y * zoom + y;
 *   4. Return the resulting SpotlightBox with the node's scaled dimensions:
 *        return { x: screenX, y: screenY, width: node.width * zoom, height: node.height * zoom };
 *
 * For now we return a fixed placeholder box so the tour works without a live
 * canvas state.
 */
export function getCanvasNodeScreenCoords(nodeId: string): SpotlightBox | null {
  const nodePositions: Record<string, { x: number; y: number }> = {
    agent_node_1: { x: 360, y: 180 },
    agent_node_2: { x: 600, y: 400 },
    trigger_node_1: { x: 360, y: 40 },
  };

  const pos = nodePositions[nodeId];
  if (!pos) return null;

  return {
    x: pos.x,
    y: pos.y,
    width: 220,
    height: 110,
  };
}
