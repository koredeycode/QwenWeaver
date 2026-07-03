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
  Scale,
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
      className={`w-64 bg-white border-2 ${isSelected ? 'border-primary shadow-[0_2px_12px_rgba(249, 115, 22,0.15)]' : getStatusStyles(status)} text-slate-800 p-3 relative font-sans shadow-sm`}
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
  const storeStatus = useStore((s) => s.nodeStatuses[id] || 'pending');
  const isSelected = useStore((s) => s.selectedNodeId === id);
  const setMaximizedNodeId = useStore((s) => s.setMaximizedNodeId);
  const status = data._executionStatus || storeStatus;

  return (
    <div
      className={`w-72 bg-white border-2 ${isSelected ? 'border-primary shadow-[0_2px_12px_rgba(249, 115, 22,0.15)]' : getStatusStyles(status)} text-slate-800 p-3 relative font-sans shadow-sm`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="w-4 h-4 !bg-[#f97316] !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="w-4 h-4 !bg-purple-500 !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
        title="Connect to MCP Tool"
      />

      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="w-4 h-4 !bg-purple-500 !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
        title="Receives from MCP Tool"
      />

      <div className="flex items-center justify-between border-b border-outline-variant pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#f97316]" />
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

      {/* Terminal Output stream display (Moved to MaximizedNodeOverlay per user request) */}

      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="w-4 h-4 !bg-[#f97316] !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
      />
    </div>
  );
});
AgentNode.displayName = 'AgentNode';

// --- 3. Supervisor Node Component ---
export const SupervisorNode = memo(({ id, data }: NodeProps<any>) => {
  const storeStatus = useStore((s) => s.nodeStatuses[id] || 'pending');
  const isSelected = useStore((s) => s.selectedNodeId === id);
  const setMaximizedNodeId = useStore((s) => s.setMaximizedNodeId);
  const status = data._executionStatus || storeStatus;

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

      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="w-4 h-4 !bg-purple-500 !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
        title="Receives from MCP Tool"
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

      {/* Terminal Output stream display (Moved to MaximizedNodeOverlay per user request) */}

      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="w-4 h-4 !bg-[#2563eb] !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
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
  const setMcpConfigDialogNodeId = useStore((s) => s.setMcpConfigDialogNodeId);
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

      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="w-2.5 h-2.5 !bg-purple-500 !border-2 !border-white hover:scale-125 transition-all shadow-sm"
        title="Connects to next agent"
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMcpConfigDialogNodeId(id);
            }}
            className="p-0.5 hover:bg-purple-100 text-purple-600 hover:text-purple-800 transition-colors nodrag cursor-pointer text-[6px] font-mono font-bold border border-purple-200 px-1"
            title="Configure MCP Server"
          >
            CONFIG
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
      className={`w-72 bg-white border-2 ${isSelected ? 'border-primary shadow-[0_2px_12px_rgba(249, 115, 22,0.15)]' : getStatusStyles(status)} text-slate-800 p-3 relative font-sans shadow-sm`}
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

// --- 6. File Trigger Node Component ---
export const FileTriggerNode = memo(({ id, data }: NodeProps<any>) => {
  const status = useStore((s) => s.nodeStatuses[id] || 'pending');
  const isSelected = useStore((s) => s.selectedNodeId === id);
  const setMaximizedNodeId = useStore((s) => s.setMaximizedNodeId);

  return (
    <div
      className={`w-72 bg-white border-2 ${isSelected ? 'border-primary shadow-[0_2px_12px_rgba(249,115,22,0.15)]' : getStatusStyles(status)} text-slate-800 p-3 relative font-sans shadow-sm`}
    >
      <div className="flex items-center justify-between border-b border-outline-variant pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-cyan-600" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-600">
            FILE TRIGGER
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

      {data.fileUrl ? (
        <div className="space-y-2">
          <div className="w-full aspect-video bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
            <img
              src={data.fileUrl}
              alt={data.fileName || 'Uploaded image'}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
            <Upload className="w-3 h-3 text-cyan-500" />
            <span className="truncate">{data.fileName || 'Image uploaded'}</span>
          </div>
        </div>
      ) : (
        <div className="py-6 flex flex-col items-center justify-center text-center border border-dashed border-slate-300 bg-slate-50">
          <Upload className="w-6 h-6 text-slate-300 mb-1" />
          <p className="text-[10px] font-mono text-slate-400">No image uploaded</p>
          <p className="text-[9px] text-slate-400 font-mono mt-1">
            Configure in the Inspector panel
          </p>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id="source"
        className="w-4 h-4 !bg-cyan-500 !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
      />
    </div>
  );
});
FileTriggerNode.displayName = 'FileTriggerNode';

// --- 7. Debate Arena Node Component ---
export const DebateArenaNode = memo(({ id, data }: NodeProps<any>) => {
  const storeStatus = useStore((s) => s.nodeStatuses[id] || 'pending');
  const isSelected = useStore((s) => s.selectedNodeId === id);
  const setMaximizedNodeId = useStore((s) => s.setMaximizedNodeId);
  const status = data._executionStatus || storeStatus;
  const config = data.debateArenaConfig ?? {};

  return (
    <div
      className={`w-72 bg-white border-2 ${isSelected ? 'border-amber-500 shadow-[0_2px_12px_rgba(245,158,11,0.15)]' : getStatusStyles(status)} text-slate-800 p-3 relative font-sans shadow-sm`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="w-4 h-4 !bg-amber-500 !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
      />

      <div className="flex items-center justify-between border-b border-amber-200 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-amber-600" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-amber-600">
            DEBATE ARENA ({config.mode ?? 'debate'})
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
            title="View Debate Transcript"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="text-sm font-bold tracking-tight text-slate-900">
        {data.label || 'Debate Arena'}
      </div>

      <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-slate-500">
        <span className="bg-amber-50 border border-amber-200 px-1.5 py-0.5">
          {config.maxRounds ?? 3} rounds
        </span>
        <span className="bg-amber-50 border border-amber-200 px-1.5 py-0.5">participants</span>
        {config.hasArbitrator && (
          <span className="bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-blue-600">
            arbitrator
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="w-4 h-4 !bg-amber-500 !border-2 !border-slate-700 hover:scale-125 transition-all shadow-sm"
      />
    </div>
  );
});
DebateArenaNode.displayName = 'DebateArenaNode';

// Node Types registry for React Flow
export const nodeTypes = {
  trigger: TriggerNode,
  input_trigger: InputTriggerNode,
  file_trigger: FileTriggerNode,
  agent: AgentNode,
  supervisor: SupervisorNode,
  mcp_tool: MCPToolNode,
  debate_arena: DebateArenaNode,
};
