import { Bot, Brain, Scale } from 'lucide-react';
import { WORKER_OPTIONS } from '../../data/worker-options.js';
import { handleDragStart } from '../../utils/drag-handle.js';
import { setPendingTouchDrag } from '../../lib/touch-drag.js';

export function AgentPanel({
  onSelectAgent,
  onSelectSupervisor,
  onSelectDebateArena,
}: {
  onSelectAgent: (data: Record<string, unknown>) => void;
  onSelectSupervisor: (data: Record<string, unknown>) => void;
  onSelectDebateArena?: (data: Record<string, unknown>) => void;
}) {
  const textWorkers = WORKER_OPTIONS.filter((w) => w.group === 'text');
  const mediaWorkers = WORKER_OPTIONS.filter((w) => w.group === 'media');
  const supervisor = WORKER_OPTIONS.find((w) => w.group === 'supervisor')!;

  return (
    <div className="p-4 space-y-5">
      {/* Orchestration first */}
      <div>
        <h3 className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-2">
          <span>Orchestration</span>
          <span className="h-px bg-slate-200 flex-1" />
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() =>
              onSelectSupervisor({
                label: supervisor.name,
                model: supervisor.model,
                enableThinking: supervisor.enableThinking,
                outputFormat: supervisor.outputFormat,
                systemPrompt: supervisor.systemPrompt,
              })
            }
            onDragStart={(e) =>
              handleDragStart(e, 'supervisor', {
                label: supervisor.name,
                model: supervisor.model,
                enableThinking: supervisor.enableThinking,
                outputFormat: supervisor.outputFormat,
                systemPrompt: supervisor.systemPrompt,
              })
            }
            onTouchStart={() =>
              setPendingTouchDrag('supervisor', {
                label: supervisor.name,
                model: supervisor.model,
                enableThinking: supervisor.enableThinking,
                outputFormat: supervisor.outputFormat,
                systemPrompt: supervisor.systemPrompt,
              })
            }
            draggable
            className="border border-blue-200 p-3 hover:border-blue-400 hover:bg-blue-50/30 transition-all group text-left bg-blue-50/20 cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 border bg-blue-50 border-blue-200 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[11px] font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                  {supervisor.name}
                </h4>
                <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-2 font-mono leading-relaxed">
                  {supervisor.description}
                </p>
              </div>
            </div>
          </button>
          {onSelectDebateArena && (
            <button
              onClick={() =>
                onSelectDebateArena({
                  label: 'Debate Arena',
                  debateArenaConfig: {
                    mode: 'debate',
                    maxRounds: 3,
                    hasArbitrator: false,
                    outputFormat: 'verdict',
                  },
                })
              }
              onDragStart={(e) =>
                handleDragStart(e, 'debate_arena', {
                  label: 'Debate Arena',
                  debateArenaConfig: {
                    mode: 'debate',
                    maxRounds: 3,
                    hasArbitrator: false,
                    outputFormat: 'verdict',
                  },
                })
              }
              onTouchStart={() =>
                setPendingTouchDrag('debate_arena', {
                  label: 'Debate Arena',
                  debateArenaConfig: {
                    mode: 'debate',
                    maxRounds: 3,
                    hasArbitrator: false,
                    outputFormat: 'verdict',
                  },
                })
              }
              draggable
              className="border border-amber-200 p-3 hover:border-amber-400 hover:bg-amber-50/30 transition-all group text-left bg-amber-50/20 cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 border bg-amber-50 border-amber-200 flex items-center justify-center shrink-0">
                  <Scale className="w-4 h-4 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-[11px] font-bold text-slate-900 group-hover:text-amber-700 transition-colors truncate">
                    Debate Arena
                  </h4>
                  <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-2 font-mono leading-relaxed">
                    Orchestrates multi-agent debate with structured rounds, cross-examination, and
                    optional arbitration.
                  </p>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-2">
          <span>Text & Reasoning</span>
          <span className="h-px bg-slate-200 flex-1" />
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {textWorkers.map((worker) => {
            const Icon = worker.icon;
            return (
              <button
                key={worker.id}
                onClick={() =>
                  onSelectAgent({
                    label: worker.name,
                    model: worker.model,
                    enableThinking: worker.enableThinking,
                    outputFormat: worker.outputFormat,
                    systemPrompt: worker.systemPrompt,
                    workerType: worker.id,
                  })
                }
                onDragStart={(e) =>
                  handleDragStart(e, 'agent', {
                    label: worker.name,
                    model: worker.model,
                    enableThinking: worker.enableThinking,
                    outputFormat: worker.outputFormat,
                    systemPrompt: worker.systemPrompt,
                    workerType: worker.id,
                  })
                }
                onTouchStart={() =>
                  setPendingTouchDrag('agent', {
                    label: worker.name,
                    model: worker.model,
                    enableThinking: worker.enableThinking,
                    outputFormat: worker.outputFormat,
                    systemPrompt: worker.systemPrompt,
                    workerType: worker.id,
                  })
                }
                draggable
                className="border border-slate-200 p-3 hover:border-[#f97316] hover:bg-orange-50/30 transition-all group text-left cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-8 h-8 border ${worker.iconBg} flex items-center justify-center shrink-0`}
                  >
                    <Icon className={`w-4 h-4 ${worker.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[11px] font-bold text-slate-900 group-hover:text-[#f97316] transition-colors truncate">
                      {worker.name}
                    </h4>
                    <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-2 font-mono leading-relaxed">
                      {worker.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-2">
          <span>Media Generation</span>
          <span className="h-px bg-slate-200 flex-1" />
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {mediaWorkers.map((worker) => {
            const Icon = worker.icon;
            return (
              <button
                key={worker.id}
                onClick={() =>
                  onSelectAgent({
                    label: worker.name,
                    model: worker.model,
                    enableThinking: worker.enableThinking,
                    outputFormat: worker.outputFormat,
                    systemPrompt: worker.systemPrompt,
                    workerType: worker.id,
                  })
                }
                onDragStart={(e) =>
                  handleDragStart(e, 'agent', {
                    label: worker.name,
                    model: worker.model,
                    enableThinking: worker.enableThinking,
                    outputFormat: worker.outputFormat,
                    systemPrompt: worker.systemPrompt,
                    workerType: worker.id,
                  })
                }
                onTouchStart={() =>
                  setPendingTouchDrag('agent', {
                    label: worker.name,
                    model: worker.model,
                    enableThinking: worker.enableThinking,
                    outputFormat: worker.outputFormat,
                    systemPrompt: worker.systemPrompt,
                    workerType: worker.id,
                  })
                }
                draggable
                className="border border-slate-200 p-3 hover:border-[#f97316] hover:bg-orange-50/30 transition-all group text-left cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-8 h-8 border ${worker.iconBg} flex items-center justify-center shrink-0`}
                  >
                    <Icon className={`w-4 h-4 ${worker.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[11px] font-bold text-slate-900 group-hover:text-[#f97316] transition-colors truncate">
                      {worker.name}
                    </h4>
                    <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-2 font-mono leading-relaxed">
                      {worker.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
