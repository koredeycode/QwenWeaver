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
import { fetchApi } from '../lib/api-client.js';
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

export const ExecutionHistoryPanel = ({ onClose }: { onClose: () => void }) => {
  const executionHistory = useStore((s) => s.executionHistory);
  const historyLoading = useStore((s) => s.historyLoading);
  const fetchExecutionHistory = useStore((s) => s.fetchExecutionHistory);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionSummary | null>(null);
  const [agentLogs, setAgentLogs] = useState<AgentLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

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
      <div className="w-[480px] h-full bg-white shadow-xl flex flex-col">
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
              <p className="text-[10px] font-mono mt-1">Run a workflow to see it here</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {executionHistory.map((exec) => (
                <div key={exec.id}>
                  <button
                    onClick={() => handleSelectExecution(exec)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer hover:bg-slate-50 ${
                      selectedExecution?.id === exec.id ? 'bg-blue-50' : ''
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
                            <div key={log.id} className="px-4 py-2.5">
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
                                  <span className="text-[8px] font-mono text-slate-400 ml-auto">
                                    {log.tokensUsed} tokens
                                  </span>
                                )}
                              </div>
                              {log.error && (
                                <p className="text-[10px] font-mono text-rose-600 mt-0.5">
                                  {log.error}
                                </p>
                              )}
                              {log.output?.text && (
                                <p className="text-[10px] font-mono text-slate-600 mt-0.5 line-clamp-3 whitespace-pre-wrap">
                                  {log.output.text}
                                </p>
                              )}
                              {log.output?.reasoning && (
                                <details className="mt-0.5">
                                  <summary className="text-[9px] font-mono text-purple-500 cursor-pointer">
                                    Reasoning
                                  </summary>
                                  <p className="text-[9px] font-mono text-purple-700 mt-0.5 whitespace-pre-wrap">
                                    {log.output.reasoning}
                                  </p>
                                </details>
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
    </div>
  );
};
