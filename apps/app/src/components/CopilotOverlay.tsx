import React, { useState, useRef, useEffect } from 'react';
import { MessageSquareCode, Send, Loader2, X, Sparkles, Check } from 'lucide-react';
import { useStore } from '../store/index.js';

const parseInline = (text: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-extrabold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="bg-slate-100 text-rose-600 px-1 py-0.5 font-mono text-[10px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
};

const renderMarkdown = (text: string) => {
  if (!text) return null;

  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('```')) {
      const match = part.match(/```(\w*)\n([\s\S]*?)```/);
      const lang = match ? match[1] : '';
      const code = match ? match[2] : part.slice(3, -3);
      return (
        <pre
          key={idx}
          className="bg-slate-800 text-slate-100 p-2.5 my-2 overflow-x-auto text-[10px] font-mono leading-normal rounded-none"
        >
          {lang && <div className="text-[8px] text-slate-400 uppercase mb-1 font-sans">{lang}</div>}
          <code>{code}</code>
        </pre>
      );
    }

    const lines = part.split('\n');
    return lines.map((line, lIdx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('# ')) {
        return (
          <h1 key={lIdx} className="text-xs font-mono font-bold text-slate-900 mt-2 mb-1">
            {parseInline(trimmed.slice(2))}
          </h1>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={lIdx} className="text-[11px] font-mono font-bold text-slate-900 mt-2 mb-1">
            {parseInline(trimmed.slice(3))}
          </h2>
        );
      }
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={lIdx} className="text-[10px] font-mono font-bold text-slate-800 mt-1.5 mb-0.5">
            {parseInline(trimmed.slice(4))}
          </h3>
        );
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <ul key={lIdx} className="list-disc pl-4 text-[11px] text-slate-700 my-0.5">
            <li>{parseInline(trimmed.slice(2))}</li>
          </ul>
        );
      }
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <ol key={lIdx} className="list-decimal pl-4 text-[11px] text-slate-700 my-0.5">
            <li>{parseInline(numMatch[2])}</li>
          </ol>
        );
      }

      if (!trimmed) {
        return <div key={lIdx} className="h-1.5" />;
      }

      return (
        <p key={lIdx} className="my-0.5 text-[11px] text-slate-850 leading-relaxed">
          {parseInline(line)}
        </p>
      );
    });
  });
};

