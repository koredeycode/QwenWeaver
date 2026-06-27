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
import { fetchApi, API_URL } from '../lib/api-client.js';
import type { ExecutionSummary } from '../store/types.js';

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

export const LogDetailsModal = ({ log, onClose }: { log: AgentLogEntry; onClose: () => void }) => {
  const getMediaUrl = (val: string) => {
    if (!val) return '';
    if (val.startsWith('http://') || val.startsWith('https://')) return val;
    const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    const path = val.startsWith('/') ? val : '/' + val;
    return `${base}${path}`;
  };

  const nodeTypeIcon = (nodeId: string) => {
    if (nodeId.startsWith('supervisor')) return <Brain className="w-4 h-4 text-purple-600" />;
    if (nodeId.startsWith('mcp')) return <Wrench className="w-4 h-4 text-amber-600" />;
    return <Bot className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white border-2 border-slate-900 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <header className="h-14 border-b-2 border-slate-900 px-4 flex items-center justify-between bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            {nodeTypeIcon(log.nodeId)}
            <span className="text-xs font-bold tracking-tight text-slate-800 uppercase font-sans">
              Node execution:{' '}
              {log.nodeId
                .replace(/^(agent|supervisor|mcp)_/, '')
                .replace(/-\d+$/, '')
                .replace(/-/g, ' ') || log.nodeId}
            </span>
            <span
              className={`text-[8px] font-extrabold uppercase font-mono px-1 py-0.5 ml-2 ${
                log.status === 'completed'
                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                  : log.status === 'failed'
                    ? 'text-rose-700 bg-rose-50 border border-rose-200'
                    : 'text-slate-700 bg-slate-50 border border-slate-200'
              }`}
            >
              {log.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors rounded-none cursor-pointer border border-transparent"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Scrollable details */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-slate-50/50">
          {/* Metadata Grid */}
          <div className="grid grid-cols-3 gap-3 bg-white border border-slate-200 p-3 text-center">
            <div>
              <div className="text-[8px] font-bold text-slate-400 uppercase font-sans">
                Tokens Used
              </div>
              <div className="text-xs font-bold font-mono text-slate-800 mt-0.5">
                {log.tokensUsed ?? 0}
              </div>
            </div>
            <div>
              <div className="text-[8px] font-bold text-slate-400 uppercase font-sans">
                Duration
              </div>
              <div className="text-xs font-bold font-mono text-slate-800 mt-0.5">
                {log.completedAt && log.startedAt
                  ? `${Math.round(new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime())} ms`
                  : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-[8px] font-bold text-slate-400 uppercase font-sans">
                Execution Date
              </div>
              <div className="text-xs font-bold font-mono text-slate-800 mt-0.5">
                {new Date(log.startedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>

          {/* System Prompt (If present) */}
          {log.input?.systemPrompt && (
            <CollapsibleSection title="System Prompt">{log.input.systemPrompt}</CollapsibleSection>
          )}

          {/* Prompt/User Prompt */}
          {log.input?.prompt && (
            <CollapsibleSection title="Input Prompt" defaultOpen>
              {log.input.prompt}
            </CollapsibleSection>
          )}

          {/* Upstream Outputs (If present) */}
          {log.input?.upstreamOutputs && Object.keys(log.input.upstreamOutputs).length > 0 && (
            <CollapsibleSection title="Upstream Outputs">
              {Object.entries(log.input.upstreamOutputs).map(([nodeId, out]: [string, any]) => (
                <div
                  key={nodeId}
                  className="mb-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                >
                  <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    From Node: {nodeId}
                  </div>
                  <div className="text-[9px] text-slate-700 whitespace-pre-wrap">
                    {out.text || '[Empty output]'}
                  </div>
                </div>
              ))}
            </CollapsibleSection>
          )}

          {/* Reasoning / Thinking process */}
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

          {/* Final Outputs */}
          <div className="border border-slate-200 bg-white p-3 space-y-2">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-sans border-b border-slate-100 pb-1">
              Execution Output
            </div>

            {/* Error state */}
            {log.error && (
              <div className="p-2.5 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-[10px] font-mono whitespace-pre-wrap">
                <div className="font-bold uppercase text-[8px] tracking-wide text-rose-600 mb-0.5">
                  Execution Error
                </div>
                {log.error}
              </div>
            )}

            {/* Media Rendering outputs */}
            {log.output?.outputs &&
              Array.isArray(log.output.outputs) &&
              log.output.outputs.map((out: any, oIdx: number) => {
                if (out.type === 'image' || out.contentType?.startsWith('image/')) {
                  return (
                    <div key={oIdx} className="space-y-1.5 py-1">
                      <div className="text-[8px] font-bold text-slate-400 uppercase">
                        Generated Image Output
                      </div>
                      <div className="flex flex-col items-center">
                        <img
                          src={getMediaUrl(out.value)}
                          alt="Generated Media"
                          className="max-w-full max-h-[320px] object-contain border border-slate-300"
                        />
                        <a
                          href={getMediaUrl(out.value)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 text-[9px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                        >
                          Open in full tab ↗
                        </a>
                      </div>
                    </div>
                  );
                }
                if (out.type === 'video' || out.contentType?.startsWith('video/')) {
                  return (
                    <div key={oIdx} className="space-y-1.5 py-1">
                      <div className="text-[8px] font-bold text-slate-400 uppercase">
                        Generated Video Output
                      </div>
                      <div className="flex flex-col items-center">
                        <video
                          src={getMediaUrl(out.value)}
                          controls
                          className="max-w-full max-h-[320px] object-contain border border-slate-300"
                        />
                        <a
                          href={getMediaUrl(out.value)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 text-[9px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                        >
                          Open in full tab ↗
                        </a>
                      </div>
                    </div>
                  );
                }
                if (out.type === 'audio' || out.contentType?.startsWith('audio/')) {
                  return (
                    <div key={oIdx} className="space-y-1.5 py-1">
                      <div className="text-[8px] font-bold text-slate-400 uppercase">
                        Generated Audio Speech
                      </div>
                      <audio src={getMediaUrl(out.value)} controls className="w-full mt-1" />
                    </div>
                  );
                }
                return null;
              })}

            {/* Standard Text output */}
            {log.output?.text && (
              <div className="p-3 bg-slate-50 border border-slate-200 max-h-64 overflow-y-auto select-text">
                <p className="text-[10px] font-mono text-slate-800 whitespace-pre-wrap leading-normal">
                  {log.output.text}
                </p>
              </div>
            )}

            {!log.error &&
              !log.output?.text &&
              (!log.output?.outputs || log.output.outputs.length === 0) && (
                <div className="py-6 text-center text-[10px] font-mono text-slate-400 italic">
                  No output returned
                </div>
              )}
          </div>
        </div>

        {/* Footer */}
        <footer className="h-12 border-t border-slate-200 px-4 flex items-center justify-end bg-slate-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-mono text-[9px] font-bold tracking-wide uppercase transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </footer>
      </div>
    </div>
  );
};

export const ExecutionHistoryPanel = ({ onClose }: { onClose: () => void }) => {
  const executionHistory = useStore((s) => s.executionHistory);
  const historyLoading = useStore((s) => s.historyLoading);
  const fetchExecutionHistory = useStore((s) => s.fetchExecutionHistory);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionSummary | null>(null);
  const [agentLogs, setAgentLogs] = useState<AgentLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AgentLogEntry | null>(null);

  useEffect(() => {
    fetchExecutionHistory();
  }, [fetchExecutionHistory]);

  const handleSelectExecution = async (exec: ExecutionSummary) => {
    if (selectedExecution?.id === exec.id) {
      setSelectedExecution(null);
      setAgentLogs([]);
      return;
    }
    setSelectedExecution(exec);
    setLogsLoading(true);
    try {
      const res = await fetchApi(`/api/execution/${exec.id}/logs`);
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

                  {/* Expanded agent logs */}
                  {selectedExecution?.id === exec.id && (
                    <div className="bg-slate-50 border-t border-slate-100">
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
                          {agentLogs.map((log) => (
                            <div
                              key={log.id}
                              onClick={() => setSelectedLog(log)}
                              className="px-4 py-2.5 hover:bg-slate-150 transition-colors cursor-pointer flex flex-col"
                              title="Click to view full inputs, reasoning & outputs details"
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                {nodeTypeIcon(log.nodeId)}
                                <span className="text-[10px] font-mono font-bold text-slate-600 truncate">
                                  {log.nodeId
                                    .replace(/^(agent|supervisor|mcp)_/, '')
                                    .replace(/-\d+$/, '')
                                    .replace(/-/g, ' ') || log.nodeId}
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
                                  View Details →
                                </span>
                              </div>
                              {log.error && (
                                <p className="text-[10px] font-mono text-rose-600 mt-0.5 truncate">
                                  {log.error}
                                </p>
                              )}
                              {log.output?.text && (
                                <p className="text-[10px] font-mono text-slate-600 mt-0.5 line-clamp-2 whitespace-pre-wrap">
                                  {log.output.text}
                                </p>
                              )}
                              {log.output?.reasoning && !log.output?.text && (
                                <p className="text-[10px] font-mono text-purple-600 mt-0.5 italic truncate">
                                  Reasoning available
                                </p>
                              )}
                            </div>
                          ))}
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

      {selectedLog && <LogDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
};
