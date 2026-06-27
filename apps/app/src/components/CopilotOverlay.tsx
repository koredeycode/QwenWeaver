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

export const CopilotPanel = ({ onClose }: { onClose: () => void }) => {
  const messages = useStore((s) => s.copilotMessages);
  const isTyping = useStore((s) => s.isCopilotTyping);
  const sendMessage = useStore((s) => s.sendCopilotMessage);
  const copilotModel = useStore((s) => s.copilotModel);
  const setCopilotModel = useStore((s) => s.setCopilotModel);
  const updateProposalStatus = useStore((s) => s.updateProposalStatus);

  const applyActions = useStore((s) => s.applyActions);
  const rearrangeGraph = useStore((s) => s.rearrangeGraph);

  const [input, setInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    <div className="w-[380px] h-full bg-white border-l border-[#cbd5e1] flex flex-col z-20 flex-shrink-0 select-none">
      {/* Panel Header */}
      <div className="h-14 border-b border-[#cbd5e1] px-4 flex items-center justify-between bg-slate-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
          <span className="text-xs font-bold tracking-tight text-slate-800 uppercase font-sans">
            AI Architect Copilot
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Model Selector */}
          <select
            value={copilotModel}
            onChange={(e) => setCopilotModel(e.target.value)}
            className="text-[9px] font-mono border border-slate-200 bg-white px-1.5 py-0.5 rounded-none outline-none text-slate-700 focus:border-slate-400"
          >
            <option value="qwen3.7-max">qwen3.7-max</option>
            <option value="qwen3.7-plus">qwen3.7-plus</option>
            <option value="qwen3.6-flash">qwen3.6-flash</option>
            <option value="deepseek-v4-pro">deepseek-v4-pro</option>
            <option value="deepseek-v4-flash">deepseek-v4-flash</option>
          </select>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 text-slate-500 transition-colors rounded-none cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 min-h-0">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Sender Label */}
            <span className="text-[8px] font-bold text-slate-400 tracking-wider uppercase font-sans">
              {msg.role === 'user' ? 'You' : 'Copilot'}
            </span>

            {/* Bubble */}
            <div
              className={`p-3 max-w-[90%] text-xs shadow-sm font-sans ${
                msg.role === 'user'
                  ? 'bg-slate-900 text-white rounded-none border border-slate-800'
                  : 'bg-white text-slate-800 rounded-none border border-slate-200'
              }`}
            >
              {/* Thinking/Reasoning block (if any) */}
              {msg.thinking && (
                <div className="mb-2.5 p-2 bg-amber-50/60 border-l-2 border-amber-500/50 text-[10px] font-mono text-amber-800 leading-normal whitespace-pre-wrap select-text">
                  <div className="text-[8px] font-bold tracking-widest text-amber-600 uppercase mb-1">
                    Reasoning Process
                  </div>
                  {msg.thinking}
                </div>
              )}

              {/* Render Markdown Response */}
              <div className="select-text space-y-1">
                {msg.text ? (
                  renderMarkdown(msg.text)
                ) : (
                  <p className="text-slate-400 font-mono italic animate-pulse">Generating...</p>
                )}
              </div>

              {/* Proposal actions block (if any) */}
              {msg.proposal && (
                <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 flex flex-col space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-[9px] font-bold text-slate-600 tracking-wide uppercase font-sans">
                      Proposed Layout Edits
                    </span>
                    <span
                      className={`text-[8px] font-extrabold uppercase font-mono px-1 py-0.5 ${
                        msg.proposal.status === 'approved'
                          ? 'text-emerald-700 bg-emerald-50'
                          : msg.proposal.status === 'rejected'
                            ? 'text-rose-700 bg-rose-50'
                            : 'text-amber-700 bg-amber-50'
                      }`}
                    >
                      {msg.proposal.status}
                    </span>
                  </div>

                  {/* List Proposed Changes */}
                  <div className="space-y-1 max-h-32 overflow-y-auto font-mono text-[9px] leading-relaxed text-slate-600">
                    {(msg.proposal.actions || []).map((act, aIdx) => {
                      const norm = normalizeAction(act);
                      if (norm.type === 'add_node') {
                        return (
                          <div key={aIdx} className="text-emerald-600">
                            + Add Node: {norm.payload.data?.label || norm.payload.type}
                          </div>
                        );
                      }
                      if (norm.type === 'delete_node') {
                        return (
                          <div key={aIdx} className="text-rose-600">
                            - Delete Node ID: {norm.payload.id}
                          </div>
                        );
                      }
                      if (norm.type === 'update_node') {
                        return (
                          <div key={aIdx} className="text-blue-600">
                            ~ Update Node ID: {norm.payload.id}
                          </div>
                        );
                      }
                      if (norm.type === 'add_edge') {
                        return (
                          <div key={aIdx} className="text-emerald-600">
                            + Connect: {norm.payload.source} → {norm.payload.target}
                          </div>
                        );
                      }
                      if (norm.type === 'delete_edges') {
                        return (
                          <div key={aIdx} className="text-rose-600">
                            - Disconnect edges: {norm.payload.join(', ')}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>

                  {msg.proposal.status === 'pending' && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleApproveProposal(idx, msg.proposal)}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] tracking-wide uppercase flex items-center justify-center gap-1 rounded-none transition-colors cursor-pointer"
                      >
                        <Check className="w-3 h-3" /> Approve
                      </button>
                      <button
                        onClick={() => updateProposalStatus(idx, 'rejected')}
                        className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-350 text-slate-700 font-bold text-[9px] tracking-wide uppercase flex items-center justify-center gap-1 rounded-none transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={chatBottomRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-[#cbd5e1] bg-white flex-shrink-0">
        <div className="relative flex items-end border border-slate-200 focus-within:border-slate-400 bg-white">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={
              isTyping ? 'Copilot is writing...' : 'Ask the copilot to build workflows...'
            }
            disabled={isTyping}
            rows={2}
            className="flex-1 bg-transparent px-3 py-2 text-xs outline-none text-slate-800 placeholder-slate-400 resize-none font-sans leading-relaxed"
          />
          <div className="p-1 flex items-center">
            <button
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              className="h-8 w-8 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white flex items-center justify-center transition-all select-none cursor-pointer"
            >
              {isTyping ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CopilotOverlay = () => {
  return null;
};
