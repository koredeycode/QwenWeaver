import React, { useEffect, useState } from 'react';
import {
  History,
  X,
  Bot,
  Brain,
  Play,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Clock,
  Wrench,
} from 'lucide-react';
import { useStore } from '../store/index.js';
import { client } from '../lib/api-client.js';
import type { ExecutionSummary } from '../store/types.js';
import { OutputRenderer } from './OutputRenderer.js';

interface AgentLogEntry {
  id: string;
  executionId: string;
  nodeId: string;
  status: string;
  input?: any;
  output?: any;
  tokensUsed?: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

const CollapsibleSection = ({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 bg-slate-50/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-left font-mono text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer select-none"
      >
        <span>{title}</span>
        <span>{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="p-3 bg-white font-mono text-[10px] text-slate-800 whitespace-pre-wrap select-text leading-normal overflow-x-auto max-h-48 border-t border-slate-200">
          {children}
        </div>
      )}
    </div>
  );
};

export const ExecutionHistoryPanel = ({ onClose }: { onClose: () => void }) => {
  const executionHistory = useStore((s) => s.executionHistory);
  const historyLoading = useStore((s) => s.historyLoading);
  const fetchExecutionHistory = useStore((s) => s.fetchExecutionHistory);
  const loadExecutionIntoCanvas = useStore((s) => s.loadExecutionIntoCanvas);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionSummary | null>(null);
  const [agentLogs, setAgentLogs] = useState<AgentLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    fetchExecutionHistory();
  }, [fetchExecutionHistory]);

  const handleSelectExecution = async (exec: ExecutionSummary) => {
    if (selectedExecution?.id === exec.id) {
      setSelectedExecution(null);
      setAgentLogs([]);
      setExpandedLogId(null);
      return;
    }
    setSelectedExecution(exec);
    setExpandedLogId(null);
    setLogsLoading(true);
    try {
      const res = await client.api.execution[':executionId'].logs.$get({
        param: { executionId: exec.id },
      });
      if (!res.ok) {
        setAgentLogs([]);
        return;
      }
      const data = (await res.json()) as any;
      setAgentLogs(data.logs || []);
    } catch {
      setAgentLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      default:
        return <Play className="w-4 h-4 text-slate-400" />;
    }
  };

  const nodeTypeIcon = (nodeId: string) => {
    if (nodeId.startsWith('supervisor')) return <Brain className="w-3 h-3 text-purple-500" />;
    if (nodeId.startsWith('mcp')) return <Wrench className="w-3 h-3 text-amber-500" />;
    return <Bot className="w-3 h-3 text-blue-500" />;
  };

  const formatNodeName = (nodeId: string) =>
    nodeId
      .replace(/^(agent|supervisor|mcp)_/, '')
      .replace(/-\d+$/, '')
      .replace(/-/g, ' ') || nodeId;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex justify-end">
      <div className="w-[480px] h-full bg-white shadow-xl flex flex-col select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900 font-mono">Execution History</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {historyLoading && executionHistory.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-xs font-mono">Loading...</span>
            </div>
          ) : executionHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <History className="w-10 h-10 mb-3 text-slate-300" />
              <p className="text-xs font-mono font-bold">No executions yet</p>
              <p className="text-[10px] font-mono mt-1">Run this workflow to see it here</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {executionHistory.map((exec) => (
                <div key={exec.id}>
                  <button
                    onClick={() => handleSelectExecution(exec)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer hover:bg-slate-50 ${
                      selectedExecution?.id === exec.id ? 'bg-blue-55' : ''
                    }`}
                  >
                    <div className="mt-0.5">{statusIcon(exec.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-slate-800 truncate">
                          {exec.workflowName || 'Untitled Workflow'}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-bold uppercase px-1 ${
                            exec.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : exec.status === 'failed'
                                ? 'bg-rose-100 text-rose-700'
                                : exec.status === 'running'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {exec.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-mono text-slate-400">
                          {formatTime(exec.startedAt)}
                        </span>
                        {exec.metrics?.totalTokens != null && (
                          <>
                            <span className="text-[10px] text-slate-300">|</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {exec.metrics.totalTokens} tokens
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded agent logs — inline outputs, no drill-down modal */}
                  {selectedExecution?.id === exec.id && (
                    <div className="bg-slate-50 border-t border-slate-100">
                      {/* View in Canvas button */}
                      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                        <button
                          onClick={() => {
                            loadExecutionIntoCanvas(exec.id);
                            onClose();
                          }}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] font-mono tracking-wide uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          View in Canvas
                        </button>
                      </div>
                      {logsLoading ? (
                        <div className="flex items-center justify-center py-6 text-slate-400">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          <span className="text-[10px] font-mono">Loading logs...</span>
                        </div>
                      ) : agentLogs.length === 0 ? (
                        <div className="py-4 text-center text-[10px] font-mono text-slate-400">
                          No agent logs available
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {agentLogs.map((log) => {
                            const isExpanded = expandedLogId === log.id;
                            const outputParts = log.output?.outputs;
                            return (
                              <div key={log.id}>
                                {/* Log header — click to toggle inline details */}
                                <button
                                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                  className="w-full px-4 py-2.5 hover:bg-slate-150 transition-colors cursor-pointer flex flex-col text-left"
                                >
                                  <div className="flex items-center gap-1.5 mb-1">
                                    {nodeTypeIcon(log.nodeId)}
                                    <span className="text-[10px] font-mono font-bold text-slate-600 truncate">
                                      {formatNodeName(log.nodeId)}
                                    </span>
                                    <span
                                      className={`text-[8px] font-mono font-bold uppercase px-1 ${
                                        log.status === 'completed'
                                          ? 'bg-emerald-100 text-emerald-600'
                                          : log.status === 'failed'
                                            ? 'bg-rose-100 text-rose-600'
                                            : 'bg-slate-100 text-slate-500'
                                      }`}
                                    >
                                      {log.status}
                                    </span>
                                    {log.tokensUsed != null && (
                                      <span className="text-[8px] font-mono text-slate-400 ml-1.5">
                                        {log.tokensUsed} tokens
                                      </span>
                                    )}
                                    <span className="text-[8px] font-mono font-bold text-blue-600 hover:underline ml-auto">
                                      {isExpanded ? 'Collapse ▲' : 'Expand ▼'}
                                    </span>
                                  </div>
                                  {log.error && (
                                    <p className="text-[10px] font-mono text-rose-600 mt-0.5 truncate">
                                      {log.error}
                                    </p>
                                  )}
                                  {/* Show a short text preview when collapsed */}
                                  {!isExpanded && log.output?.text && (
                                    <p className="text-[10px] font-mono text-slate-600 mt-0.5 line-clamp-2 whitespace-pre-wrap">
                                      {log.output.text}
                                    </p>
                                  )}
                                  {!isExpanded && log.output?.reasoning && !log.output?.text && (
                                    <p className="text-[10px] font-mono text-purple-600 mt-0.5 italic truncate">
                                      Reasoning available
                                    </p>
                                  )}
                                </button>

                                {/* Expanded inline details */}
                                {isExpanded && (
                                  <div className="px-4 pb-4 space-y-3 bg-white border-t border-slate-100">
                                    {/* Metadata row */}
                                    <div className="grid grid-cols-3 gap-2 pt-3">
                                      <div className="text-center">
                                        <div className="text-[8px] font-bold text-slate-400 uppercase font-sans">
                                          Tokens
                                        </div>
                                        <div className="text-[10px] font-bold font-mono text-slate-800 mt-0.5">
                                          {log.tokensUsed ?? 0}
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-[8px] font-bold text-slate-400 uppercase font-sans">
                                          Duration
                                        </div>
                                        <div className="text-[10px] font-bold font-mono text-slate-800 mt-0.5">
                                          {log.completedAt && log.startedAt
                                            ? `${Math.round(new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime())} ms`
                                            : 'N/A'}
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-[8px] font-bold text-slate-400 uppercase font-sans">
                                          Date
                                        </div>
                                        <div className="text-[10px] font-bold font-mono text-slate-800 mt-0.5">
                                          {formatTime(log.startedAt)}
                                        </div>
                                      </div>
                                    </div>

                                    {/* System Prompt */}
                                    {log.input?.systemPrompt && (
                                      <CollapsibleSection title="System Prompt">
                                        {log.input.systemPrompt}
                                      </CollapsibleSection>
                                    )}

                                    {/* Input Prompt */}
                                    {log.input?.prompt && (
                                      <CollapsibleSection title="Input Prompt" defaultOpen>
                                        {log.input.prompt}
                                      </CollapsibleSection>
                                    )}

                                    {/* Upstream Outputs */}
                                    {log.input?.upstreamOutputs &&
                                      Object.keys(log.input.upstreamOutputs).length > 0 && (
                                        <CollapsibleSection title="Upstream Outputs">
                                          {Object.entries(log.input.upstreamOutputs).map(
                                            ([nid, out]: [string, any]) => (
                                              <div
                                                key={nid}
                                                className="mb-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                                              >
                                                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                                                  From Node: {nid}
                                                </div>
                                                <div className="text-[9px] text-slate-700 whitespace-pre-wrap">
                                                  {out.text || '[Empty output]'}
                                                </div>
                                              </div>
                                            ),
                                          )}
                                        </CollapsibleSection>
                                      )}

                                    {/* Reasoning */}
                                    {log.output?.reasoning && (
                                      <div className="border-l-4 border-purple-500 bg-purple-50/40 p-3 space-y-1">
                                        <div className="text-[8px] font-extrabold tracking-widest text-purple-700 uppercase font-sans">
                                          AI Reasoning Process
                                        </div>
                                        <p className="text-[10px] font-mono text-purple-900 whitespace-pre-wrap select-text leading-relaxed max-h-48 overflow-y-auto">
                                          {log.output.reasoning}
                                        </p>
                                      </div>
                                    )}

                                    {/* Outputs */}
                                    <div className="border border-slate-200 bg-white">
                                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-sans border-b border-slate-100 px-3 py-1.5">
                                        Execution Output
                                      </div>
                                      {log.error && (
                                        <div className="p-2.5 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-[10px] font-mono whitespace-pre-wrap">
                                          <div className="font-bold uppercase text-[8px] tracking-wide text-rose-600 mb-0.5">
                                            Execution Error
                                          </div>
                                          {log.error}
                                        </div>
                                      )}
                                      <div className="p-3">
                                        <OutputRenderer
                                          outputParts={outputParts}
                                          streamingText={log.output?.text}
                                          status={log.status}
                                        />
                                      </div>
                                      {!log.error &&
                                        !log.output?.text &&
                                        (!outputParts || outputParts.length === 0) && (
                                          <div className="pb-6 text-center text-[10px] font-mono text-slate-400 italic">
                                            No output returned
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with refresh */}
        <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-400">
            {executionHistory.length} execution(s)
          </span>
          <button
            onClick={() => fetchExecutionHistory()}
            className="text-[10px] font-mono font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};
