import React, { useEffect } from 'react';
import { useStore } from '../store/index.js';
import { X, Bot, Brain, Wrench, CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react';
import { OutputRenderer } from './OutputRenderer.js';

export const OutputDialog = () => {
  const executionStatus = useStore((s) => s.executionStatus);
  const nodes = useStore((s) => s.nodes);
  const nodeStatuses = useStore((s) => s.nodeStatuses);
  const nodeOutputs = useStore((s) => s.nodeOutputs);
  const nodeOutputUrls = useStore((s) => s.nodeOutputUrls);
  const nodeOutputParts = useStore((s) => s.nodeOutputParts);
  const nodeThinking = useStore((s) => s.nodeThinking);
  const metrics = useStore((s) => s.metrics);
  const workflowName = useStore((s) => s.workflowName);
  const selectedOutputNodeId = useStore((s) => s.selectedOutputNodeId);
  const closeOutputDialog = useStore((s) => s.closeOutputDialog);
  const setSelectedOutputNode = useStore((s) => s.setSelectedOutputNode);

  const executedNodes = nodes.filter((n) => nodeStatuses[n.id]);

  useEffect(() => {
    if (!selectedOutputNodeId && executedNodes.length > 0) {
      const first =
        executedNodes.find((n) => nodeStatuses[n.id] === 'completed') || executedNodes[0];
      setSelectedOutputNode(first.id);
    }
  }, []);

  const nodeTypeIcon = (nodeId: string) => {
    if (nodeId.startsWith('supervisor')) return <Brain className="w-4 h-4 text-purple-600" />;
    if (nodeId.startsWith('mcp')) return <Wrench className="w-4 h-4 text-amber-600" />;
    return <Bot className="w-4 h-4 text-blue-600" />;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'failed':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />;
      case 'running':
        return <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />;
      default:
        return <div className="w-3.5 h-3.5 rounded-full bg-slate-300" />;
    }
  };

  const formatNodeName = (nodeId: string) =>
    nodeId
      .replace(/^(agent|supervisor|mcp)_/, '')
      .replace(/-\d+$/, '')
      .replace(/-/g, ' ') || nodeId;

  const selectedNode = executedNodes.find((n) => n.id === selectedOutputNodeId);
  const selectedStatus = selectedOutputNodeId ? nodeStatuses[selectedOutputNodeId] : undefined;
  const selectedOutputParts = selectedOutputNodeId
    ? nodeOutputParts[selectedOutputNodeId]
    : undefined;
  const selectedOutputText = selectedOutputNodeId ? nodeOutputs[selectedOutputNodeId] : undefined;
  const selectedOutputUrl = selectedOutputNodeId ? nodeOutputUrls[selectedOutputNodeId] : undefined;
  const selectedThinking = selectedOutputNodeId ? nodeThinking[selectedOutputNodeId] : undefined;

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white border-2 border-slate-900 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <header className="border-b-2 border-slate-900 px-6 py-4 flex items-center justify-between bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            <div>
              <h2 className="text-sm font-bold font-sans text-slate-900">Execution Output</h2>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                {workflowName || 'Untitled Workflow'}
              </p>
            </div>
          </div>
          <button
            onClick={closeOutputDialog}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Metrics Bar */}
        {metrics && (
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-6 text-[10px] font-mono">
            <div>
              <span className="text-slate-400">Tokens</span>
              <span className="ml-1.5 font-bold text-slate-800">
                {metrics.totalTokens?.toLocaleString() ?? 0}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Wall Time</span>
              <span className="ml-1.5 font-bold text-slate-800">
                {metrics.totalLatencyMs ? `${(metrics.totalLatencyMs / 1000).toFixed(1)}s` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Speedup</span>
              <span className="ml-1.5 font-bold text-slate-800">
                {metrics.speedupS ? `${metrics.speedupS}x` : '1x'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Parallel Efficiency</span>
              <span className="ml-1.5 font-bold text-slate-800">
                {metrics.parallelEfficiency ? `${metrics.parallelEfficiency}x` : '1x'}
              </span>
            </div>
          </div>
        )}

        {/* Body: Left panel + Right panel */}
        <div className="flex-1 flex min-h-0">
          {/* Left panel: Node list */}
          <div className="w-[240px] flex-shrink-0 border-r border-slate-200 overflow-y-auto bg-slate-50">
            {executedNodes.length === 0 ? (
              <div className="py-12 text-center text-[10px] font-mono text-slate-400">
                No node outputs
              </div>
            ) : (
              executedNodes.map((node) => {
                const status = nodeStatuses[node.id] || 'pending';
                const isSelected = node.id === selectedOutputNodeId;
                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedOutputNode(node.id)}
                    className={`w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors cursor-pointer border-b border-slate-100 ${
                      isSelected
                        ? 'bg-blue-50 border-l-2 border-l-blue-500'
                        : 'hover:bg-slate-100 border-l-2 border-l-transparent'
                    }`}
                  >
                    {nodeTypeIcon(node.id)}
                    <span
                      className={`text-[10px] font-mono font-semibold truncate flex-1 ${
                        isSelected ? 'text-blue-800' : 'text-slate-700'
                      }`}
                    >
                      {formatNodeName(node.id)}
                    </span>
                    <span
                      className={`text-[8px] font-mono font-bold uppercase px-1 flex-shrink-0 ${
                        status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : status === 'failed'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {status}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Right panel: Selected node output */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedNode && selectedOutputNodeId ? (
              <div>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  {nodeTypeIcon(selectedOutputNodeId)}
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {formatNodeName(selectedOutputNodeId)}
                  </span>
                  <span
                    className={`text-[8px] font-mono font-bold uppercase px-1 ${
                      selectedStatus === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : selectedStatus === 'failed'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {selectedStatus}
                  </span>
                </div>
                <OutputRenderer
                  outputParts={selectedOutputParts}
                  outputUrl={selectedOutputUrl}
                  streamingText={selectedOutputText}
                  thinkingText={selectedThinking}
                  status={selectedStatus || 'pending'}
                />
              </div>
            ) : (
              <div className="py-12 text-center text-[10px] font-mono text-slate-400">
                Select a node from the list to view its output
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 px-6 py-3 bg-slate-50 flex items-center justify-end flex-shrink-0">
          <button
            onClick={closeOutputDialog}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono text-[10px] font-bold tracking-wide uppercase transition-colors cursor-pointer"
          >
            Back to Canvas
          </button>
        </footer>
      </div>
    </div>
  );
};
