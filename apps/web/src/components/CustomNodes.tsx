import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { 
  Play, 
  Bot, 
  Brain,
  ShieldAlert, 
  CheckCircle2, 
  Loader2, 
  Wrench
} from 'lucide-react';
import { useStore } from '../store/index.js';

// Wrapper styling helper based on node status for Light Mode
const getStatusStyles = (status: string, isSupervisor = false) => {
  switch (status) {
    case 'running':
      return isSupervisor 
        ? 'border-secondary-container animate-supervisor-pulse' 
        : 'border-primary-container animate-node-pulse';
    case 'completed':
      return 'border-emerald-500 shadow-[0_2px_8px_rgba(16,185,129,0.15)]';
    case 'failed':
      return 'border-rose-500 shadow-[0_2px_8px_rgba(244,63,94,0.15)]';
    default:
      return 'border-outline';
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'running':
      return (
        <span className="flex items-center gap-1 text-[10px] text-primary font-mono font-bold">
          <Loader2 className="w-3 h-3 animate-spin" /> RUNNING
        </span>
      );
    case 'completed':
      return (
        <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-mono font-bold">
          <CheckCircle2 className="w-3 h-3" /> COMPLETED
        </span>
      );
    case 'failed':
      return (
        <span className="flex items-center gap-1 text-[10px] text-rose-600 font-mono font-bold">
          <ShieldAlert className="w-3 h-3" /> FAILED
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono font-semibold">
          ● PENDING
        </span>
      );
  }
};

// --- 1. Trigger Node Component ---
export const TriggerNode = memo(({ id, data }: NodeProps<any>) => {
  const status = useStore((s) => s.nodeStatuses[id] || 'pending');
  const isSelected = useStore((s) => s.selectedNodeId === id);

  return (
    <div className={`w-64 bg-white border-2 ${isSelected ? 'border-primary shadow-[0_2px_12px_rgba(234,88,12,0.15)]' : getStatusStyles(status)} text-slate-800 p-3 relative font-sans shadow-sm`}>
      <div className="flex items-center justify-between border-b border-outline-variant pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-emerald-600 fill-emerald-600/10" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-600">TRIGGER</span>
        </div>
        {getStatusBadge(status)}
      </div>

      <div className="text-sm font-bold tracking-tight text-slate-900">{data.label || 'Web Trigger'}</div>
      <div className="text-[10px] text-slate-500 mt-1 font-mono">{data.outputFormat?.toUpperCase() || 'TEXT'} output</div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-4 h-4 !bg-emerald-500 !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
      />
    </div>
  );
});
TriggerNode.displayName = 'TriggerNode';

