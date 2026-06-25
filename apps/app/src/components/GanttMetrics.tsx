import React, { useState } from 'react';
import { BarChart3, ChevronUp, ChevronDown, Gauge, Coins, Clock } from 'lucide-react';
import { useStore } from '../store/index.js';

export const GanttMetrics = () => {
  const status = useStore((s) => s.executionStatus);
  const metrics = useStore((s) => s.metrics);
  const nodes = useStore((s) => s.nodes);

  const [isOpen, setIsOpen] = useState(false);

  if (status === 'idle' || !metrics) {
    return (
      <div className="bg-white border-t border-[#cbd5e1] font-sans select-none text-slate-700">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between p-2.5 bg-[#f8fafc] cursor-pointer hover:bg-slate-50 border-b border-transparent"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <span className="text-[11px] font-mono font-bold tracking-wider text-slate-500">
              EXECUTION OBSERVABILITY & METRICS
            </span>
          </div>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
        </div>

        {isOpen && (
          <div className="p-6 text-center text-xs text-slate-400 bg-white border-t border-slate-100">
            No execution data. Click <span className="text-primary font-bold">"Run Workflow"</span>{' '}
            in the header to visualize Kahn's algorithm speedup and agent metrics.
          </div>
        )}
      </div>
    );
  }

  const timings = metrics.nodeTimings || [];
  const maxMs = Math.max(...timings.map((t) => t.durationMs), 1000);

  return (
    <div className="bg-white border-t border-[#cbd5e1] font-sans select-none text-slate-750">
      {/* Header bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-2.5 bg-[#f8fafc] cursor-pointer hover:bg-slate-50 border-b border-[#cbd5e1]"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-[11px] font-mono font-bold tracking-wider text-slate-700">
            OBSERVABILITY SUMMARY ({status.toUpperCase()})
          </span>
        </div>
        <div className="flex items-center gap-4">
          {metrics.speedupS && (
            <span className="text-xs font-mono bg-primary/10 border border-primary/30 text-primary px-2 py-0.5 font-bold">
              {metrics.speedupS}x SPEEDUP
            </span>
          )}
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="p-4 bg-white space-y-4 grid grid-cols-1 lg:grid-cols-4 gap-4 items-start border-t border-slate-100 max-h-64 overflow-y-auto">
          {/* Key Metrics Cards */}
          <div className="lg:col-span-1 space-y-2">
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1">
              Topological Efficiency
            </div>

            {/* Speedup */}
            <div className="bg-slate-50 border border-slate-200 p-3 flex items-center justify-between shadow-sm">
              <div>
                <div className="text-[10px] text-slate-500 font-mono">MATHEMATICAL SPEEDUP</div>
                <div className="text-2xl font-bold font-mono text-primary mt-1">
                  {metrics.speedupS ? `${metrics.speedupS}x` : '1.0x'}
                </div>
              </div>
              <Gauge className="w-8 h-8 text-primary/20" />
            </div>

            {/* Total Latency */}
            <div className="bg-slate-50 border border-slate-200 p-3 flex items-center justify-between shadow-sm">
              <div>
                <div className="text-[10px] text-slate-500 font-mono">PARALLEL WALL TIME</div>
                <div className="text-2xl font-bold font-mono text-secondary mt-1">
                  {metrics.totalLatencyMs
                    ? `${(metrics.totalLatencyMs / 1000).toFixed(2)}s`
                    : '0.0s'}
                </div>
              </div>
              <Clock className="w-8 h-8 text-secondary/20" />
            </div>

            {/* Total Tokens */}
            <div className="bg-slate-50 border border-slate-200 p-3 flex items-center justify-between shadow-sm">
              <div>
                <div className="text-[10px] text-slate-500 font-mono">LLM INFERENCE VOLUME</div>
                <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
                  {metrics.totalTokens ? metrics.totalTokens.toLocaleString() : 0}{' '}
                  <span className="text-xs text-slate-400 font-normal">tkn</span>
                </div>
              </div>
              <Coins className="w-8 h-8 text-amber-500/20" />
            </div>
          </div>

          {/* Gantt Timings Board */}
          <div className="lg:col-span-3 space-y-2">
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex justify-between items-center">
              <span>BATCH SCHEDULE LAYER TRACING (KAHN TOPOLOGY)</span>
              <span className="text-[9px] text-slate-400">Duration in Miliseconds</span>
            </div>

            <div className="border border-slate-200 bg-white p-3 space-y-3.5 max-h-60 overflow-y-auto scrollbar">
              {timings.map((item, idx) => {
                const nodeObj = nodes.find((n) => n.id === item.nodeId);
                const nodeLabel = nodeObj?.data?.label || item.nodeId;
                const percentage = Math.min((item.durationMs / maxMs) * 100, 100);

                return (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono bg-slate-100 border border-slate-200 px-1 text-slate-500 uppercase rounded-none">
                          {nodeObj?.type || 'node'}
                        </span>
                        <span className="font-semibold text-slate-800">{nodeLabel}</span>
                      </div>
                      <div className="font-mono text-slate-500 text-[11px] flex gap-3">
                        {item.tokensUsed && (
                          <span className="text-amber-600">{item.tokensUsed} tokens</span>
                        )}
                        <span className="text-secondary">{item.durationMs}ms</span>
                      </div>
                    </div>

                    {/* Visual Bar representation */}
                    <div className="w-full bg-slate-100 h-2.5 border border-slate-200/50 relative">
                      <div
                        style={{ width: `${percentage}%` }}
                        className={`h-full transition-all duration-1000 ${
                          nodeObj?.type === 'supervisor'
                            ? 'bg-secondary'
                            : nodeObj?.type === 'trigger'
                              ? 'bg-emerald-500'
                              : 'bg-[#ea580c]'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-slate-400 leading-normal mt-2 font-sans">
              * Kahn's algorithm groups zero-in-degree nodes recursively to compute execution
              scheduling. Independent worker nodes execute in parallel (topological layers),
              dramatically reducing inference wait times.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
