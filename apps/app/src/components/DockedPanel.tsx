import { Play, Bot, Wrench, X } from 'lucide-react';
import { TriggerPanel } from './panels/TriggerPanel.js';
import { AgentPanel } from './panels/AgentPanel.js';
import { MCPPanel } from './panels/mcp/MCPPanel.js';
import { useStore } from '../store/index.js';

interface DockedPanelProps {
  mode: 'triggers' | 'agents' | 'mcp';
  onClose: () => void;
}

export const DockedPanel = ({ mode, onClose }: DockedPanelProps) => {
  const addNode = useStore((s) => s.addNode);

  const headerIcon = () => {
    switch (mode) {
      case 'triggers':
        return <Play className="w-4 h-4 text-emerald-600" />;
      case 'agents':
        return <Bot className="w-4 h-4 text-[#f97316]" />;
      case 'mcp':
        return <Wrench className="w-4 h-4 text-purple-600" />;
    }
  };

  const headerTitle = () => {
    switch (mode) {
      case 'triggers':
        return 'TRIGGERS';
      case 'agents':
        return 'AGENTS';
      case 'mcp':
        return 'MCP TOOLS';
    }
  };

  return (
    <div className="h-full bg-white border-r border-[#cbd5e1] flex flex-col font-sans select-none text-slate-800 w-[420px] shadow-xl z-30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#cbd5e1] bg-[#f8fafc] shrink-0">
        <div className="flex items-center gap-2">
          {headerIcon()}
          <h2 className="text-xs font-mono font-bold tracking-wider text-slate-900">
            {headerTitle()}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 border border-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar">
        {mode === 'triggers' ? (
          <TriggerPanel
            onSelect={(type) => {
              addNode(type, { x: 250, y: 200 });
              onClose();
            }}
          />
        ) : mode === 'agents' ? (
          <AgentPanel
            onSelectAgent={(data) => {
              addNode('agent', { x: 250, y: 200 }, data);
              onClose();
            }}
            onSelectSupervisor={(data) => {
              addNode('supervisor', { x: 250, y: 200 }, data);
              onClose();
            }}
          />
        ) : (
          <MCPPanel />
        )}
      </div>
    </div>
  );
};
