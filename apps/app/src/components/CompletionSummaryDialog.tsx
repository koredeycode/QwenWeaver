import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/index.js';
import { X, CheckCircle2, Bot, Brain, Wrench } from 'lucide-react';
import { OutputRenderer } from './OutputRenderer.js';

export const CompletionSummaryDialog = () => {
  const executionStatus = useStore((s) => s.executionStatus);
  const activeExecutionId = useStore((s) => s.activeExecutionId);
  const nodes = useStore((s) => s.nodes);
  const nodeStatuses = useStore((s) => s.nodeStatuses);
  const nodeOutputs = useStore((s) => s.nodeOutputs);
  const nodeOutputUrls = useStore((s) => s.nodeOutputUrls);
  const nodeOutputParts = useStore((s) => s.nodeOutputParts);
  const nodeThinking = useStore((s) => s.nodeThinking);
  const metrics = useStore((s) => s.metrics);
  const workflowName = useStore((s) => s.workflowName);

  const [open, setOpen] = useState(false);
  const lastCompletedRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      executionStatus === 'completed' &&
      activeExecutionId &&
      activeExecutionId !== lastCompletedRef.current
    ) {
      setOpen(true);
      lastCompletedRef.current = activeExecutionId;
    }
  }, [executionStatus, activeExecutionId]);

  if (!open) return null;

  const executedNodes = nodes.filter((n) => nodeStatuses[n.id]);

  const nodeTypeIcon = (nodeId: string) => {
    if (nodeId.startsWith('supervisor')) return <Brain className="w-4 h-4 text-purple-600" />;
    if (nodeId.startsWith('mcp')) return <Wrench className="w-4 h-4 text-amber-600" />;
    return <Bot className="w-4 h-4 text-blue-600" />;
  };

  const formatNodeName = (nodeId: string) =>
    nodeId
      .replace(/^(agent|supervisor|mcp)_/, '')
      .replace(/-\d+$/, '')
      .replace(/-/g, ' ') || nodeId;

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white border-2 border-slate-900 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <header className="border-b-2 border-slate-900 px-6 py-4 flex items-center justify-between bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            <div>
              <h2 className="text-sm font-bold font-sans text-slate-900">Workflow Complete</h2>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                {workflowName || 'Untitled Workflow'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
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

        {/* Gallery */}
        <div className="flex-1 overflow-y-auto p-6">
          {executedNodes.length === 0 ? (
            <div className="py-12 text-center text-[10px] font-mono text-slate-400">
              No node outputs to display
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {executedNodes.map((node) => {
                const status = nodeStatuses[node.id] || 'pending';
                const outputParts = nodeOutputParts[node.id];
                const outputText = nodeOutputs[node.id];
                const outputUrl = nodeOutputUrls[node.id];
                const thinking = nodeThinking[node.id];
                return (
                  <div
                    key={node.id}
                    className="border border-slate-200 bg-white flex flex-col overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50">
                      {nodeTypeIcon(node.id)}
                      <span className="text-[10px] font-mono font-bold text-slate-700 truncate flex-1">
                        {formatNodeName(node.id)}
                      </span>
                      <span
                        className={`text-[8px] font-mono font-bold uppercase px-1 ${
                          status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : status === 'failed'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                    {/* Card Body */}
                    <div className="p-3 flex-1 overflow-y-auto max-h-64">
                      <OutputRenderer
                        outputParts={outputParts}
                        outputUrl={outputUrl}
                        streamingText={outputText}
                        thinkingText={thinking}
                        status={status}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 px-6 py-3 bg-slate-50 flex items-center justify-end flex-shrink-0">
          <button
            onClick={() => setOpen(false)}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono text-[10px] font-bold tracking-wide uppercase transition-colors cursor-pointer"
          >
            Back to Canvas
          </button>
        </footer>
      </div>
    </div>
  );
};
