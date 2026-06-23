import React, { useState } from 'react';
import { useStore } from '../store/index.js';
import { 
  X,
  Bot,
  Brain,
  Wrench,
  Play,
  PanelLeft,
  PanelRight
} from 'lucide-react';

export const MaximizedNodeOverlay = () => {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const maximizedNodeId = useStore((s) => s.maximizedNodeId);
  const setMaximizedNodeId = useStore((s) => s.setMaximizedNodeId);
  
  const maximizedNodeOutput = useStore((s) => s.nodeOutputs[maximizedNodeId || ''] || '');
  const maximizedNodeStatus = useStore((s) => s.nodeStatuses[maximizedNodeId || ''] || 'pending');

  const [showOverlayLeft, setShowOverlayLeft] = useState(true);
  const [showOverlayRight, setShowOverlayRight] = useState(true);

  if (!maximizedNodeId) return null;

  const maximizedNode = nodes.find((n) => n.id === maximizedNodeId);
  if (!maximizedNode) return null;

  const getNodeIcon = (type?: string) => {
    switch (type) {
      case 'trigger':
      case 'input_trigger':
        return <Play className="w-4 h-4 text-emerald-600 fill-emerald-600/10" />;
      case 'agent':
        return <Bot className="w-4 h-4 text-[#ea580c]" />;
      case 'supervisor':
        return <Brain className="w-4 h-4 text-[#2563eb]" />;
      case 'mcp_tool':
        return <Wrench className="w-4 h-4 text-purple-655" />;
      default:
        return null;
    }
  };

  const incomingEdges = edges.filter((e) => e.target === maximizedNodeId);
  const outgoingEdges = edges.filter((e) => e.source === maximizedNodeId);

  const incomingNodes = nodes.filter((n) => incomingEdges.some((e) => e.source === n.id));
  const outgoingNodes = nodes.filter((n) => outgoingEdges.some((e) => e.target === n.id));

  return (
    <div 
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[999] flex items-center justify-center p-6 select-text pointer-events-auto"
      onClick={() => setMaximizedNodeId(null)}
    >
      <div 
        className="bg-white border-2 border-slate-900 shadow-2xl rounded-none w-full max-w-4xl h-[85vh] flex flex-col relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white text-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-3">
            {getNodeIcon(maximizedNode.type)}
            <div>
              <div className="text-[10px] font-mono text-slate-400 font-bold tracking-wider uppercase">
                {(maximizedNode.type || '').replace('_', ' ')} NODE &bull; STATUS: {maximizedNodeStatus.toUpperCase()}
              </div>
              <h2 className="text-sm font-bold font-mono text-slate-800 tracking-tight">
                {maximizedNode.data.label || 'Node Details'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOverlayLeft(!showOverlayLeft)}
              className={`p-1.5 rounded-none transition-colors cursor-pointer border ${
                showOverlayLeft 
                  ? 'bg-slate-100 text-[#ea580c] border-slate-200 hover:bg-slate-200' 
                  : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
              }`}
              title={showOverlayLeft ? "Hide Left Parameters Panel" : "Show Left Parameters Panel"}
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowOverlayRight(!showOverlayRight)}
              className={`p-1.5 rounded-none transition-colors cursor-pointer border ${
                showOverlayRight 
                  ? 'bg-slate-100 text-[#ea580c] border-slate-200 hover:bg-slate-200' 
                  : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
              }`}
              title={showOverlayRight ? "Hide Right Connections Panel" : "Show Right Connections Panel"}
            >
              <PanelRight className="w-4 h-4" />
            </button>
            <div className="h-6 w-[1px] bg-slate-200 mx-1" />
            <button 
              onClick={() => setMaximizedNodeId(null)}
              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Close overlay (Esc)"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* Left Side: Parameters / Details */}
          {showOverlayLeft && (
            <div className="w-full md:w-72 p-6 space-y-4 bg-slate-50 overflow-y-auto">
              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">Node Identifier</label>
                <div className="font-mono text-[11px] text-slate-800 bg-white border border-slate-200 p-2 select-all break-all">
                  {maximizedNode.id}
                </div>
              </div>

              {maximizedNode.data.model && (
                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">Model Engine</label>
                  <div className="font-mono text-xs font-bold text-slate-800 bg-white border border-slate-200 p-2">
                    {maximizedNode.data.model}
                  </div>
                </div>
              )}

              {maximizedNode.data.mcpServerUrl && (
                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">MCP URL Endpoint</label>
                  <div className="font-mono text-xs text-slate-700 bg-white border border-slate-200 p-2 select-all overflow-x-auto truncate">
                    {maximizedNode.data.mcpServerUrl}
                  </div>
                </div>
              )}

              {maximizedNode.data.systemPrompt && (
                <div className="flex flex-col min-h-[180px]">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">System Instructions</label>
                  <textarea 
                    readOnly
                    disabled
                    className="flex-1 w-full text-[11px] font-mono p-3 bg-white border border-slate-200 text-slate-500 resize-none outline-none leading-relaxed"
                    value={maximizedNode.data.systemPrompt}
                  />
                </div>
              )}

              {maximizedNode.type === 'input_trigger' && (
                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">Live Custom Instruction</label>
                  <textarea
                    className="w-full text-xs font-mono p-2 border border-slate-200 focus:border-emerald-500 outline-none resize-none bg-white text-slate-800"
                    rows={4}
                    value={maximizedNode.data.label || ''}
                    onChange={(e) => useStore.getState().updateNodeData(maximizedNode.id, { label: e.target.value })}
                    placeholder="Enter instruction to feed upstream..."
                  />
                </div>
              )}
            </div>
          )}

          {/* Middle Side: Log Console Terminal */}
          <div className="flex-1 min-w-0 p-6 flex flex-col bg-slate-950 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 tracking-wider">
                <span>CONSOLE TELEMETRY OUTPUT</span>
                {maximizedNodeStatus === 'running' && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse border border-slate-700" />
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-500">AUTO-SCROLL ENABLED</span>
            </div>

            <div 
              className="flex-1 font-mono text-[11px] leading-relaxed overflow-y-auto whitespace-pre-wrap p-2 select-text scrollbar"
              ref={(el) => {
                if (el) {
                  el.scrollTop = el.scrollHeight;
                }
              }}
            >
              {maximizedNodeOutput || `[System] Node is in ${maximizedNodeStatus} state. Awaiting telemetry stream...`}
              {maximizedNodeStatus === 'running' && <span className="animate-pulse text-orange-500 ml-0.5">_</span>}
            </div>
          </div>

          {/* Right Side: Connection Navigation */}
          {showOverlayRight && (
            <div className="w-full md:w-72 p-6 space-y-4 bg-slate-50 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">Connected Inputs (Incoming)</label>
                  {incomingNodes.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {incomingNodes.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => setMaximizedNodeId(n.id)}
                          className="w-full text-left p-2 hover:bg-slate-100 hover:text-[#ea580c] border border-slate-200 transition-all text-xs font-mono font-bold flex items-center gap-2 bg-white cursor-pointer rounded-none"
                          title={`Jump to ${n.data.label || n.id}`}
                        >
                          <span className="flex-shrink-0">{getNodeIcon(n.type)}</span>
                          <span className="truncate">{n.data.label || n.id}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono italic text-slate-400">No incoming connections</span>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">Connected Outputs (Outgoing)</label>
                  {outgoingNodes.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {outgoingNodes.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => setMaximizedNodeId(n.id)}
                          className="w-full text-left p-2 hover:bg-slate-100 hover:text-[#ea580c] border border-slate-200 transition-all text-xs font-mono font-bold flex items-center gap-2 bg-white cursor-pointer rounded-none"
                          title={`Jump to ${n.data.label || n.id}`}
                        >
                          <span className="flex-shrink-0">{getNodeIcon(n.type)}</span>
                          <span className="truncate">{n.data.label || n.id}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono italic text-slate-400">No outgoing connections</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 flex items-center justify-between border-t border-slate-200">
          <span className="text-[10px] font-mono text-slate-400">
            Press <kbd className="bg-white px-1 border border-slate-350 text-slate-600 rounded-sm">ESC</kbd> or click backdrop to close
          </span>
          <button
            onClick={() => setMaximizedNodeId(null)}
            className="px-4 py-1.5 bg-slate-900 hover:bg-[#9a3412] text-white text-xs font-mono font-bold transition-all rounded-none cursor-pointer"
          >
            CLOSE OVERLAY
          </button>
        </div>
      </div>
    </div>
  );
};
