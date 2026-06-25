import type { CanvasSnapshot } from './types.js';

const DRAFT_KEY = 'qwenweaver_autosave_draft';
const MAX_DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function saveDraft(snapshot: CanvasSnapshot): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

export function loadDraft(): CanvasSnapshot | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CanvasSnapshot;
    if (!parsed.nodes || !parsed.edges || !parsed.timestamp) return null;
    if (Date.now() - parsed.timestamp > MAX_DRAFT_AGE_MS) {
      clearDraft();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // silently fail
  }
}

export function hasDraft(): boolean {
  try {
    return localStorage.getItem(DRAFT_KEY) !== null;
  } catch {
    return false;
  }
}
