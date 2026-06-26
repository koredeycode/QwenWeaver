import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  Play,
  Bot,
  Brain,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Wrench,
  Square,
  Maximize2,
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

const getCompactStatusIndicator = (status: string) => {
  switch (status) {
    case 'running':
      return (
        <span
          className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse border border-slate-700"
          title="RUNNING"
        />
      );
    case 'completed':
      return (
        <span
          className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] border border-slate-700"
          title="COMPLETED"
        />
      );
    case 'failed':
      return (
        <span
          className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] border border-slate-700"
          title="FAILED"
        />
      );
    default:
      return (
        <span
          className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-slate-700"
          title="PENDING"
        />
      );
  }
};

// --- 1. Trigger Node Component ---
export const TriggerNode = memo(({ id, data }: NodeProps<any>) => {
  const status = useStore((s) => s.nodeStatuses[id] || 'pending');
  const isSelected = useStore((s) => s.selectedNodeId === id);
  const runWorkflow = useStore((s) => s.runWorkflow);
  const stopWorkflow = useStore((s) => s.stopWorkflow);
  const executionStatus = useStore((s) => s.executionStatus);
  const setMaximizedNodeId = useStore((s) => s.setMaximizedNodeId);

  return (
    <div
      className={`w-64 bg-white border-2 ${isSelected ? 'border-primary shadow-[0_2px_12px_rgba(234,88,12,0.15)]' : getStatusStyles(status)} text-slate-800 p-3 relative font-sans shadow-sm`}
    >
      <div className="flex items-center justify-between border-b border-outline-variant pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-emerald-600 fill-emerald-600/10" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-600">
            TRIGGER
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {getStatusBadge(status)}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMaximizedNodeId(id);
            }}
            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors nodrag cursor-pointer"
            title="Maximize Output Terminal"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="text-sm font-bold tracking-tight text-slate-900">
        {data.label || 'Web Trigger'}
      </div>
      <div className="text-[10px] text-slate-500 mt-1 font-mono">
        {data.outputFormat?.toUpperCase() || 'TEXT'} output
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (executionStatus === 'running') {
              stopWorkflow();
            } else {
              runWorkflow();
            }
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold border transition-colors rounded-none cursor-pointer nodrag ${
            executionStatus === 'running'
              ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
              : 'bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          {executionStatus === 'running' ? (
            <>
              <Square className="w-2.5 h-2.5 fill-rose-700 text-rose-700" />
              STOP
            </>
          ) : (
            <>
              <Play className="w-2.5 h-2.5 fill-emerald-700 text-emerald-700" />
              RUN
            </>
          )}
        </button>
        <span className="text-[9px] text-slate-400 font-mono">Click to execute</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="source"
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
  const setMaximizedNodeId = useStore((s) => s.setMaximizedNodeId);

  return (
    <div
      className={`w-72 bg-white border-2 ${isSelected ? 'border-primary shadow-[0_2px_12px_rgba(234,88,12,0.15)]' : getStatusStyles(status)} text-slate-800 p-3 relative font-sans shadow-sm`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="w-4 h-4 !bg-[#ea580c] !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="w-4 h-4 !bg-purple-500 !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
        title="Connect to MCP Tool"
      />

      <div className="flex items-center justify-between border-b border-outline-variant pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#ea580c]" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-primary">
            AGENT ({data.model || 'qwen-plus'})
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {getStatusBadge(status)}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMaximizedNodeId(id);
            }}
            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors nodrag cursor-pointer"
            title="Maximize Output Terminal"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="text-sm font-bold tracking-tight text-slate-900">
        {data.label || 'Qwen Worker'}
      </div>

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
        id="source-right"
        className="w-4 h-4 !bg-[#ea580c] !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="target-bottom"
        className="w-4 h-4 !bg-purple-500 !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
        title="Receives from MCP Tool"
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
  const setMaximizedNodeId = useStore((s) => s.setMaximizedNodeId);

  return (
    <div
      className={`w-80 bg-white border-2 ${isSelected ? 'border-secondary shadow-[0_2px_12px_rgba(37,99,235,0.15)]' : getStatusStyles(status, true)} text-slate-800 p-3.5 relative font-sans shadow-md`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="w-4 h-4 !bg-[#2563eb] !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="w-4 h-4 !bg-purple-500 !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
        title="Connect to MCP Tool"
      />

      <div className="flex items-center justify-between border-b border-outline pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#2563eb]" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-secondary">
            SUPERVISOR ({data.model || 'qwen3-max'})
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {getStatusBadge(status)}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMaximizedNodeId(id);
            }}
            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors nodrag cursor-pointer"
            title="Maximize Output Terminal"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="text-sm font-bold tracking-tight text-secondary-container">
        {data.label || 'Supervisor'}
      </div>

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
        id="source-right"
        className="w-4 h-4 !bg-[#2563eb] !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="target-bottom"
        className="w-4 h-4 !bg-purple-500 !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
        title="Receives from MCP Tool"
      />
    </div>
  );
});
SupervisorNode.displayName = 'SupervisorNode';