// --- 2. Worker Agent Node Component ---
export const AgentNode = memo(({ id, data }: NodeProps<any>) => {
  const status = useStore((s) => s.nodeStatuses[id] || 'pending');
  const output = useStore((s) => s.nodeOutputs[id] || '');
  const isSelected = useStore((s) => s.selectedNodeId === id);

  return (
    <div className={`w-72 bg-white border-2 ${isSelected ? 'border-primary shadow-[0_2px_12px_rgba(234,88,12,0.15)]' : getStatusStyles(status)} text-slate-800 p-3 relative font-sans shadow-sm`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-4 h-4 !bg-[#ea580c] !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
      />

      <div className="flex items-center justify-between border-b border-outline-variant pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#ea580c]" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-primary">AGENT ({data.model || 'qwen-plus'})</span>
        </div>
        {getStatusBadge(status)}
      </div>

      <div className="text-sm font-bold tracking-tight text-slate-900">{data.label || 'Qwen Worker'}</div>
      
      {data.systemPrompt && (
        <div className="text-[10px] text-slate-500 mt-1 line-clamp-2 italic font-mono bg-slate-50 p-1.5 border border-outline-variant">
          "{data.systemPrompt}"
        </div>
      )}

      {/* Terminal Output stream display */}
      {output && (
        <div className="mt-2.5 bg-slate-950 border border-slate-850 p-2 font-mono text-[11px] h-28 overflow-y-auto leading-relaxed scrollbar">
          <div className="text-slate-500 border-b border-slate-800 pb-1 mb-1 flex items-center justify-between">
            <span className="text-[9px] font-bold tracking-wide">CONSOLE OUTPUT</span>
            <span className="animate-pulse text-primary">_</span>
          </div>
          <span className="text-slate-100 whitespace-pre-wrap">{output}</span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="w-4 h-4 !bg-[#ea580c] !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
      />
    </div>
  );
});
AgentNode.displayName = 'AgentNode';

// --- 3. Supervisor Node Component ---
export const SupervisorNode = memo(({ id, data }: NodeProps<any>) => {
  const status = useStore((s) => s.nodeStatuses[id] || 'pending');
  const output = useStore((s) => s.nodeOutputs[id] || '');
  const isSelected = useStore((s) => s.selectedNodeId === id);

  return (
    <div className={`w-80 bg-white border-2 ${isSelected ? 'border-secondary shadow-[0_2px_12px_rgba(37,99,235,0.15)]' : getStatusStyles(status, true)} text-slate-800 p-3.5 relative font-sans shadow-md`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-4 h-4 !bg-[#2563eb] !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
      />

      <div className="flex items-center justify-between border-b border-outline pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#2563eb]" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-secondary">SUPERVISOR ({data.model || 'qwen3-max'})</span>
        </div>
        {getStatusBadge(status)}
      </div>

      <div className="text-sm font-bold tracking-tight text-secondary-container">{data.label || 'Swarm Supervisor'}</div>
      
      {data.systemPrompt && (
        <div className="text-[10px] text-slate-600 mt-1 line-clamp-2 italic font-mono bg-slate-50 p-2 border border-outline-variant">
          "{data.systemPrompt}"
        </div>
      )}

      {/* Terminal Output stream display with thinking parser */}
      {output && (
        <div className="mt-2.5 bg-slate-950 border border-slate-800 p-2 font-mono text-[11px] h-32 overflow-y-auto leading-relaxed scrollbar">
          <div className="text-secondary border-b border-slate-800 pb-1 mb-1 flex items-center justify-between">
            <span className="text-[9px] font-bold tracking-wide">SUPERVISOR TELEMETRY</span>
            <span className="animate-pulse">_</span>
          </div>
          <span className="text-slate-100 whitespace-pre-wrap">{output}</span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="w-4 h-4 !bg-[#2563eb] !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
      />
    </div>
  );
});
SupervisorNode.displayName = 'SupervisorNode';

// --- 4. MCP Tool Node Component ---
export const MCPToolNode = memo(({ id, data }: NodeProps<any>) => {
  const status = useStore((s) => s.nodeStatuses[id] || 'pending');
  const output = useStore((s) => s.nodeOutputs[id] || '');
  const isSelected = useStore((s) => s.selectedNodeId === id);

  return (
    <div className={`w-64 bg-white border-2 ${isSelected ? 'border-primary shadow-[0_2px_12px_rgba(234,88,12,0.15)]' : getStatusStyles(status)} text-slate-800 p-3 relative font-sans shadow-sm`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-4 h-4 !bg-amber-500 !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
      />

      <div className="flex items-center justify-between border-b border-outline-variant pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-amber-500" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-amber-500">MCP TOOL</span>
        </div>
        {getStatusBadge(status)}
      </div>

      <div className="text-sm font-bold tracking-tight text-slate-900">{data.label || 'MCP Server'}</div>
      <div className="text-[10px] text-amber-600 mt-1 font-mono select-all bg-slate-50 p-1 px-2 border border-outline-variant overflow-x-auto truncate">
        {data.mcpServerUrl || 'http://localhost:8080'}
      </div>

      {output && (
        <div className="mt-2.5 bg-slate-950 border border-slate-800 p-2 font-mono text-[11px] h-20 overflow-y-auto leading-relaxed scrollbar">
          <span className="text-emerald-400 font-bold">{output}</span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="w-4 h-4 !bg-amber-500 !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
      />
    </div>
  );
});
MCPToolNode.displayName = 'MCPToolNode';

// Node Types registry for React Flow
export const nodeTypes = {
  trigger: TriggerNode,
  agent: AgentNode,
  supervisor: SupervisorNode,
  mcp_tool: MCPToolNode,
};
