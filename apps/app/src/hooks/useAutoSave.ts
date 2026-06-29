import { useEffect, useState } from 'react';
import { useStore } from '../store/index.js';
import { client } from '../lib/api-client.js';
import { saveDraft, loadDraft, clearDraft } from '../store/auto-save.js';
import { toast } from 'sonner';
import type { NavigateFunction } from 'react-router-dom';

export function useAutoSave(id: string | undefined, navigate: NavigateFunction) {
  const [isSaving, setIsSaving] = useState(false);

  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const workflowName = useStore((s) => s.workflowName);
  const workflowDescription = useStore((s) => s.workflowDescription);
  const workflowId = useStore((s) => s.workflowId);
  const status = useStore((s) => s.executionStatus);
  const isDirty = useStore((s) => s.isDirty);
  const markClean = useStore((s) => s.markClean);

  // Debounced auto-save to local draft + backend
  useEffect(() => {
    if (status === 'running') return;
    const timer = setTimeout(async () => {
      const state = useStore.getState();
      saveDraft({
        nodes: state.nodes,
        edges: state.edges,
        workflowName: state.workflowName,
        workflowDescription: state.workflowDescription,
        timestamp: Date.now(),
        workflowId: state.workflowId,
      });

      // Also persist to backend if user is authenticated and has nodes
      if (state.user && state.nodes.length > 0) {
        setIsSaving(true);
        const payload = {
          name: state.workflowName || 'Untitled Workflow',
          description: state.workflowDescription || '',
          nodes: state.nodes.map((n: any) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: n.data,
          })),
          edges: state.edges.map((e: any) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle ?? undefined,
            targetHandle: e.targetHandle ?? undefined,
            type: e.type,
          })),
        };

        if (state.workflowId) {
          (client.api.workflow.detail[':workflowId'] as any)
            .$put({
              param: { workflowId: state.workflowId! },
              json: { ...payload, id: state.workflowId } as any,
            })
            .then(() => {
              setIsSaving(false);
              markClean();
              clearDraft();
            })
            .catch((err: unknown) => {
              setIsSaving(false);
              console.warn('Auto-save to backend failed:', err);
            });
        } else {
          (client.api.workflow.$post({ json: payload as any }) as Promise<any>)
            .then(async (res: any) => {
              if (!res.ok) throw new Error('Failed to auto-create workflow');
              const data = await res.json();
              useStore.setState({
                workflowId: data.workflowId,
                isDirty: false,
              });
              clearDraft();
              setIsSaving(false);
              navigate(`/workflows/${data.workflowId}`, { replace: true });
            })
            .catch((err: unknown) => {
              setIsSaving(false);
              console.warn('Auto-create to backend failed:', err);
            });
        }
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [nodes, edges, workflowName, workflowDescription, status, navigate, markClean]);

  // Draft restoration on mount
  useEffect(() => {
    const draft = loadDraft();
    const currentId = id === 'unsaved' ? null : id || null;
    if (draft && (draft.workflowId || null) === currentId) {
      const timer = setTimeout(() => {
        toast('Unsaved draft found. Restore?', {
          duration: Infinity,
          action: {
            label: 'Restore',
            onClick: () => {
              useStore
                .getState()
                .loadUnsavedWorkflow(
                  draft.nodes,
                  draft.edges,
                  draft.workflowName,
                  draft.workflowDescription,
                );
              toast.success('Draft restored.');
            },
          },
          cancel: {
            label: 'Dismiss',
            onClick: () => clearDraft(),
          },
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Warn before closing with unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  return { isSaving };
}
