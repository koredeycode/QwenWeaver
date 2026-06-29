import { TRIGGER_OPTIONS } from '../../data/worker-options.js';
import { handleDragStart } from '../../utils/drag-handle.js';
import { setPendingTouchDrag } from '../../lib/touch-drag.js';

export function TriggerPanel({
  onSelect,
}: {
  onSelect: (type: 'trigger' | 'input_trigger') => void;
}) {
  return (
    <div className="p-4 space-y-3">
      <h3 className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-2">
        <span>Workflow Triggers</span>
        <span className="h-px bg-slate-200 flex-1" />
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {TRIGGER_OPTIONS.map((trigger) => {
          const Icon = trigger.icon;
          return (
            <button
              key={trigger.type}
              onClick={() => onSelect(trigger.type)}
              onDragStart={(e) => handleDragStart(e, trigger.type)}
              onTouchStart={() => setPendingTouchDrag(trigger.type)}
              draggable
              className="border border-slate-200 p-3 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all group text-left cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-8 h-8 border ${trigger.iconBg} flex items-center justify-center shrink-0`}
                >
                  <Icon className={`w-4 h-4 ${trigger.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-[11px] font-bold text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                    {trigger.label}
                  </h4>
                  <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-2 font-mono leading-relaxed">
                    {trigger.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
