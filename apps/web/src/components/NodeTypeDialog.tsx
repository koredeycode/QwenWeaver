import React, { useEffect } from 'react';
import { 
  Play, 
  Bot, 
  Brain, 
  Wrench, 
  X 
} from 'lucide-react';
import type { NodeType } from '@qwenweaver/types';

interface NodeTypeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: NodeType) => void;
}

export const NodeTypeDialog: React.FC<NodeTypeDialogProps> = ({ isOpen, onClose, onSelect }) => {
  // Listen for Escape key to close dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const nodeOptions = [
    {
      type: 'trigger' as NodeType,
      title: 'Trigger Node',
      subtitle: 'Schedule / Webhook',
      description: 'Initiate workflow execution periodically using a cron schedule.',
      icon: Play,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      hoverBorder: 'hover:border-emerald-500',
      hoverBg: 'hover:bg-emerald-50/20'
    },
    {
      type: 'agent' as NodeType,
      title: 'Worker Agent Node',
      subtitle: 'LLM Task Executor',
      description: 'Standard worker node executing prompt tasks using standard Qwen models.',
      icon: Bot,
      iconColor: 'text-[#ea580c]',
      iconBg: 'bg-orange-50',
      hoverBorder: 'hover:border-[#ea580c]',
      hoverBg: 'hover:bg-orange-50/20'
    },
    {
      type: 'supervisor' as NodeType,
      title: 'Supervisor Node',
      subtitle: 'Swarm Coordinator',
      description: 'Coordinates worker agents, resolves conflicting outputs, and negotiates consensus.',
      icon: Brain,
      iconColor: 'text-[#2563eb]',
      iconBg: 'bg-blue-50',
      hoverBorder: 'hover:border-[#2563eb]',
      hoverBg: 'hover:bg-blue-50/20'
    },
    {
      type: 'mcp_tool' as NodeType,
      title: 'MCP Tool Node',
      subtitle: 'Model Context Protocol',
      description: 'Directly executes tools from connected MCP servers like Local Filesystem or Git.',
      icon: Wrench,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-50',
      hoverBorder: 'hover:border-amber-500',
      hoverBg: 'hover:bg-amber-50/20'
    }
  ];

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] z-50 animate-in fade-in duration-200">
      {/* Backdrop click layer */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Box */}
      <div className="w-full max-w-2xl bg-white border-2 border-slate-800 p-6 shadow-2xl relative z-10 rounded-none flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900 font-sans flex items-center gap-2">
              <span className="text-[#ea580c]">🔀</span> SELECT NODE TYPE
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Choose the node class to deploy onto the visual execution DAG.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-all rounded-none"
            title="Close Dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
          {nodeOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.type}
                onClick={() => {
                  onSelect(opt.type);
                  onClose();
                }}
                className={`flex text-left items-start gap-4 p-4 border border-slate-200 bg-slate-50/50 transition-all rounded-none cursor-pointer group ${opt.hoverBorder} ${opt.hoverBg}`}
              >
                {/* Icon Container */}
                <div className={`w-10 h-10 ${opt.iconBg} ${opt.iconColor} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 duration-200 border border-slate-200/50`}>
                  <Icon className="w-5 h-5" />
                </div>
                
                {/* Description Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-sm font-bold text-slate-800 group-hover:text-slate-900 transition-colors">
                      {opt.title}
                    </span>
                  </div>
                  <span className="block text-[10px] font-mono font-semibold tracking-wider text-slate-400 uppercase mt-0.5">
                    {opt.subtitle}
                  </span>
                  <p className="text-[11px] text-slate-500 leading-normal mt-1.5 font-sans">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#cbd5e1] hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors rounded-none"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
