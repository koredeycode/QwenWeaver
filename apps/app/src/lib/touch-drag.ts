export let pendingTouchDrag: { type: string; data?: Record<string, unknown> } | null = null;

export function setPendingTouchDrag(type: string, data?: Record<string, unknown>) {
  pendingTouchDrag = { type, data };
}

export function clearPendingTouchDrag() {
  pendingTouchDrag = null;
}
