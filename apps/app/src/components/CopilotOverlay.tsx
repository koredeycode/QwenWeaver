import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Send,
  Loader2,
  X,
  Sparkles,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  CheckCheck,
  Mic,
  MicOff,
  Volume2,
  Plus,
} from 'lucide-react';
import { useStore } from '../store/index.js';
import { renderMarkdown } from '../utils/markdown.js';
import { toast } from 'sonner';
const normalizeAction = (act: any): any => {
  if (!act) return { type: 'unknown', payload: {} };

  // Normalize AI raw format (node/edge wrapper) to payload format
  if (act.node) {
    act = { ...act, payload: act.node };
    delete act.node;
  }
  if (act.edge) {
    act = { ...act, payload: act.edge };
    delete act.edge;
  }

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
    const finalIds = Array.isArray(act.payload) ? act.payload : ids || [id].filter(Boolean);
    return {
      type,
      payload: finalIds,
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
    const finalIds = Array.isArray(act.payload) ? act.payload : ids || [id].filter(Boolean);
    return {
      type,
      payload: finalIds,
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
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [thinkingCollapsed, setThinkingCollapsed] = useState<Record<number, boolean>>({});
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [statusVerb, setStatusVerb] = useState('creating');
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = Number(localStorage.getItem('copilotPanelWidth'));
    return saved >= 320 && saved <= 720 ? saved : 380;
  });
  const widthRef = useRef(panelWidth);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = widthRef.current;
    const onMove = (ev: MouseEvent) => {
      const next = Math.min(720, Math.max(320, startWidth + (startX - ev.clientX)));
      widthRef.current = next;
      setPanelWidth(next);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('copilotPanelWidth', String(widthRef.current));
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const VERBS = useMemo(
    () => ['creating', 'weaving', 'designing', 'analyzing', 'crafting', 'building', 'architecting'],
    [],
  );

  useEffect(() => {
    if (!isTyping) return;
    const interval = setInterval(() => {
      setStatusVerb((prev) => {
        const currentIdx = VERBS.indexOf(prev);
        return VERBS[(currentIdx + 1) % VERBS.length];
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [isTyping, VERBS]);

  const latestPendingProposal = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'assistant' && msg.proposal && msg.proposal.status === 'pending') {
        return { msgIdx: i, proposal: msg.proposal };
      }
    }
    return null;
  }, [messages]);

  const copyToClipboard = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      /* clipboard not available */
    }
  };

  const toggleThinking = (idx: number) => {
    setThinkingCollapsed((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getThinkingCollapsed = (
    idx: number,
    thinking: string | undefined,
    text: string | undefined,
  ): boolean => {
    const manual = thinkingCollapsed[idx];
    if (manual !== undefined) return manual;
    if (text) return true;
    if (thinking) return false;
    return true;
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const [isRecording, setIsRecording] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      recognitionRef.current?.stop?.();
    };
  }, []);

  const startRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onresult = (event: any) => {
          const transcript = event.results?.[0]?.[0]?.transcript?.trim();
          if (transcript) setInput((prev) => (prev ? prev + ' ' + transcript : transcript));
          setIsRecording(false);
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);
        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
      })
      .catch(() => toast.error('Microphone access denied'));
  };

  const stopRecording = () => {
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    setIsRecording(false);
  };

  const speakMessage = async (text: string, idx: number) => {
    if (speakingIdx === idx || !text) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      if (speakingIdx === idx) {
        setSpeakingIdx(null);
        return;
      }
    }
    setSpeakingIdx(idx);
    try {
      const res = await fetch('/api/copilot/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const data = await res.json();
      const audio = new Audio(data.audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        audioRef.current = null;
        setSpeakingIdx(null);
      };
      audio.onerror = () => {
        audioRef.current = null;
        setSpeakingIdx(null);
      };
      await audio.play();
    } catch {
      setSpeakingIdx(null);
      toast.error('Failed to play audio');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (isTyping) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleApproveProposal = (msgIdx: number, proposal: any) => {
    if (!proposal) return;

    const rawActions = Array.isArray(proposal.actions)
      ? proposal.actions
      : proposal.actions &&
          typeof proposal.actions === 'object' &&
          typeof proposal.actions.type === 'string'
        ? [proposal.actions]
        : proposal.actions &&
            typeof proposal.actions === 'object' &&
            Array.isArray(proposal.actions.actions)
          ? proposal.actions.actions
          : [];

    const actions = rawActions.map(normalizeAction);

    if (actions.length === 0) {
      toast.error('No changes to apply from this proposal');
      return;
    }

    try {
      applyActions(actions);
      rearrangeGraph();
      toast.success(`Applied ${actions.length} canvas change${actions.length > 1 ? 's' : ''}`);
    } catch (e) {
      toast.error('Failed to apply copilot changes');
      console.error('applyActions error:', e);
      return;
    }
    updateProposalStatus(msgIdx, 'approved');
  };

  return (
    <div
      className="relative h-full bg-white border-l border-[#cbd5e1] flex flex-col z-20 flex-shrink-0 select-none"
      style={{ width: panelWidth }}
      data-tour="copilot-panel"
    >
      <div
        onMouseDown={handleResizeStart}
        className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-orange-400/40 active:bg-orange-400/60 z-30"
        title="Drag to resize"
      />
      {/* Panel Header */}
      <div className="h-14 border-b border-[#cbd5e1] px-4 flex items-center justify-between bg-slate-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
          <span className="text-xs font-bold tracking-tight text-slate-800 uppercase font-sans">
            AI Architect Copilot
          </span>
        </div>
        <div className="flex items-center gap-2">
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
            className={`group flex flex-col space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Sender Label */}
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-bold text-slate-400 tracking-wider uppercase font-sans">
                {msg.role === 'user' ? 'You' : 'Copilot'}
              </span>
              <button
                onClick={() =>
                  copyToClipboard(msg.text || (typeof msg === 'string' ? msg : ''), idx)
                }
                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-500 transition-all cursor-pointer"
                title="Copy message"
              >
                {copiedIdx === idx ? (
                  <CheckCheck className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
              {msg.role === 'assistant' && msg.text && !isTyping && (
                <button
                  onClick={() => speakMessage(msg.text || '', idx)}
                  disabled={speakingIdx !== null && speakingIdx !== idx}
                  className={`opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-500 transition-all cursor-pointer ${
                    speakingIdx === idx ? '!opacity-100 text-emerald-500 animate-pulse' : ''
                  }`}
                  title={speakingIdx === idx ? 'Playing...' : 'Listen'}
                >
                  <Volume2 className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Bubble */}
            <div
              className={`p-3 max-w-[90%] text-xs shadow-sm font-sans ${
                msg.role === 'user'
                  ? 'bg-slate-900 text-white rounded-none border border-slate-800'
                  : 'bg-white text-slate-800 rounded-none border border-slate-200'
              }`}
            >
              {/* Thinking/Reasoning block (if any) */}
              {msg.thinking &&
                (() => {
                  const collapsed = getThinkingCollapsed(idx, msg.thinking, msg.text);
                  return (
                    <div className="mb-2.5 bg-amber-50/60 border-l-2 border-amber-500/50 overflow-hidden">
                      <button
                        onClick={() => toggleThinking(idx)}
                        className="w-full flex items-center justify-between p-2 text-[10px] font-mono font-bold text-amber-700 hover:bg-amber-100/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          {collapsed ? (
                            <ChevronRight className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                          <span>Reasoning Process</span>
                        </div>
                        {!msg.text && !collapsed && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        )}
                      </button>
                      {!collapsed && (
                        <div className="p-2 border-t border-amber-200/50 text-[10px] font-mono text-amber-800 leading-normal whitespace-pre-wrap select-text">
                          {msg.thinking}
                        </div>
                      )}
                    </div>
                  );
                })()}

              {/* Render Markdown Response */}
              <div className="select-text space-y-1">
                {msg.text ? (
                  renderMarkdown(msg.text)
                ) : !msg.proposal ? (
                  <p className="text-slate-400 font-mono italic animate-pulse">Generating...</p>
                ) : null}
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
                    {(() => {
                      const rawActions = (msg.proposal.actions || []) as any;
                      const actionsList = Array.isArray(rawActions)
                        ? rawActions
                        : rawActions &&
                            typeof rawActions === 'object' &&
                            typeof rawActions.type === 'string'
                          ? [rawActions]
                          : rawActions &&
                              typeof rawActions === 'object' &&
                              Array.isArray(rawActions.actions)
                            ? rawActions.actions
                            : [];
                      return actionsList.map((act: any, aIdx: number) => {
                        const norm = normalizeAction(act);
                        if (norm.type === 'add_node') {
                          return (
                            <div key={aIdx} className="text-emerald-600">
                              + Add Node: {norm.payload.data?.label || norm.payload.type}
                            </div>
                          );
                        }
                        if (norm.type === 'add_nodes') {
                          return (
                            <div key={aIdx} className="text-emerald-600">
                              + Add {norm.payload.length} Nodes
                            </div>
                          );
                        }
                        if (norm.type === 'delete_node') {
                          return (
                            <div key={aIdx} className="text-rose-600">
                              - Delete Node: {norm.payload.id}
                            </div>
                          );
                        }
                        if (norm.type === 'delete_nodes') {
                          return (
                            <div key={aIdx} className="text-rose-600">
                              - Delete {norm.payload.length} Nodes
                            </div>
                          );
                        }
                        if (norm.type === 'update_node') {
                          return (
                            <div key={aIdx} className="text-blue-600">
                              ~ Update Node: {norm.payload.id}
                            </div>
                          );
                        }
                        if (norm.type === 'update_nodes') {
                          return (
                            <div key={aIdx} className="text-blue-600">
                              ~ Update {norm.payload.length} Nodes
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
                        if (norm.type === 'add_edges') {
                          return (
                            <div key={aIdx} className="text-emerald-600">
                              + Connect {norm.payload.length} Edges
                            </div>
                          );
                        }
                        if (norm.type === 'delete_edge') {
                          return (
                            <div key={aIdx} className="text-rose-600">
                              - Disconnect Edge: {norm.payload.id}
                            </div>
                          );
                        }
                        if (norm.type === 'delete_edges') {
                          return (
                            <div key={aIdx} className="text-rose-600">
                              - Disconnect {norm.payload.length} Edges
                            </div>
                          );
                        }
                        return null;
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* Text received after the proposal was emitted */}
              {msg.textAfterProposal && (
                <div className="mt-2 select-text space-y-1">
                  {renderMarkdown(msg.textAfterProposal)}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={chatBottomRef} />
      </div>

      {/* Floating Proposal Bar — latest pending proposal always visible above input */}
      {latestPendingProposal && (
        <div className="px-3 py-2 border-t border-emerald-200 bg-emerald-50 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-bold text-emerald-700 uppercase font-sans tracking-wide truncate">
              Pending Proposal
            </span>
            <span className="text-[9px] font-extrabold text-amber-700 uppercase font-mono bg-amber-50 px-1 py-0.5 flex-shrink-0">
              {latestPendingProposal.proposal.actions.length} change
              {latestPendingProposal.proposal.actions.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex gap-2 mt-1.5">
            <button
              onClick={() =>
                handleApproveProposal(latestPendingProposal.msgIdx, latestPendingProposal.proposal)
              }
              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] tracking-wide uppercase flex items-center justify-center gap-1 rounded-none transition-colors cursor-pointer"
            >
              <Check className="w-3 h-3" /> Approve
            </button>
            <button
              onClick={() => updateProposalStatus(latestPendingProposal.msgIdx, 'rejected')}
              className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[9px] tracking-wide uppercase flex items-center justify-center gap-1 rounded-none transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" /> Reject
            </button>
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="p-3 border-t border-[#cbd5e1] bg-white flex-shrink-0">
        <div
          className={`relative flex flex-col rounded-none p-2 transition-all border ${
            isTyping
              ? 'border-orange-300 bg-orange-50/30'
              : 'border-slate-200 focus-within:border-slate-400 bg-white'
          }`}
        >
          {isTyping && (
            <div className="absolute -top-2.5 left-3 px-1.5 bg-orange-100 text-[8px] font-extrabold text-orange-600 uppercase font-sans tracking-widest animate-pulse border border-orange-200">
              Copilot is {statusVerb}...
            </div>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={isTyping ? '' : 'Ask anything, @ to mention, / for actions'}
            disabled={isTyping}
            rows={2}
            className="w-full bg-transparent px-3 py-1.5 text-xs outline-none text-slate-800 placeholder-slate-400 resize-none font-sans leading-relaxed disabled:cursor-wait"
          />
          <div className="mt-2 flex items-center justify-between px-2 pb-1.5">
            {/* Model Selector */}
            <div className="relative flex items-center">
              {isModelDropdownOpen && (
                <>
                  {/* Backdrop overlay to close when clicking outside */}
                  <div
                    className="fixed inset-0 z-30 bg-transparent cursor-default"
                    onClick={() => setIsModelDropdownOpen(false)}
                  />
                  {/* Dropdown Menu Popover */}
                  <div className="absolute bottom-full mb-1 left-0 z-40 bg-white border border-slate-200 shadow-md rounded-none py-1 min-w-[130px] flex flex-col">
                    {[
                      'qwen3.7-max',
                      'qwen3.7-plus',
                      'qwen3.6-flash',
                      'deepseek-v4-pro',
                      'deepseek-v4-flash',
                    ].map((model) => (
                      <button
                        key={model}
                        type="button"
                        onClick={() => {
                          setCopilotModel(model);
                          setIsModelDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-[10px] font-mono hover:bg-slate-50 transition-colors ${
                          copilotModel === model
                            ? 'text-orange-600 bg-orange-50/40 font-bold'
                            : 'text-slate-600 hover:text-slate-800'
                        }`}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="relative flex items-center bg-slate-50 hover:bg-slate-100 border border-slate-200 pl-2 pr-6 py-0.5 transition-colors rounded-none cursor-pointer text-[10px] font-mono text-slate-600 hover:text-slate-800 select-none"
              >
                <span>{copilotModel}</span>
                <ChevronDown className="w-3 h-3 absolute right-1.5 text-slate-400" />
              </button>
            </div>

            {/* Buttons Right */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTyping}
                className={`h-7 w-7 flex items-center justify-center transition-all select-none cursor-pointer disabled:opacity-30 rounded-none border ${
                  isRecording
                    ? 'bg-red-500 text-white border-red-500 animate-pulse'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                }`}
                title={isRecording ? 'Stop recording' : 'Voice input'}
              >
                {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={handleSend}
                disabled={isTyping || !input.trim()}
                className="h-7 w-7 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white flex items-center justify-center transition-all select-none cursor-pointer rounded-none border border-slate-900"
                title="Send message"
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
    </div>
  );
};
