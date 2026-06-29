export function handleDragStart(
  event: React.DragEvent,
  nodeType: string,
  nodeData?: Record<string, unknown>,
) {
  event.dataTransfer.setData('application/reactflow', nodeType);
  if (nodeData) {
    event.dataTransfer.setData('application/qwenweaver-node-data', JSON.stringify(nodeData));
  }
  event.dataTransfer.effectAllowed = 'move';
}
