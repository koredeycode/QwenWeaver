import { useEffect } from 'react';
import { useStore } from '../store/index.js';
import { client } from '../lib/api-client.js';
import { EXAMPLE_WORKFLOWS } from '../lib/example-workflows.js';

export function useWorkflowLoader(id: string | undefined): void {
  const loadWorkflow = useStore((s) => s.loadWorkflow);
  const clearGraph = useStore((s) => s.clearGraph);
  const setWorkflowMeta = useStore((s) => s.setWorkflowMeta);
  const rearrangeGraph = useStore((s) => s.rearrangeGraph);

  useEffect(() => {
    if (id) {
      if (id === 'unsaved') return;

      const isMock = EXAMPLE_WORKFLOWS.some((w) => w.id === id);
      if (isMock) {
        loadWorkflow(id);
      } else {
        // Check for forked workflow data in localStorage
        const forkedRaw = localStorage.getItem(`forked_wf_${id}`);
        if (forkedRaw) {
          try {
            const { workflowData, name } = JSON.parse(forkedRaw);
            if (workflowData?.nodes && workflowData?.edges) {
              const store = useStore.getState();
              store.clearGraph();
              store.setWorkflowMeta(name || '', '');
              useStore.setState({
                nodes: workflowData.nodes as any,
                edges: workflowData.edges as any,
                selectedNodeId: null,
                maximizedNodeId: null,
              });
              store.rearrangeGraph();
              localStorage.removeItem(`forked_wf_${id}`);
              return;
            }
          } catch {
            /* ignore invalid JSON */
          }
        }

        // Try to load from API (saved workflow from the server)
        (async () => {
          try {
            const res = await client.api.workflow.detail[':workflowId'].$get({
              param: { workflowId: id },
            });
            const wf = res.ok ? await res.json() : null;
            if (!wf || !wf.nodesEdges || !wf.nodesEdges.nodes) {
              clearGraph();
              const pendingRaw = sessionStorage.getItem(`pending_wf_${id}`);
              if (pendingRaw) {
                try {
                  const { name, description } = JSON.parse(pendingRaw);
                  setWorkflowMeta(name, description || '');
                } catch {
                  /* ignore invalid JSON */
                }
              }
              return;
            }
            useStore.setState({
              nodes: wf.nodesEdges.nodes.map((n: any) => ({
                id: n.id,
                type: n.type,
                position: n.position,
                data: n.data,
              })),
              edges: wf.nodesEdges.edges.map((e: any) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle: e.sourceHandle ?? undefined,
                targetHandle: e.targetHandle ?? undefined,
                type: 'animated',
              })),
              selectedNodeId: null,
              maximizedNodeId: null,
              workflowId: wf.id,
              workflowName: wf.name,
              workflowDescription: wf.description ?? '',
            });
            if (wf.copilotHistory && wf.copilotHistory.length > 0) {
              useStore.getState().loadCopilotHistory(wf.copilotHistory);
            }
          } catch {
            clearGraph();
            const pendingRaw = sessionStorage.getItem(`pending_wf_${id}`);
            if (pendingRaw) {
              try {
                const { name, description } = JSON.parse(pendingRaw);
                setWorkflowMeta(name, description || '');
              } catch {
                /* ignore invalid JSON */
              }
            }
          }
        })();
      }
    }
  }, [id, loadWorkflow, clearGraph, setWorkflowMeta, rearrangeGraph]);
}
