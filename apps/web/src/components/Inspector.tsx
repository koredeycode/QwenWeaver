import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings, 
  MessageSquareCode, 
  Trash2, 
  X, 
  Send,
  Loader2,
  HelpCircle,
  Cpu,
  Layers,
  Wrench,
  Play
} from 'lucide-react';
import { useStore } from '../store/index.js';
import type { OutputFormat } from '@qwenweaver/types';

export const Inspector = () => {
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const selectedNode = useStore((s) => s.nodes.find((n) => n.id === selectedNodeId));
  const updateNodeData = useStore((s) => s.updateNodeData);
  const deleteNode = useStore((s) => s.deleteNode);
  const selectNode = useStore((s) => s.selectNode);

  // Copilot States
  const messages = useStore((s) => s.copilotMessages);
  const isTyping = useStore((s) => s.isCopilotTyping);
  const sendMessage = useStore((s) => s.sendCopilotMessage);

  const [activeTab, setActiveTab] = useState<'config' | 'copilot'>('config');
  const [copilotInput, setCopilotInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Local state for capabilities
  const [webBrowsing, setWebBrowsing] = useState(true);
  const [fileAccess, setFileAccess] = useState(false);

  useEffect(() => {
    if (activeTab === 'copilot') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSend = () => {
    if (!copilotInput.trim()) return;
    sendMessage(copilotInput);
    setCopilotInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Node update handlers
  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedNodeId) updateNodeData(selectedNodeId, { label: e.target.value });
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (selectedNodeId) updateNodeData(selectedNodeId, { systemPrompt: e.target.value });
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (selectedNodeId) updateNodeData(selectedNodeId, { model: e.target.value });
  };

  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (selectedNodeId) updateNodeData(selectedNodeId, { outputFormat: e.target.value as OutputFormat });
  };

  const handleMcpUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedNodeId) updateNodeData(selectedNodeId, { mcpServerUrl: e.target.value });
  };

  const handleMcpIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedNodeId) updateNodeData(selectedNodeId, { mcpServerId: e.target.value });
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedNodeId) updateNodeData(selectedNodeId, { thinkingBudget: Number(e.target.value) });
  };

  const handleThinkingToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedNodeId) updateNodeData(selectedNodeId, { enableThinking: e.target.checked });
  };

  const getNodeIcon = (type: string | undefined) => {
    switch (type) {
      case 'trigger': return <Play className="w-5 h-5 text-[#ea580c] fill-[#ea580c]/10" />;
      case 'agent': return <Cpu className="w-5 h-5 text-white" />;
      case 'supervisor': return <Layers className="w-5 h-5 text-white" />;
      default: return <Wrench className="w-5 h-5 text-white" />;
    }
  };

  return (
    <div className="w-80 h-full bg-white border-l border-[#cbd5e1] flex flex-col font-sans select-none text-slate-800">
      {/* Tabs */}
      <div className="flex border-b border-[#cbd5e1] bg-[#f8fafc]">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-mono font-bold tracking-wider transition-all border-b-2 ${
            activeTab === 'config'
              ? 'border-primary text-slate-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          INSPECTOR
        </button>
        <button
          onClick={() => setActiveTab('copilot')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-mono font-bold tracking-wider transition-all border-b-2 ${
            activeTab === 'copilot'
              ? 'border-primary text-slate-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <MessageSquareCode className="w-3.5 h-3.5" />
          AI COPILOT
        </button>
      </div>

      {/* Tab Panel Content */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar">
        {activeTab === 'config' ? (
          /* CONFIG PANEL */
          selectedNode ? (
            <div className="space-y-5">
              {/* Header Info */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-[#ea580c] flex items-center justify-center rounded-lg shadow-sm">
                    {getNodeIcon(selectedNode.type)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{selectedNode.data.label || 'Research Agent'}</h3>
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
                <div className="text-[10px] font-mono font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                  GENERAL
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Node Name</label>
                  <input
                    type="text"
                    value={selectedNode.data.label || ''}
                    onChange={handleLabelChange}
                    className="w-full bg-white border border-[#cbd5e1] p-2 text-xs font-semibold text-slate-800 focus:border-[#ea580c] outline-none rounded-none"
                  />
                </div>

                {/* Model selection */}
                {(selectedNode.type === 'agent' || selectedNode.type === 'supervisor') && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Model Selection</label>
                    <select
                      value={selectedNode.data.model || (selectedNode.type === 'supervisor' ? 'qwen3-max' : 'qwen-plus')}
                      onChange={handleModelChange}
                      className="w-full bg-white border border-[#cbd5e1] p-2 text-xs font-semibold text-slate-800 focus:border-[#ea580c] outline-none rounded-none"
                    >
                      {selectedNode.type === 'supervisor' ? (
                        <>
                          <option value="qwen3-max">Qwen-Max (Latest)</option>
                          <option value="qwen-plus">Qwen-Plus (Standard)</option>
                        </>
                      ) : (
                        <>
                          <option value="qwen-plus">Qwen-Plus (Worker)</option>
                          <option value="qwen-turbo">Qwen-Turbo (Fast)</option>
                        </>
                      )}
                    </select>
                  </div>
                )}
              </div>

              {/* Prompt Section */}
              {(selectedNode.type === 'agent' || selectedNode.type === 'supervisor') && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-800 uppercase tracking-wider">SYSTEM PROMPT</span>
                    <button className="text-[10px] font-semibold text-[#2563eb] hover:underline">Templates</button>
                  </div>
                  
                  <div className="relative">
                    <textarea
                      rows={5}
                      value={selectedNode.data.systemPrompt || ''}
                      onChange={handlePromptChange}
                      className="w-full bg-white border border-[#cbd5e1] p-2.5 text-xs text-slate-700 focus:border-[#ea580c] outline-none rounded-none font-sans leading-relaxed resize-y"
                      placeholder="Enter prompt instructions..."
                    />
                  </div>
                </div>
              )}

              {/* Capabilities Block (Matches exact look of screenshots) */}
              {selectedNode.type === 'agent' && (
                <div className="space-y-3">
                  <div className="text-[10px] font-mono font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                    CAPABILITIES
                  </div>
                  
                  {/* Web Browsing Capability */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200">
                    <div>
                      <div className="text-xs font-bold text-slate-800">Web Browsing</div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">Allow agent to search the internet</div>
                    </div>
                    <button 
                      onClick={() => setWebBrowsing(!webBrowsing)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                        webBrowsing ? 'bg-[#0066cc]' : 'bg-slate-300'
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform duration-200 ${
                        webBrowsing ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* File Access Capability */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200">
                    <div>
                      <div className="text-xs font-bold text-slate-800">File Access</div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">Read local workspace files</div>
                    </div>
                    <button 
                      onClick={() => setFileAccess(!fileAccess)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                        fileAccess ? 'bg-[#0066cc]' : 'bg-slate-300'
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform duration-200 ${
                        fileAccess ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              )}

              {/* Supervisor specific settings (enableThinking) */}
              {selectedNode.type === 'supervisor' && (
                <div className="space-y-3">
                  <div className="text-[10px] font-mono font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                    SUPERVISOR PARAMETERS
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-[#cbd5e1]">
                    <div>
                      <div className="text-xs font-bold text-slate-800">Enable AI Thinking</div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">Use thinking budget for complex consensus</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedNode.data.enableThinking || false}
                      onChange={handleThinkingToggle}
                      className="w-4 h-4 accent-primary"
                    />
                  </div>

                  {selectedNode.data.enableThinking && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Thinking Budget (Tokens)</label>
                      <input
                        type="number"
                        value={selectedNode.data.thinkingBudget || 1024}
                        onChange={handleBudgetChange}
                        className="w-full bg-white border border-[#cbd5e1] p-1.5 text-xs font-mono text-slate-800 outline-none rounded-none"
                        min={512}
                        max={8192}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* MCP specifics */}
              {selectedNode.type === 'mcp_tool' && (
                <div className="space-y-3">
                  <div className="text-[10px] font-mono font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                    MCP PARAMS
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Server Identifier</label>
                    <input
                      type="text"
                      value={selectedNode.data.mcpServerId || ''}
                      onChange={handleMcpIdChange}
                      className="w-full bg-white border border-[#cbd5e1] p-2 text-xs font-mono text-slate-800 outline-none rounded-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Endpoint URL</label>
                    <input
                      type="text"
                      value={selectedNode.data.mcpServerUrl || ''}
                      onChange={handleMcpUrlChange}
                      className="w-full bg-white border border-[#cbd5e1] p-2 text-xs font-mono text-slate-800 outline-none rounded-none"
                    />
                  </div>
                </div>
              )}

              {/* Expected Output Format */}
              {selectedNode.type !== 'mcp_tool' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Expected Output Format</label>
                  <select
                    value={selectedNode.data.outputFormat || 'text'}
                    onChange={handleFormatChange}
                    className="w-full bg-white border border-[#cbd5e1] p-2 text-xs font-mono text-slate-800 outline-none rounded-none"
                  >
                    <option value="text">text</option>
                    <option value="markdown">markdown</option>
                    <option value="json">json</option>
                    <option value="yaml">yaml</option>
                  </select>
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
                    onClick={() => deleteNode(selectedNode.id)}
                    title="Delete Node"
                    className="p-2 hover:bg-red-50 text-rose-600 border border-slate-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => selectNode(null)}
                    className="px-4 py-1.5 bg-[#9a3412] hover:bg-[#a73a00] text-white font-bold text-xs rounded-none shadow-sm transition-colors"
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
              <p className="text-[10px] mt-1">Select an agent, trigger, or tool on the canvas to configure parameters.</p>
            </div>
          )
        ) : (
          /* COPILOT PANEL */
          <div className="h-full flex flex-col justify-between">
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar mb-4">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`p-2.5 border text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-slate-50 border-slate-200 text-slate-800 ml-6'
                      : 'bg-blue-50/50 border-blue-100 text-slate-850 mr-6 shadow-[inset_2px_0_0_#2563eb]'
                  }`}
                >
                  <div className="font-mono text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                    {msg.role === 'user' ? 'You' : 'Qwen Copilot'}
                  </div>
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
              ))}
              
              {isTyping && (
                <div className="bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-500 mr-6 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-secondary" />
                  <span className="font-mono text-[10px]">Copilot compiling swarm...</span>
                </div>
              )}
              
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input */}
            <div className="border border-[#cbd5e1] bg-white p-1.5 flex items-center gap-1.5">
              <textarea
                rows={1}
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask copilot to build a swarm..."
                className="flex-1 bg-transparent text-xs text-slate-800 outline-none resize-none px-2 max-h-20"
              />
              <button
                onClick={handleSend}
                disabled={isTyping || !copilotInput.trim()}
                className="p-2 bg-[#9a3412] hover:bg-[#a73a00] text-white disabled:opacity-30"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