const normalizeAction = (act: any): any => {
  if (!act) return { type: 'unknown', payload: {} };
  const type = act.type;

  const getVal = (keys: string[]) => {
    for (const k of keys) {
      if (act.payload?.[k] !== undefined) return act.payload[k];
      if (act[k] !== undefined) return act[k];
    }
    return undefined;
  };

  const id = getVal(['id', 'nodeId', 'edgeId']);
  const ids = getVal(['ids', 'nodeIds', 'edgeIds']);

  if (type === 'add_node') {
    const nodeType = getVal(['type', 'nodeType']) || 'agent';
    const label = getVal(['label']);
    const dataVal = act.data || act.payload?.data || act.payload || {};
    const finalData = typeof dataVal === 'object' ? { ...dataVal } : {};
    if (label && !finalData.label) finalData.label = label;
    return {
      type,
      payload: {
        type: nodeType,
        id,
        position: getVal(['position']) || { x: 150, y: 150 },
        data: finalData,
      },
    };
  }

  if (type === 'add_nodes') {
    const rawList = Array.isArray(act.payload) ? act.payload : act.payload?.nodes || [];
    return {
      type,
      payload: (rawList || []).map((n: any) => {
        const label = n.label || n.payload?.label || n.data?.label;
        const dataVal = n.data || n.payload?.data || n || {};
        const finalData = typeof dataVal === 'object' ? { ...dataVal } : {};
        if (label && !finalData.label) finalData.label = label;
        return {
          type: n.type || n.nodeType || 'agent',
          id: n.id || n.nodeId,
          position: n.position || { x: 150, y: 150 },
          data: finalData,
        };
      }),
    };
  }

  if (type === 'delete_node') {
    return {
      type,
      payload: { id },
    };
  }

  if (type === 'delete_nodes') {
    return {
      type,
      payload: ids || [id].filter(Boolean),
    };
  }

  if (type === 'update_node') {
    const dataVal = act.data || act.payload?.data || act.payload || {};
    const cleanedData = typeof dataVal === 'object' ? { ...dataVal } : {};
    delete cleanedData.type;
    delete cleanedData.nodeId;
    delete cleanedData.id;
    return {
      type,
      payload: {
        id,
        data: cleanedData,
      },
    };
  }

  if (type === 'update_nodes') {
    const rawList = Array.isArray(act.payload) ? act.payload : act.payload?.updates || [];
    return {
      type,
      payload: (rawList || []).map((u: any) => {
        const dataVal = u.data || u.payload?.data || u || {};
        const cleanedData = typeof dataVal === 'object' ? { ...dataVal } : {};
        delete cleanedData.id;
        delete cleanedData.nodeId;
        return {
          id: u.id || u.nodeId,
          data: cleanedData,
        };
      }),
    };
  }

  if (type === 'add_edge') {
    return {
      type,
      payload: {
        id,
        source: getVal(['source']),
        target: getVal(['target']),
        sourceHandle: getVal(['sourceHandle']),
        targetHandle: getVal(['targetHandle']),
      },
    };
  }

  if (type === 'add_edges') {
    const rawList = Array.isArray(act.payload) ? act.payload : act.payload?.edges || [];
    return {
      type,
      payload: (rawList || []).map((e: any) => ({
        id: e.id || e.edgeId,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
    };
  }

  if (type === 'delete_edge') {
    return {
      type,
      payload: { id },
    };
  }

  if (type === 'delete_edges') {
    return {
      type,
      payload: ids || [id].filter(Boolean),
    };
  }

  return act;
};

export const CopilotOverlay = ({
  className = 'fixed bottom-14 right-3 z-50 flex flex-col items-end gap-2 pointer-events-none',
}: {
  className?: string;
}) => {
  const messages = useStore((s) => s.copilotMessages);
  const isTyping = useStore((s) => s.isCopilotTyping);
  const sendMessage = useStore((s) => s.sendCopilotMessage);
  const copilotModel = useStore((s) => s.copilotModel);
  const setCopilotModel = useStore((s) => s.setCopilotModel);
  const updateProposalStatus = useStore((s) => s.updateProposalStatus);

  const applyActions = useStore((s) => s.applyActions);
  const rearrangeGraph = useStore((s) => s.rearrangeGraph);

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (isTyping) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleApproveProposal = (msgIdx: number, proposal: any) => {
    const rawActions = proposal.actions || [];
    const actions = (rawActions || []).map(normalizeAction);

    applyActions(actions);
    rearrangeGraph();
    updateProposalStatus(msgIdx, 'approved');
  };

  return (
    <div className={className}>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          data-tour="copilot"
          className="pointer-events-auto h-11 w-11 bg-orange-600 border border-orange-500 text-white flex items-center justify-center shadow-lg hover:bg-orange-500 transition-all select-none cursor-pointer"
          title="Open Copilot"
        >
          <MessageSquareCode className="w-5 h-5" />
        </button>
      )}

      {/* Main Copilot Box */}
      {isOpen && (
        <div className="pointer-events-auto w-[360px] h-[480px] bg-white border-2 border-slate-900 shadow-xl flex flex-col overflow-hidden select-none">
          {/* Header */}
          <header className="bg-slate-950 text-slate-100 h-10 px-3 flex items-center justify-between border-b-2 border-slate-900">
            <div className="flex items-center gap-1.5">
              <MessageSquareCode className="w-4 h-4 text-orange-500" />
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase">
                Copilot Assistant
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Model Select dropdown */}
              <div className="relative">
                <select
                  value={copilotModel}
                  onChange={(e) => setCopilotModel(e.target.value as any)}
                  className="bg-slate-900 text-slate-300 border border-slate-700 text-[9px] font-mono font-bold py-0.5 px-1 rounded-none outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="qwen3.7-max">QWEN 3.7 MAX</option>
                  <option value="qwen3.7-plus">QWEN 3.7 PLUS</option>
                  <option value="qwen3.6-flash">QWEN 3.6 FLASH</option>
                  <option value="deepseek-v4-pro">DEEPSEEK V4 PRO</option>
                  <option value="deepseek-v4-flash">DEEPSEEK V4 FLASH</option>
                </select>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar">
            {messages.map((msg, idx) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div key={idx} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 text-[11px] leading-relaxed border ${
                      isAssistant
                        ? 'bg-slate-50 border-slate-200 text-slate-800'
                        : 'bg-orange-50/50 border-orange-200 text-slate-900 font-medium'
                    }`}
                  >
                    {/* Role indicator */}
                    <div className="text-[8px] font-mono text-slate-400 mb-1 uppercase tracking-wide">
                      {msg.role}
                    </div>

                    {/* Thinking output (for assistants) */}
                    {isAssistant && msg.thinking && (
                      <div className="mb-2 p-1.5 bg-amber-50/50 border-l-2 border-amber-400 text-slate-500 font-mono text-[9px] max-h-24 overflow-y-auto scrollbar whitespace-pre-wrap select-text leading-tight">
                        <div className="text-[8px] font-mono font-bold text-amber-600 mb-0.5">
                          THINKING BUDGET:
                        </div>
                        {msg.thinking}
                      </div>
                    )}

                    {msg.text && (
                      <div className="font-sans space-y-1">{renderMarkdown(msg.text)}</div>
                    )}

                    {/* Proposal Section */}
                    {msg.proposal && (
                      <div className="mt-3 border border-purple-200 bg-purple-50/20 p-2.5 flex flex-col font-sans">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span className="text-[9px] font-mono font-bold text-purple-700 uppercase tracking-wide">
                            Proposed Changes
                          </span>
                        </div>

                        <div className="space-y-1 text-[9px] font-mono text-slate-600 mb-3 max-h-36 overflow-y-auto scrollbar select-text border border-purple-100 bg-white/70 p-1.5">
                          {(msg.proposal.actions || [])
                            .map(normalizeAction)
                            .map((act: any, aIdx: number) => {
                              if (act.type === 'add_node') {
                                return (
                                  <div
                                    key={aIdx}
                                    className="border-b border-purple-100/40 pb-1 last:border-b-0 last:pb-0"
                                  >
                                    + Add: {act.payload?.data?.label || act.payload?.type || 'Node'}
                                  </div>
                                );
                              }
                              if (act.type === 'add_nodes') {
                                const count = Array.isArray(act.payload) ? act.payload.length : 0;
                                return (
                                  <div
                                    key={aIdx}
                                    className="border-b border-purple-100/40 pb-1 last:border-b-0 last:pb-0"
                                  >
                                    + Add {count} nodes
                                  </div>
                                );
                              }
                              if (act.type === 'delete_node') {
                                return (
                                  <div
                                    key={aIdx}
                                    className="border-b border-purple-100/40 pb-1 last:border-b-0 last:pb-0"
                                  >
                                    - Delete: {act.payload?.id || 'Node'}
                                  </div>
                                );
                              }
                              if (act.type === 'delete_nodes') {
                                const count = Array.isArray(act.payload) ? act.payload.length : 0;
                                return (
                                  <div
                                    key={aIdx}
                                    className="border-b border-purple-100/40 pb-1 last:border-b-0 last:pb-0"
                                  >
                                    - Delete {count} nodes
                                  </div>
                                );
                              }
                              if (act.type === 'update_node') {
                                return (
                                  <div
                                    key={aIdx}
                                    className="border-b border-purple-100/40 pb-1 last:border-b-0 last:pb-0"
                                  >
                                    ✎ Edit: {act.payload?.id || 'Node'}
                                  </div>
                                );
                              }
                              if (act.type === 'update_nodes') {
                                const count = Array.isArray(act.payload) ? act.payload.length : 0;
                                return (
                                  <div
                                    key={aIdx}
                                    className="border-b border-purple-100/40 pb-1 last:border-b-0 last:pb-0"
                                  >
                                    ✎ Edit {count} nodes
                                  </div>
                                );
                              }
                              if (act.type === 'add_edge') {
                                return (
                                  <div
                                    key={aIdx}
                                    className="border-b border-purple-100/40 pb-1 last:border-b-0 last:pb-0"
                                  >
                                    🔗 Link: {act.payload?.source} → {act.payload?.target}
                                  </div>
                                );
                              }
                              if (act.type === 'add_edges') {
                                const count = Array.isArray(act.payload) ? act.payload.length : 0;
                                return (
                                  <div
                                    key={aIdx}
                                    className="border-b border-purple-100/40 pb-1 last:border-b-0 last:pb-0"
                                  >
                                    🔗 Link {count} edges
                                  </div>
                                );
                              }
                              if (act.type === 'delete_edge') {
                                return (
                                  <div
                                    key={aIdx}
                                    className="border-b border-purple-100/40 pb-1 last:border-b-0 last:pb-0"
                                  >
                                    ✀ Cut link: {act.payload?.id || 'Link'}
                                  </div>
                                );
                              }
                              if (act.type === 'delete_edges') {
                                const count = Array.isArray(act.payload) ? act.payload.length : 0;
                                return (
                                  <div
                                    key={aIdx}
                                    className="border-b border-purple-100/40 pb-1 last:border-b-0 last:pb-0"
                                  >
                                    ✀ Cut {count} links
                                  </div>
                                );
                              }
                              return null;
                            })}
                        </div>

                        {msg.proposal.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveProposal(idx, msg.proposal)}
                              className="flex-1 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[9px] flex items-center justify-center gap-1 rounded-none transition-colors cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              APPROVE
                            </button>
                            <button
                              onClick={() => updateProposalStatus(idx, 'rejected')}
                              className="flex-1 py-1 border border-slate-300 hover:bg-slate-50 text-slate-650 font-bold text-[9px] rounded-none transition-all cursor-pointer"
                            >
                              REJECT
                            </button>
                          </div>
                        ) : (
                          <div className="text-center py-1 bg-slate-100 border border-slate-200 text-slate-500 font-mono text-[9px] font-bold uppercase tracking-wider">
                            Proposal {msg.proposal.status}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-50 border border-slate-200 text-slate-500 px-3 py-2 text-[11px] flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Footer Input Area */}
          <footer className="p-3 border-t border-slate-200 bg-slate-50 flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask copilot to build or modify..."
              rows={1}
              className="flex-1 bg-white border border-slate-350 px-2 py-1.5 text-[11px] outline-none focus:border-orange-500 font-sans resize-none scrollbar"
            />
            <button
              onClick={handleSend}
              disabled={isTyping}
              className="px-3 bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </footer>
        </div>
      )}
    </div>
  );
};
