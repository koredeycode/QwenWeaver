import React, { useState, useEffect } from 'react';
import { Eye, Copy, Trash2, X, HelpCircle, Bot, Brain, Wrench, Play, Upload } from 'lucide-react';
import { useStore } from '../store/index.js';
import type { OutputFormat, DebateArenaConfig } from '@qwenweaver/types';

export const Inspector = ({ onClose }: { onClose: () => void }) => {
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const selectedNode = useStore((s) => s.nodes.find((n) => n.id === selectedNodeId));
  const selectedEdgeId = useStore((s) => s.selectedEdgeId);
  const selectedEdge = useStore((s) => s.edges.find((e) => e.id === selectedEdgeId));
  const updateNodeData = useStore((s) => s.updateNodeData);
  const deleteNode = useStore((s) => s.deleteNode);
  const selectNode = useStore((s) => s.selectNode);
  const selectEdge = useStore((s) => s.selectEdge);
  const setEdgeData = useStore((s) => s.setEdgeData);
  const duplicateNode = useStore((s) => s.duplicateNode);
  const setMcpConfigDialogNodeId = useStore((s) => s.setMcpConfigDialogNodeId);

  // Local state for capabilities
  const [webBrowsing, setWebBrowsing] = useState(true);
  const [fileAccess, setFileAccess] = useState(false);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (selectedNodeId) updateNodeData(selectedNodeId, { label: e.target.value });
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (selectedNodeId) updateNodeData(selectedNodeId, { systemPrompt: e.target.value });
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (selectedNodeId) updateNodeData(selectedNodeId, { model: e.target.value });
  };

  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (selectedNodeId)
      updateNodeData(selectedNodeId, { outputFormat: e.target.value as OutputFormat });
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedNodeId) updateNodeData(selectedNodeId, { thinkingBudget: Number(e.target.value) });
  };

  const handleThinkingToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedNodeId) updateNodeData(selectedNodeId, { enableThinking: e.target.checked });
  };

  const updateDebateConfig = (patch: Partial<DebateArenaConfig>) => {
    if (selectedNodeId && selectedNode)
      updateNodeData(selectedNodeId, {
        debateArenaConfig: {
          mode: 'debate',
          maxRounds: 3,
          hasArbitrator: false,
          outputFormat: 'verdict',
          ...(selectedNode.data.debateArenaConfig ?? {}),
          ...patch,
        },
      });
  };

  const getNodeIcon = (type: string | undefined) => {
    switch (type) {
      case 'trigger':
      case 'input_trigger':
        return <Play className="w-4 h-4 text-white fill-white/10" />;
      case 'file_trigger':
        return <Upload className="w-4 h-4 text-white" />;
      case 'agent':
        return <Bot className="w-4 h-4 text-white" />;
      case 'supervisor':
        return <Brain className="w-4 h-4 text-white" />;
      default:
        return <Wrench className="w-4 h-4 text-white" />;
    }
  };

  const getNodeIconColor = (type: string | undefined) => {
    switch (type) {
      case 'trigger':
      case 'input_trigger':
        return 'bg-emerald-600';
      case 'file_trigger':
        return 'bg-cyan-600';
      case 'agent':
        return 'bg-[#f97316]';
      case 'supervisor':
        return 'bg-[#2563eb]';
      default:
        return 'bg-purple-600';
    }
  };

  return (
    <div
      className="w-80 h-full bg-white border-l border-[#cbd5e1] flex flex-col font-sans select-none text-slate-800"
      data-tour="inspector"
    >
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-[#cbd5e1] bg-[#f8fafc] px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold tracking-wider text-slate-900">
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          PROPERTIES INSPECTOR
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 border border-slate-200 transition-colors"
          title="Close Sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar">
        {selectedEdge ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Edge Connection</h3>
                <p className="text-[10px] text-slate-400 font-mono">Communication Channel</p>
              </div>
              <button
                onClick={() => selectEdge(null)}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-3 bg-purple-50 border border-purple-200 p-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono font-bold text-purple-700">
                    Conversation Mode (Bidirectional)
                  </label>
                  <input
                    type="checkbox"
                    checked={(selectedEdge.data as any)?.subscription?.conversationMode ?? false}
                    onChange={(e) =>
                      setEdgeData(selectedEdge.id, {
                        subscription: {
                          ...(selectedEdge.data as any)?.subscription,
                          conversationMode: e.target.checked,
                        },
                      })
                    }
                    className="w-3.5 h-3.5 accent-purple-600"
                  />
                </div>
                {(selectedEdge.data as any)?.subscription?.conversationMode && (
                  <div>
                    <label className="block text-[9px] font-mono font-bold text-purple-400 uppercase tracking-wider mb-1">
                      Maximum Round Count
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={(selectedEdge.data as any)?.subscription?.maxRounds ?? 5}
                      onChange={(e) =>
                        setEdgeData(selectedEdge.id, {
                          subscription: {
                            ...(selectedEdge.data as any)?.subscription,
                            conversationMode: true,
                            maxRounds: Math.min(50, Math.max(1, Number(e.target.value) || 1)),
                          },
                        })
                      }
                      className="w-full bg-white border border-purple-200 p-1.5 text-xs font-mono text-purple-700 outline-none rounded-none"
                    />
                  </div>
                )}
              </div>

              <p className="text-[9px] font-mono text-slate-400 leading-relaxed">
                Conversation mode enables agents on both ends of this connection to exchange
                messages over multiple rounds. The edge will not enforce execution order &mdash;
                both agents can participate freely. This feature is ideal for debates, negotiations,
                interviews, and iterative refinements.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => selectEdge(null)}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
              >
                Done
              </button>
              <button
                onClick={() => selectEdge(null)}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-none shadow-sm transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        ) : selectedNode ? (
          <div className="space-y-5">
            {/* Header Info */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
              <div className="flex items-center gap-2.5">
                {selectedNode.type === 'mcp_tool' && selectedNode.data.iconUrl ? (
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg shadow-sm bg-white border border-slate-200">
                    <img
                      src={selectedNode.data.iconUrl}
                      alt=""
                      className="w-5 h-5 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className={`w-8 h-8 ${getNodeIconColor(selectedNode.type)} flex items-center justify-center rounded-lg shadow-sm`}
                  >
                    {getNodeIcon(selectedNode.type)}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedNode.type === 'input_trigger'
                      ? 'Input Trigger'
                      : selectedNode.type === 'file_trigger'
                        ? 'File Trigger'
                        : selectedNode.data.label || 'Research Agent'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">Node Configuration</p>
                </div>
              </div>
              <button
                onClick={() => selectNode(null)}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Node Name input (General Section) */}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {selectedNode.type === 'input_trigger'
                    ? 'Instruction Text'
                    : selectedNode.type === 'file_trigger'
                      ? 'Image Upload'
                      : 'Node Title / Name'}
                </label>
                {selectedNode.type === 'input_trigger' ? (
                  <textarea
                    rows={4}
                    value={selectedNode.data.label || ''}
                    onChange={handleLabelChange}
                    className="w-full bg-white border border-[#cbd5e1] p-2 text-xs font-mono text-slate-800 outline-none rounded-none resize-y"
                    placeholder="Enter initial instruction text..."
                  />
                ) : selectedNode.type === 'file_trigger' ? (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = async () => {
                          const base64 = reader.result as string;
                          try {
                            const res = await fetch('/api/files/upload', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ data: base64 }),
                            });
                            const json = await res.json();
                            if (json.url && selectedNodeId) {
                              updateNodeData(selectedNodeId, {
                                fileUrl: json.url,
                                fileName: file.name,
                              });
                            }
                          } catch {
                            // upload failed silently
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="w-full text-xs font-mono text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:border file:border-slate-300 file:text-xs file:font-semibold file:bg-slate-50 hover:file:bg-slate-100 file:cursor-pointer"
                    />
                    {selectedNode.data.fileName && (
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 p-2">
                        <Upload className="w-3 h-3 text-cyan-500" />
                        <span className="truncate flex-1">{selectedNode.data.fileName}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={selectedNode.data.label || ''}
                    onChange={handleLabelChange}
                    className="w-full bg-white border border-[#cbd5e1] p-2 text-xs font-mono text-slate-800 outline-none rounded-none"
                    placeholder="Enter custom node title..."
                  />
                )}
              </div>
            </div>

            {/* MCP SERVER SUMMARY */}
            {selectedNode.type === 'mcp_tool' && (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                  MCP Server Configuration
                </label>
                <div className="bg-slate-50 border border-slate-200 p-2.5 text-xs font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">URL:</span>
                    <span className="text-slate-700 truncate ml-2 max-w-[180px]">
                      {selectedNode.data.mcpServerUrl || (
                        <span className="text-amber-500">Not set</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Server ID:</span>
                    <span className="text-slate-700 truncate ml-2 max-w-[180px]">
                      {selectedNode.data.mcpServerId || (
                        <span className="text-amber-500">Not set</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Auth:</span>
                    <span className="text-slate-700">
                      {selectedNode.data.mcpAuthConfig?.type || 'none'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMcpConfigDialogNodeId(selectedNodeId)}
                  className="w-full py-2 font-mono text-[10px] font-bold border border-purple-300 text-purple-700 hover:bg-purple-50 transition-all"
                >
                  Open MCP Configuration
                </button>
              </div>
            )}

            {/* DEBATE ARENA CONFIGURATION */}
            {selectedNode.type === 'debate_arena' && (
              <div className="space-y-4 border-t border-slate-100 pt-3">
                <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Debate Arena Configuration
                </label>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Mode
                  </label>
                  <select
                    value={selectedNode.data.debateArenaConfig?.mode || 'debate'}
                    onChange={(e) =>
                      updateDebateConfig({ mode: e.target.value as DebateArenaConfig['mode'] })
                    }
                    className="w-full bg-white border border-[#cbd5e1] p-2 text-xs font-mono text-slate-800 outline-none rounded-none"
                  >
                    <option value="debate">Debate (adversarial argument)</option>
                    <option value="negotiation">Negotiation (trade-off seeking)</option>
                    <option value="consensus">Consensus (alignment building)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Max Rounds (1-20)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={selectedNode.data.debateArenaConfig?.maxRounds ?? 3}
                    onChange={(e) =>
                      updateDebateConfig({
                        maxRounds: Math.min(20, Math.max(1, Number(e.target.value) || 1)),
                      })
                    }
                    className="w-full bg-white border border-[#cbd5e1] p-2 text-xs font-mono text-slate-800 outline-none rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Output Format
                  </label>
                  <select
                    value={selectedNode.data.debateArenaConfig?.outputFormat || 'verdict'}
                    onChange={(e) =>
                      updateDebateConfig({
                        outputFormat: e.target.value as DebateArenaConfig['outputFormat'],
                      })
                    }
                    className="w-full bg-white border border-[#cbd5e1] p-2 text-xs font-mono text-slate-800 outline-none rounded-none"
                  >
                    <option value="verdict">Verdict (final decision only)</option>
                    <option value="transcript">Transcript (full exchange)</option>
                    <option value="score">Score (participant ratings)</option>
                  </select>
                </div>
                <div className="space-y-3 bg-slate-50 border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono font-bold text-slate-700">
                      AI Arbitrator (qwen3.7-max reasoning)
                    </label>
                    <input
                      type="checkbox"
                      checked={selectedNode.data.debateArenaConfig?.hasArbitrator ?? false}
                      onChange={(e) => updateDebateConfig({ hasArbitrator: e.target.checked })}
                      className="w-3.5 h-3.5 accent-purple-600"
                    />
                  </div>
                  {selectedNode.data.debateArenaConfig?.hasArbitrator && (
                    <>
                      <div>
                        <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Arbitrator Model
                        </label>
                        <select
                          value={
                            selectedNode.data.debateArenaConfig?.arbitratorModel || 'qwen3.7-max'
                          }
                          onChange={(e) => updateDebateConfig({ arbitratorModel: e.target.value })}
                          className="w-full bg-white border border-slate-200 p-1.5 text-xs font-mono text-slate-800 outline-none rounded-none"
                        >
                          <option value="qwen3.7-max">qwen3.7-max (Reasoning Default)</option>
                          <option value="qwen3.7-plus">qwen3.7-plus (Balanced)</option>
                          <option value="deepseek-v4-pro">
                            deepseek-v4-pro (DeepSeek Reasoning)
                          </option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Scoring Criteria
                        </label>
                        <textarea
                          rows={3}
                          value={selectedNode.data.debateArenaConfig?.scoringCriteria || ''}
                          onChange={(e) => updateDebateConfig({ scoringCriteria: e.target.value })}
                          className="w-full bg-white border border-slate-200 p-1.5 text-xs font-mono text-slate-800 outline-none rounded-none resize-y"
                          placeholder="e.g. Evidence quality, logical rigor, practicality..."
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Model Params (Only for Agents and Supervisors) */}
            {(selectedNode.type === 'agent' || selectedNode.type === 'supervisor') && (
              <div className="space-y-4 border-t border-slate-100 pt-3">
                {/* Model Dropdown Selection */}
                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                    AI LLM Model
                  </label>
                  {selectedNode.type === 'supervisor' ? (
                    <select
                      value={selectedNode.data.model || 'qwen3.7-max'}
                      onChange={handleModelChange}
                      className="w-full bg-white border border-[#cbd5e1] p-2 text-xs font-mono text-slate-800 outline-none rounded-none"
                    >
                      <option value="qwen3.7-max">qwen3.7-max (Supervisor Default)</option>
                      <option value="qwen3.7-plus">qwen3.7-plus (Balanced)</option>
                      <option value="qwen3.6-flash">qwen3.6-flash (Fast Reasoning)</option>
                      <option value="deepseek-v4-pro">deepseek-v4-pro (DeepSeek Reasoning)</option>
                      <option value="deepseek-v4-flash">deepseek-v4-flash (DeepSeek Fast)</option>
                    </select>
                  ) : (
                    <div className="bg-slate-50 border border-[#cbd5e1] p-2 text-xs font-mono text-slate-600">
                      {selectedNode.data.model || 'qwen3.7-plus'} (Preconfigured)
                    </div>
                  )}
                </div>

                {/* Thinking Settings (Agent & Supervisor) */}
                {(selectedNode.type === 'supervisor' || selectedNode.type === 'agent') && (
                  <div className="space-y-3 bg-slate-50 border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono font-bold text-slate-700">
                        Enable AI Thinking
                      </label>
                      <input
                        type="checkbox"
                        checked={selectedNode.data.enableThinking !== false}
                        onChange={handleThinkingToggle}
                        className="w-3.5 h-3.5 accent-[#f97316]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Thinking Budget Token Limit
                      </label>
                      <input
                        type="number"
                        min="512"
                        max="8192"
                        step="256"
                        value={selectedNode.data.thinkingBudget || 2048}
                        onChange={handleBudgetChange}
                        className="w-full bg-white border border-slate-200 p-1.5 text-xs font-mono text-slate-800 outline-none rounded-none"
                      />
                    </div>
                  </div>
                )}

                {/* System Prompt TextArea */}
                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                    System Persona Instructions
                  </label>
                  <textarea
                    rows={6}
                    value={selectedNode.data.systemPrompt || ''}
                    onChange={handlePromptChange}
                    className="w-full bg-white border border-[#cbd5e1] p-2 text-xs font-mono text-slate-800 outline-none rounded-none resize-y"
                    placeholder="Enter instructions for the agent persona..."
                  />
                </div>

                {/* Capabilities (Agent only) */}
                {selectedNode.type === 'agent' && (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Agent Node Capabilities
                    </label>
                    <div className="space-y-2 border border-slate-200 p-3 bg-slate-50">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Web Search Browsing</span>
                        <input
                          type="checkbox"
                          checked={webBrowsing}
                          onChange={(e) => setWebBrowsing(e.target.checked)}
                          className="accent-[#f97316] w-3.5 h-3.5"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Local File Access</span>
                        <input
                          type="checkbox"
                          checked={fileAccess}
                          onChange={(e) => setFileAccess(e.target.checked)}
                          className="accent-[#f97316] w-3.5 h-3.5"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Output Format selection (Only for standard Worker Agents) */}
            {selectedNode.type === 'agent' && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Expected Output Format
                </label>
                <div className="bg-slate-50 border border-[#cbd5e1] p-2 text-xs font-mono text-slate-600 uppercase">
                  {selectedNode.data.outputFormat || 'text'} (Preconfigured)
                </div>
              </div>
            )}

            {/* Image URL Input (only for happyhorse-1.1-i2v agents/supervisors) */}
            {(selectedNode.type === 'agent' || selectedNode.type === 'supervisor') &&
              selectedNode.data.model === 'happyhorse-1.1-i2v' && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Input Image URL
                  </label>
                  <input
                    type="text"
                    value={selectedNode.data.imageUrl || ''}
                    onChange={(e) => {
                      if (selectedNodeId)
                        updateNodeData(selectedNodeId, { imageUrl: e.target.value });
                    }}
                    className="w-full bg-white border border-[#cbd5e1] p-2 text-xs font-mono text-slate-800 outline-none rounded-none"
                    placeholder="Paste image URL or leave empty to auto-detect from upstream"
                  />
                  <p className="text-[9px] text-slate-400 font-mono">
                    Leave empty to use the output image from the upstream node.
                  </p>
                </div>
              )}

            {/* Footer CTA Actions (Revert + Save Node/Delete) */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                onClick={() => selectNode(null)}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
              >
                Revert
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => duplicateNode(selectedNode.id)}
                  title="Duplicate Node"
                  className="p-2 hover:bg-slate-100 text-slate-600 border border-slate-200"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteNode(selectedNode.id)}
                  title="Delete Node"
                  className="p-2 hover:bg-red-50 text-rose-600 border border-slate-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => selectNode(null)}
                  className="px-4 py-1.5 bg-[#ea580c] hover:bg-[#a73a00] text-white font-bold text-xs rounded-none shadow-sm transition-colors"
                >
                  Save Node
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 font-sans border-2 border-dashed border-slate-200">
            <HelpCircle className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-500">No node selected.</p>
            <p className="text-[10px] mt-1">
              Select a node or edge on the canvas to configure parameters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
