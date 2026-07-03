import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/index.js';
import {
  X,
  Bot,
  Brain,
  Wrench,
  Play,
  PanelLeft,
  PanelRight,
  Database,
  MessageCircle,
  Scale,
} from 'lucide-react';
import { OutputRenderer } from './OutputRenderer.js';
import { WorkspacePanel } from './panels/WorkspacePanel.js';

export const MaximizedNodeOverlay = () => {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const maximizedNodeId = useStore((s) => s.maximizedNodeId);
  const setMaximizedNodeId = useStore((s) => s.setMaximizedNodeId);

  const storeOutput = useStore((s) => s.nodeOutputs[maximizedNodeId || ''] || '');
  const storeOutputUrl = useStore((s) => s.nodeOutputUrls[maximizedNodeId || ''] || '');
  const storeThinking = useStore((s) => s.nodeThinking[maximizedNodeId || ''] || '');
  const storeStatus = useStore((s) => s.nodeStatuses[maximizedNodeId || ''] || 'pending');
  const storeOutputParts = useStore((s) => s.nodeOutputParts[maximizedNodeId || '']);

  const [showOverlayLeft, setShowOverlayLeft] = useState(false);
  const [showOverlayRight, setShowOverlayRight] = useState(true);
  const [overlayTab, setOverlayTab] = useState<'output' | 'workspace' | 'messages' | 'transcript'>(
    'output',
  );
  const channelMessages = useStore((s) => s.channelMessages);
  const busMessages = useStore((s) => s.busMessages);
  const debateRounds = useStore((s) => s.debateRounds);
  const debateVerdicts = useStore((s) => s.debateVerdicts);
  const workspaceEntries = useStore((s) => s.workspaceEntries);
  const workspaceLoading = useStore((s) => s.workspaceLoading);
  const activeExecutionId = useStore((s) => s.activeExecutionId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number;
    if (scrollRef.current) {
      rafId = requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [storeOutput, storeThinking, channelMessages, busMessages]);

  if (!maximizedNodeId) return null;

  const maximizedNode = nodes.find((n) => n.id === maximizedNodeId);
  if (!maximizedNode) return null;

  const getNodeIcon = (type?: string) => {
    switch (type) {
      case 'trigger':
      case 'input_trigger':
        return <Play className="w-4 h-4 text-emerald-600 fill-emerald-600/10" />;
      case 'agent':
        return <Bot className="w-4 h-4 text-[#f97316]" />;
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
                {(maximizedNode.type || '').replace('_', ' ')} NODE &bull; STATUS:{' '}
                {(maximizedNode.data?._executionStatus || storeStatus).toUpperCase()}
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
                  ? 'bg-slate-100 text-[#f97316] border-slate-200 hover:bg-slate-200'
                  : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
              }`}
              title={showOverlayLeft ? 'Hide Left Parameters Panel' : 'Show Left Parameters Panel'}
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowOverlayRight(!showOverlayRight)}
              className={`p-1.5 rounded-none transition-colors cursor-pointer border ${
                showOverlayRight
                  ? 'bg-slate-100 text-[#f97316] border-slate-200 hover:bg-slate-200'
                  : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
              }`}
              title={
                showOverlayRight ? 'Hide Right Connections Panel' : 'Show Right Connections Panel'
              }
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
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Node Identifier
                </label>
                <div className="font-mono text-[11px] text-slate-800 bg-white border border-slate-200 p-2 select-all break-all">
                  {maximizedNode.id}
                </div>
              </div>

              {maximizedNode.data.model && (
                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Model Engine
                  </label>
                  <div className="font-mono text-xs font-bold text-slate-800 bg-white border border-slate-200 p-2">
                    {maximizedNode.data.model}
                  </div>
                </div>
              )}

              {maximizedNode.data.mcpServerUrl && (
                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    MCP URL Endpoint
                  </label>
                  <div className="font-mono text-xs text-slate-700 bg-white border border-slate-200 p-2 select-all overflow-x-auto truncate">
                    {maximizedNode.data.mcpServerUrl}
                  </div>
                </div>
              )}

              {maximizedNode.data.systemPrompt && (
                <div className="flex flex-col min-h-[180px]">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    System Instructions
                  </label>
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
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Live Custom Instruction
                  </label>
                  <textarea
                    className="w-full text-xs font-mono p-2 border border-slate-200 focus:border-emerald-500 outline-none resize-none bg-white text-slate-800"
                    rows={4}
                    value={maximizedNode.data.label || ''}
                    onChange={(e) =>
                      useStore
                        .getState()
                        .updateNodeData(maximizedNode.id, { label: e.target.value })
                    }
                    placeholder="Enter instruction to feed upstream..."
                  />
                </div>
              )}
            </div>
          )}

          {/* Middle Side: Tabs (Output / Workspace) */}
          <div className="flex-1 min-w-0 flex flex-col bg-white text-slate-800 overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-stretch border-b border-slate-200 shrink-0">
              <button
                onClick={() => setOverlayTab('output')}
                className={`px-4 py-2 text-[10px] font-mono font-bold tracking-wider transition-colors cursor-pointer ${
                  overlayTab === 'output'
                    ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/30'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                MONITOR
                {(maximizedNode.data?._executionStatus || storeStatus) === 'running' && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse border border-slate-200 inline-block ml-1.5" />
                )}
              </button>
              <button
                onClick={() => setOverlayTab('workspace')}
                className={`px-4 py-2 text-[10px] font-mono font-bold tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
                  overlayTab === 'workspace'
                    ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/30'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Database className="w-3 h-3" />
                WORKSPACE
              </button>
              <button
                onClick={() => setOverlayTab('messages')}
                className={`px-4 py-2 text-[10px] font-mono font-bold tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
                  overlayTab === 'messages'
                    ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/30'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                <MessageCircle className="w-3 h-3" />
                MESSAGES
              </button>
              {maximizedNode.type === 'debate_arena' && (
                <button
                  onClick={() => setOverlayTab('transcript')}
                  className={`px-4 py-2 text-[10px] font-mono font-bold tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
                    overlayTab === 'transcript'
                      ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/30'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Scale className="w-3 h-3" />
                  TRANSCRIPT
                </button>
              )}
            </div>

            {/* Tab content */}
            {overlayTab === 'output' ? (
              <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono text-slate-400">AUTO-SCROLL ENABLED</span>
                </div>
                {(storeOutput ||
                  maximizedNode?.data?._output ||
                  storeThinking ||
                  (storeStatus || maximizedNode?.data?._executionStatus) !== 'running') && (
                  <OutputRenderer
                    outputUrl={storeOutputUrl || maximizedNode?.data?._outputUrl}
                    streamingText={storeOutput || maximizedNode?.data?._output}
                    thinkingText={storeThinking}
                    outputParts={storeOutputParts}
                    fileExtension={
                      maximizedNode?.data?.outputFormat === 'markdown'
                        ? 'md'
                        : maximizedNode?.data?.outputFormat || 'txt'
                    }
                    status={storeStatus || maximizedNode?.data?._executionStatus}
                  />
                )}
                {!maximizedNode?.data?._output &&
                  !storeOutput &&
                  !storeThinking &&
                  (maximizedNode?.data?._executionStatus || storeStatus) === 'running' && (
                    <div className="flex-1 font-mono text-[11px] leading-relaxed p-2 text-slate-500">
                      Awaiting telemetry stream...
                      <span className="animate-pulse text-orange-500 ml-0.5">_</span>
                    </div>
                  )}
              </div>
            ) : overlayTab === 'messages' ? (
              <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto">
                <div className="text-[10px] font-mono text-slate-400 mb-3 tracking-wider">
                  MESSAGES
                </div>
                {(() => {
                  const nodeBusMessages = busMessages.filter(
                    (m) => m.sourceNodeId === maximizedNodeId || m.topic.includes(maximizedNodeId),
                  );
                  const hasMessages = nodeBusMessages.length > 0 || channelMessages.length > 0;

                  if (!hasMessages) {
                    return (
                      <div className="font-mono text-[11px] text-slate-400 italic">
                        Agent-to-agent messages appear here during execution. Enable conversation
                        mode on edges for multi-round exchanges.
                      </div>
                    );
                  }

                  const displayMessages = (
                    nodeBusMessages.length > 0 ? nodeBusMessages : channelMessages
                  ).map((m, i) => {
                    const msg = m as any;
                    const fromNodeId = msg.sourceNodeId ?? msg.fromNodeId;
                    const toNodeId = msg.toNodeId;
                    const payload = msg.payload;
                    const content =
                      payload && typeof payload === 'object'
                        ? (payload.text ?? JSON.stringify(payload))
                        : (msg.content ?? String(payload ?? ''));
                    const round = msg.round;
                    const channelOrTopic = msg.topic
                      ? (msg.topic.split(':').pop() ?? msg.topic)
                      : (msg.channelId ?? '');

                    return (
                      <div
                        key={i}
                        className={`border p-3 font-mono text-xs ${
                          fromNodeId === maximizedNodeId
                            ? 'bg-orange-50 border-orange-200 ml-6'
                            : toNodeId === maximizedNodeId
                              ? 'bg-blue-50 border-blue-200 mr-6'
                              : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1 text-[10px] text-slate-500">
                          <span className="font-bold">
                            {fromNodeId === maximizedNodeId
                              ? 'SENT'
                              : toNodeId === maximizedNodeId
                                ? 'RECEIVED'
                                : `${fromNodeId}${toNodeId ? ` → ${toNodeId}` : ''}`}
                          </span>
                          <span>
                            {round ? `round ${round} · ` : ''}
                            {channelOrTopic}
                          </span>
                        </div>
                        <div className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                          {content}
                        </div>
                      </div>
                    );
                  });

                  return <div className="space-y-3">{displayMessages}</div>;
                })()}
              </div>
            ) : overlayTab === 'transcript' && maximizedNode.type === 'debate_arena' ? (
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="text-[10px] font-mono text-slate-400 mb-3 tracking-wider">
                  DEBATE TRANSCRIPT
                </div>
                {debateRounds.filter((r) => r.arenaId === maximizedNode.id).length === 0 ? (
                  <div className="font-mono text-[11px] text-slate-400 italic">
                    No debate rounds yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {debateRounds
                      .filter((r) => r.arenaId === maximizedNode.id)
                      .map((round) => (
                        <div key={round.round} className="border border-amber-200 p-3">
                          <div className="text-[10px] font-mono font-bold text-amber-600 mb-2 tracking-wider">
                            ROUND {round.round}
                          </div>
                          <div className="space-y-2">
                            {round.statements.map((s, i) => (
                              <div key={i} className="border-l-2 border-amber-300 pl-3">
                                <div className="text-[10px] font-mono font-bold text-slate-600 mb-1">
                                  {s.participantId}
                                </div>
                                <div className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                                  {s.content || '(empty)'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    {debateVerdicts
                      .filter((v) => v.arenaId === maximizedNode.id)
                      .map((v, i) => (
                        <div key={i} className="border border-blue-200 bg-blue-50 p-3">
                          <div className="text-[10px] font-mono font-bold text-blue-600 mb-2 tracking-wider">
                            VERDICT
                          </div>
                          <div className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                            {v.verdict}
                          </div>
                          {v.scores && Object.keys(v.scores).length > 0 && (
                            <div className="mt-2 text-[10px] font-mono text-slate-600">
                              {Object.entries(v.scores).map(([id, score]) => (
                                <span key={id} className="mr-3">
                                  {id}: {score}/10
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-hidden">
                <WorkspacePanel
                  entries={workspaceEntries}
                  loading={workspaceLoading}
                  onRefresh={() => {
                    const eid = useStore.getState().activeExecutionId;
                    if (eid) useStore.getState().fetchWorkspaceEntries(eid);
                  }}
                  activeExecutionId={activeExecutionId}
                />
              </div>
            )}
          </div>

          {/* Right Side: Connection Navigation */}
          {showOverlayRight && (
            <div className="w-full md:w-72 p-6 space-y-4 bg-slate-50 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Connected Inputs (Incoming)
                  </label>
                  {incomingNodes.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {incomingNodes.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => setMaximizedNodeId(n.id)}
                          className="w-full text-left p-2 hover:bg-slate-100 hover:text-[#f97316] border border-slate-200 transition-all text-xs font-mono font-bold flex items-center gap-2 bg-white cursor-pointer rounded-none"
                          title={`Jump to ${n.data.label || n.id}`}
                        >
                          <span className="flex-shrink-0">{getNodeIcon(n.type)}</span>
                          <span className="truncate">{n.data.label || n.id}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono italic text-slate-400">
                      No incoming connections
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Connected Outputs (Outgoing)
                  </label>
                  {outgoingNodes.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {outgoingNodes.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => setMaximizedNodeId(n.id)}
                          className="w-full text-left p-2 hover:bg-slate-100 hover:text-[#f97316] border border-slate-200 transition-all text-xs font-mono font-bold flex items-center gap-2 bg-white cursor-pointer rounded-none"
                          title={`Jump to ${n.data.label || n.id}`}
                        >
                          <span className="flex-shrink-0">{getNodeIcon(n.type)}</span>
                          <span className="truncate">{n.data.label || n.id}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono italic text-slate-400">
                      No outgoing connections
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 flex items-center justify-between border-t border-slate-200">
          <span className="text-[10px] font-mono text-slate-400">
            Press{' '}
            <kbd className="bg-white px-1 border border-slate-350 text-slate-600 rounded-sm">
              ESC
            </kbd>{' '}
          </span>
          <button
            onClick={() => setMaximizedNodeId(null)}
            className="px-4 py-1.5 bg-slate-900 hover:bg-[#ea580c] text-white text-xs font-mono font-bold transition-all rounded-none cursor-pointer"
          >
            CLOSE OVERLAY
          </button>
        </div>
      </div>
    </div>
  );
};