// --- 4. MCP Tool Node Component (Compact + Icon Support) ---
export const MCPToolNode = memo(({ id, data }: NodeProps<any>) => {
  const status = useStore((s) => s.nodeStatuses[id] || 'pending');
  const isSelected = useStore((s) => s.selectedNodeId === id);
  const setMaximizedNodeId = useStore((s) => s.setMaximizedNodeId);
  const [imgError, setImgError] = useState(false);

  const isUnconfigured = !data.mcpServerUrl;

  return (
    <div
      className={`w-20 h-20 bg-white border-2 ${
        isSelected
          ? 'border-purple-500 shadow-[0_2px_8px_rgba(168,85,247,0.2)]'
          : isUnconfigured
            ? 'border-amber-400'
            : 'border-purple-200'
      } text-slate-800 relative font-sans shadow-sm flex flex-col`}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        className="w-2.5 h-2.5 !bg-purple-500 !border-2 !border-white hover:scale-125 transition-all shadow-sm"
        title="Receives from Agent/Supervisor"
      />

      <div className="flex items-center justify-between px-1.5 py-1 border-b border-outline-variant">
        <div className="flex items-center gap-1">
          <Wrench className="w-2.5 h-2.5 text-purple-600" />
          <span className="text-[6px] font-mono font-bold tracking-wider text-purple-600 uppercase">
            MCP
          </span>
          {isUnconfigured && (
            <span className="text-[6px] text-amber-600 font-bold" title="Not configured">
              ⚠
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {getCompactStatusIndicator(status)}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMaximizedNodeId(id);
            }}
            className="p-0.5 hover:bg-purple-100 text-purple-400 hover:text-purple-700 transition-colors nodrag cursor-pointer"
            title="Inspect MCP Tool"
          >
            <Maximize2 className="w-2 h-2" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center flex-1 min-h-0">
        {data.iconUrl && !imgError ? (
          <img
            src={data.iconUrl}
            alt=""
            className="w-7 h-7 rounded object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-7 h-7 rounded bg-purple-100 flex items-center justify-center">
            <Wrench className="w-3.5 h-3.5 text-purple-600" />
          </div>
        )}
      </div>
    </div>
  );
});
MCPToolNode.displayName = 'MCPToolNode';

// --- 5. Input Trigger Node Component ---
export const InputTriggerNode = memo(({ id, data }: NodeProps<any>) => {
  const status = useStore((s) => s.nodeStatuses[id] || 'pending');
  const isSelected = useStore((s) => s.selectedNodeId === id);
  const updateNodeData = useStore((s) => s.updateNodeData);
  const runWorkflow = useStore((s) => s.runWorkflow);
  const stopWorkflow = useStore((s) => s.stopWorkflow);
  const executionStatus = useStore((s) => s.executionStatus);
  const setMaximizedNodeId = useStore((s) => s.setMaximizedNodeId);

  return (
    <div
      className={`w-72 bg-white border-2 ${isSelected ? 'border-primary shadow-[0_2px_12px_rgba(234,88,12,0.15)]' : getStatusStyles(status)} text-slate-800 p-3 relative font-sans shadow-sm`}
    >
      <div className="flex items-center justify-between border-b border-outline-variant pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-emerald-600 fill-emerald-600/10" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-600">
            INPUT TRIGGER
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {getStatusBadge(status)}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMaximizedNodeId(id);
            }}
            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors nodrag cursor-pointer"
            title="Maximize Output Terminal"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
        Instruction Text:
      </div>

      <textarea
        className="w-full text-xs font-mono p-1.5 border border-slate-200 focus:border-emerald-500 outline-none resize-none nodrag bg-slate-50 text-slate-800"
        rows={3}
        value={data.label || ''}
        onChange={(e) => updateNodeData(id, { label: e.target.value })}
        placeholder="Enter initial instruction text..."
      />

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (executionStatus === 'running') {
              stopWorkflow();
            } else {
              runWorkflow();
            }
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold border transition-colors rounded-none cursor-pointer nodrag ${
            executionStatus === 'running'
              ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
              : 'bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          {executionStatus === 'running' ? (
            <>
              <Square className="w-2.5 h-2.5 fill-rose-700 text-rose-700" />
              STOP
            </>
          ) : (
            <>
              <Play className="w-2.5 h-2.5 fill-emerald-700 text-emerald-700" />
              RUN
            </>
          )}
        </button>
        <span className="text-[9px] text-slate-400 font-mono">Click to execute</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="source"
        className="w-4 h-4 !bg-emerald-500 !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
      />
    </div>
  );
});
InputTriggerNode.displayName = 'InputTriggerNode';

// Node Types registry for React Flow
export const nodeTypes = {
  trigger: TriggerNode,
  input_trigger: InputTriggerNode,
  agent: AgentNode,
  supervisor: SupervisorNode,
  mcp_tool: MCPToolNode,
};
