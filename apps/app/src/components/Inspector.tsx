import React, { useState, useEffect } from 'react';
import {
  Eye,
  Copy,
  Trash2,
  X,
  HelpCircle,
  Bot,
  Brain,
  Wrench,
  Play,
  Puzzle,
  ChevronDown,
  Key,
  Plus,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useStore } from '../store/index.js';
import { client, authHeaders, fetchApi } from '../lib/api-client.js';
import type { OutputFormat } from '@qwenweaver/types';

export const Inspector = ({ onClose }: { onClose: () => void }) => {
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const selectedNode = useStore((s) => s.nodes.find((n) => n.id === selectedNodeId));
  const updateNodeData = useStore((s) => s.updateNodeData);
  const deleteNode = useStore((s) => s.deleteNode);
  const selectNode = useStore((s) => s.selectNode);
  const duplicateNode = useStore((s) => s.duplicateNode);

  // Local state for capabilities
  const [webBrowsing, setWebBrowsing] = useState(true);
  const [fileAccess, setFileAccess] = useState(false);

  const [mcpStatus, setMcpStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>(
    'disconnected',
  );
  const [discoveredTools, setDiscoveredTools] = useState<any[]>([]);
  const [mcpError, setMcpError] = useState('');
  // MCP credential secrets stored in local state only (never persisted to graph)
  const [mcpSecrets, setMcpSecrets] = useState<Record<string, string>>({});
  // Credentials from server
  const [credentials, setCredentials] = useState<any[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [showCreateCredential, setShowCreateCredential] = useState(false);
  const [newCredName, setNewCredName] = useState('');
  const [newCredValue, setNewCredValue] = useState('');
  const [newCredDesc, setNewCredDesc] = useState('');

  const fetchDiscoveredTools = async (serverId: string, serverUrl?: string) => {
    try {
      setMcpStatus('connecting');
      const body: Record<string, unknown> = { serverId };
      if (serverUrl) body.serverUrl = serverUrl;
      const authType = selectedNode?.data.mcpAuthConfig?.type;
      if (authType && authType !== 'none') {
        body.auth = { type: authType, ...mcpSecrets };
      }
      const res = await client.api.mcp.tools.discover.$post(
        { json: body as any },
        { headers: authHeaders() },
      );
      const data: any = await res.json();
      if (!res.ok) {
        setMcpStatus('error');
        setMcpError(data.error || 'Failed to discover tools');
        return;
      }
      setDiscoveredTools(data.tools || []);
      setMcpStatus('connected');
      // Auto-save credentials to the server if we have a user server ID
      const userServerId = (selectedNode?.data as any).mcpUserServerId;
      if (authType && authType !== 'none' && userServerId) {
        (client.api.mcp.servers[':id'] as any).auth
          .$post(
            {
              param: { id: userServerId },
              json: { authConfig: { type: authType, ...mcpSecrets } },
            },
            { headers: authHeaders() },
          )
          .catch(() => {});
      }
    } catch {
      setMcpStatus('error');
      setMcpError('Connection failed');
    }
  };

  useEffect(() => {
    if (selectedNode && selectedNode.type === 'mcp_tool') {
      if (selectedNode.data.mcpServerId) {
        // If auth is required but no secrets have been entered yet, show a hint instead of failing
        const authType = selectedNode.data.mcpAuthConfig?.type;
        if (
          authType &&
          authType !== 'none' &&
          !selectedNode.data.mcpAuthConfig?.credentialId &&
          !mcpSecrets.token &&
          !mcpSecrets.apiKey &&
          !mcpSecrets.username
        ) {
          setMcpStatus('disconnected');
          setMcpError('Configure credentials and click Connect');
        } else {
          fetchDiscoveredTools(selectedNode.data.mcpServerId, selectedNode.data.mcpServerUrl);
        }
      } else {
        setMcpStatus('disconnected');
        setDiscoveredTools([]);
      }
    }
  }, [selectedNodeId]);

  // Fetch credentials for credential selector
  useEffect(() => {
    if (selectedNode?.type === 'mcp_tool') {
      setLoadingCreds(true);
      fetchApi('/api/credentials')
        .then((res) => res.json())
        .then((data: any) => {
          setCredentials(data.credentials || []);
        })
        .catch(() => {})
        .finally(() => setLoadingCreds(false));
    }
  }, [selectedNodeId]);

  const handleConnectMcp = async () => {
    if (!selectedNodeId || !selectedNode?.data.mcpServerId) {
      setMcpStatus('error');
      setMcpError('Save the server ID first');
      return;
    }
    await fetchDiscoveredTools(selectedNode.data.mcpServerId, selectedNode.data.mcpServerUrl);
  };

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
      case 'trigger':
      case 'input_trigger':
        return <Play className="w-4 h-4 text-white fill-white/10" />;
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
      case 'agent':
        return 'bg-[#ea580c]';
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
        {selectedNode ? (
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
                    {selectedNode.data.label || 'Research Agent'}
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
                  {selectedNode.type === 'input_trigger' ? 'Instruction Text' : 'Node Title / Name'}
                </label>
                {selectedNode.type === 'input_trigger' ? (
                  <textarea
                    rows={4}
                    value={selectedNode.data.label || ''}
                    onChange={handleLabelChange}
                    className="w-full bg-white border border-[#cbd5e1] p-2 text-xs font-mono text-slate-800 outline-none rounded-none resize-y"
                    placeholder="Enter initial instruction text..."
                  />
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

            {/* MCP SERVER VIEW */}
            {selectedNode.type === 'mcp_tool' && (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                    MCP Server URL
                  </label>
                  <input
                    type="text"
                    value={selectedNode.data.mcpServerUrl || ''}
                    onChange={handleMcpUrlChange}
                    className="w-full bg-white border border-[#cbd5e1] p-2 text-xs font-mono text-slate-800 outline-none rounded-none"
                    placeholder="e.g. http://localhost:8000"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Exposed Server ID
                  </label>
                  <input
                    type="text"
                    value={selectedNode.data.mcpServerId || ''}
                    onChange={handleMcpIdChange}
                    className="w-full bg-white border border-[#cbd5e1] p-2 text-xs font-mono text-slate-800 outline-none rounded-none"
                    placeholder="e.g. github-server"
                  />
                </div>

                {/* Credential Selector */}
                <CredentialSelector
                  authConfig={selectedNode.data.mcpAuthConfig || {}}
                  credentials={credentials}
                  loadingCreds={loadingCreds}
                  showCreate={showCreateCredential}
                  newCredName={newCredName}
                  newCredValue={newCredValue}
                  newCredDesc={newCredDesc}
                  onAuthTypeChange={(type) => {
                    if (selectedNodeId)
                      updateNodeData(selectedNodeId, {
                        mcpAuthConfig: {
                          ...selectedNode.data.mcpAuthConfig,
                          type: type as 'none' | 'api_key' | 'bearer' | 'basic',
                          credentialId:
                            type === 'none'
                              ? undefined
                              : selectedNode.data.mcpAuthConfig?.credentialId,
                        },
                      });
                  }}
                  onCredentialSelect={(credentialId) => {
                    if (selectedNodeId)
                      updateNodeData(selectedNodeId, {
                        mcpAuthConfig: {
                          ...selectedNode.data.mcpAuthConfig,
                          credentialId,
                        },
                      });
                  }}
                  onClearCredential={() => {
                    if (selectedNodeId)
                      updateNodeData(selectedNodeId, {
                        mcpAuthConfig: {
                          ...selectedNode.data.mcpAuthConfig,
                          credentialId: undefined,
                        },
                      });
                  }}
                  onShowCreate={(show) => setShowCreateCredential(show)}
                  onNewCredNameChange={setNewCredName}
                  onNewCredValueChange={setNewCredValue}
                  onNewCredDescChange={setNewCredDesc}
                  onCreateCredential={async () => {
                    if (!newCredValue || !newCredName) return;
                    try {
                      const authType = selectedNode?.data.mcpAuthConfig?.type;
                      const typeMap: Record<string, string> = {
                        bearer: 'mcp_bearer_token',
                        api_key: 'mcp_api_key',
                        basic: 'mcp_basic_auth',
                      };
                      const res = await fetchApi('/api/credentials', {
                        method: 'POST',
                        body: JSON.stringify({
                          name: newCredName,
                          type: typeMap[authType || ''] || 'custom',
                          value: newCredValue,
                          description: newCredDesc || undefined,
                        }),
                      });
                      const data: any = await res.json();
                      if (res.ok && data.credential) {
                        setCredentials((prev) => [...prev, data.credential]);
                        if (selectedNodeId)
                          updateNodeData(selectedNodeId, {
                            mcpAuthConfig: {
                              ...selectedNode?.data.mcpAuthConfig,
                              credentialId: data.credential.id,
                            },
                          });
                        setShowCreateCredential(false);
                        setNewCredName('');
                        setNewCredValue('');
                        setNewCredDesc('');
                      }
                    } catch {
                      /* noop */
                    }
                  }}
                />

                {/* Inline fallback for manual credential entry */}
                {selectedNode.data.mcpAuthConfig?.type &&
                  selectedNode.data.mcpAuthConfig.type !== 'none' &&
                  !selectedNode.data.mcpAuthConfig?.credentialId && (
                    <div className="border-t border-slate-100 pt-3 mt-2">
                      <label className="block text-[10px] font-mono font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Manual Credentials (Legacy)
                      </label>
                      {selectedNode.data.mcpAuthConfig?.type === 'bearer' && (
                        <input
                          type="password"
                          value={mcpSecrets.token || ''}
                          onChange={(e) => setMcpSecrets((s) => ({ ...s, token: e.target.value }))}
                          className="w-full bg-white border border-[#cbd5e1] p-2 text-xs font-mono text-slate-800 outline-none rounded-none"
                          placeholder="Bearer token..."
                        />
                      )}
                      {selectedNode.data.mcpAuthConfig?.type === 'api_key' && (
                        <input
                          type="password"
                          value={mcpSecrets.apiKey || ''}
                          onChange={(e) => setMcpSecrets((s) => ({ ...s, apiKey: e.target.value }))}
                          className="w-full bg-white border border-[#cbd5e1] p-2 text-xs font-mono text-slate-800 outline-none rounded-none"
                          placeholder="API key..."
                        />
                      )}
                      {selectedNode.data.mcpAuthConfig?.type === 'basic' && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={mcpSecrets.username || ''}
                            onChange={(e) =>
                              setMcpSecrets((s) => ({ ...s, username: e.target.value }))
                            }
                            className="w-full bg-white border border-[#cbd5e1] p-2 text-xs font-mono text-slate-800 outline-none rounded-none"
                            placeholder="Username..."
                          />
                          <input
                            type="password"
                            value={mcpSecrets.password || ''}
                            onChange={(e) =>
                              setMcpSecrets((s) => ({ ...s, password: e.target.value }))
                            }
                            className="w-full bg-white border border-[#cbd5e1] p-2 text-xs font-mono text-slate-800 outline-none rounded-none"
                            placeholder="Password..."
                          />
                        </div>
                      )}
                      <p className="text-[9px] text-amber-500 font-mono mt-1">
                        Credentials entered here are sent inline. Use the credential selector above
                        for encrypted storage.
                      </p>
                    </div>
                  )}

                {/* MCP Action Connect button */}
                <div className="pt-2">
                  <button
                    onClick={handleConnectMcp}
                    disabled={mcpStatus === 'connecting'}
                    className={`w-full py-2 font-mono text-[10px] font-bold border transition-all rounded-none ${
                      mcpStatus === 'connected'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : mcpStatus === 'error'
                          ? 'bg-rose-50 border-rose-300 text-rose-700'
                          : 'bg-white hover:bg-slate-50 border-[#cbd5e1] text-slate-700'
                    }`}
                  >
                    {mcpStatus === 'disconnected' && 'Connect & Discover Tools'}
                    {mcpStatus === 'connecting' && 'Connecting to MCP Server...'}
                    {mcpStatus === 'connected' &&
                      `Connected (${discoveredTools.length} Tools Discovered)`}
                    {mcpStatus === 'error' && `Failed: ${mcpError}`}
                  </button>
                </div>

                {/* Discovered Tools Monospace list view */}
                {mcpStatus === 'connected' && discoveredTools.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                      Discovered Tools Schema:
                    </span>
                    <div className="bg-slate-50 border border-slate-200 p-2.5 font-mono text-[9px] text-slate-600 space-y-2 select-text max-h-48 overflow-y-auto">
                      {discoveredTools.map((tool, idx) => (
                        <div
                          key={idx}
                          className="border-b border-slate-200/60 pb-1.5 last:border-b-0 last:pb-0 flex items-start gap-2"
                        >
                          {selectedNode?.data.iconUrl ? (
                            <img
                              src={selectedNode.data.iconUrl}
                              alt=""
                              className="w-3.5 h-3.5 rounded object-contain mt-0.5 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Puzzle className="w-3.5 h-3.5 text-purple-500 mt-0.5 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-[#2563eb] truncate">{tool.name}</div>
                            <div className="text-slate-500 mt-0.5 line-clamp-2">
                              {tool.description}
                            </div>
                            <div className="text-[8px] text-purple-600 mt-0.5">
                              input:{' '}
                              {tool.inputSchema
                                ? JSON.stringify(tool.inputSchema).slice(0, 60) + '...'
                                : 'none'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                  <select
                    value={
                      selectedNode.data.model ||
                      (selectedNode.type === 'supervisor' ? 'qwen3-max' : 'qwen-plus')
                    }
                    onChange={handleModelChange}
                    className="w-full bg-white border border-[#cbd5e1] p-2 text-xs font-mono text-slate-800 outline-none rounded-none"
                  >
                    <option value="qwen-plus">qwen-plus (Worker Default)</option>
                    <option value="qwen3-max">qwen3-max (Supervisor Default)</option>
                    <option value="qwen-turbo">qwen-turbo (Fast Parser)</option>
                  </select>
                </div>

                {/* Supervisor Node Thinking Settings */}
                {selectedNode.type === 'supervisor' && (
                  <div className="space-y-3 bg-slate-50 border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono font-bold text-slate-700">
                        Enable AI Thinking
                      </label>
                      <input
                        type="checkbox"
                        checked={selectedNode.data.enableThinking !== false}
                        onChange={handleThinkingToggle}
                        className="w-3.5 h-3.5 accent-[#ea580c]"
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
                          className="accent-[#ea580c] w-3.5 h-3.5"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Local File Access</span>
                        <input
                          type="checkbox"
                          checked={fileAccess}
                          onChange={(e) => setFileAccess(e.target.checked)}
                          className="accent-[#ea580c] w-3.5 h-3.5"
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
            <p className="text-[10px] mt-1">
              Select an agent, trigger, or tool on the canvas to configure parameters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const AUTH_LABELS: Record<string, string> = {
  none: 'No Auth',
  bearer: 'Bearer Token',
  api_key: 'API Key',
  basic: 'Basic Auth',
};

const AUTH_COLORS: Record<string, string> = {
  none: 'text-slate-500',
  bearer: 'text-amber-700',
  api_key: 'text-blue-700',
  basic: 'text-slate-700',
};

function AuthTypeSelect({
  value,
  supportedTypes,
  onChange,
}: {
  value: string;
  supportedTypes?: string[];
  onChange: (type: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const types = supportedTypes?.length
    ? ['none', ...supportedTypes]
    : ['none', 'bearer', 'api_key', 'basic'];

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative mb-2" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-xs border border-[#cbd5e1] px-2 py-1.5 font-mono bg-white focus:outline-none focus:border-purple-500"
      >
        <span className={AUTH_COLORS[value] || 'text-slate-500'}>
          {AUTH_LABELS[value] || value}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute z-10 top-full left-0 right-0 mt-0.5 border border-[#cbd5e1] bg-white shadow-md">
          {types.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                onChange(type);
                setOpen(false);
              }}
              className={`w-full text-left px-2 py-1.5 text-xs font-mono hover:bg-slate-50 transition-colors ${
                value === type ? 'bg-slate-100 font-bold' : ''
              } ${AUTH_COLORS[type] || 'text-slate-500'}`}
            >
              {AUTH_LABELS[type] || type}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CredentialSelector({
  authConfig,
  credentials,
  loadingCreds,
  showCreate,
  newCredName,
  newCredValue,
  newCredDesc,
  onAuthTypeChange,
  onCredentialSelect,
  onClearCredential,
  onShowCreate,
  onNewCredNameChange,
  onNewCredValueChange,
  onNewCredDescChange,
  onCreateCredential,
}: {
  authConfig: any;
  credentials: any[];
  loadingCreds: boolean;
  showCreate: boolean;
  newCredName: string;
  newCredValue: string;
  newCredDesc: string;
  onAuthTypeChange: (type: string) => void;
  onCredentialSelect: (id: string) => void;
  onClearCredential: () => void;
  onShowCreate: (show: boolean) => void;
  onNewCredNameChange: (v: string) => void;
  onNewCredValueChange: (v: string) => void;
  onNewCredDescChange: (v: string) => void;
  onCreateCredential: () => void;
}) {
  const [credentialOpen, setCredentialOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setCredentialOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCred = credentials.find((c) => c.id === authConfig.credentialId);

  // Filter credentials by matching auth type
  const typeMap: Record<string, string[]> = {
    bearer: ['mcp_bearer_token'],
    api_key: ['mcp_api_key'],
    basic: ['mcp_basic_auth'],
  };
  const matchingCreds = authConfig.type
    ? credentials.filter(
        (c) => (typeMap[authConfig.type] || []).includes(c.type) || c.type === 'custom',
      )
    : [];

  const needsCredential = authConfig.type && authConfig.type !== 'none' && !authConfig.credentialId;

  return (
    <div className="border-t border-slate-100 pt-3">
      <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
        <Key className="w-3 h-3" />
        Authentication
      </label>

      {needsCredential && (
        <p className="text-[9px] text-amber-600 font-mono mb-2 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Select or create a credential below, then click Connect.
        </p>
      )}

      <AuthTypeSelect value={authConfig.type || 'none'} onChange={onAuthTypeChange} />

      {authConfig.type && authConfig.type !== 'none' && (
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setCredentialOpen(!credentialOpen)}
            className="w-full flex items-center justify-between text-xs border border-[#cbd5e1] px-2 py-1.5 font-mono bg-white focus:outline-none focus:border-purple-500"
          >
            <span className={selectedCred ? 'text-slate-800' : 'text-slate-400'}>
              {selectedCred ? selectedCred.name : 'Select a saved credential...'}
            </span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform ${credentialOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {credentialOpen && (
            <div className="absolute z-10 top-full left-0 right-0 mt-0.5 border border-[#cbd5e1] bg-white shadow-md max-h-40 overflow-y-auto">
              {loadingCreds ? (
                <div className="px-2 py-3 text-[10px] text-slate-400 font-mono text-center">
                  Loading...
                </div>
              ) : matchingCreds.length === 0 ? (
                <div className="px-2 py-3 text-[10px] text-slate-400 font-mono text-center">
                  No saved credentials
                </div>
              ) : (
                matchingCreds.map((cred) => (
                  <button
                    key={cred.id}
                    type="button"
                    onClick={() => {
                      onCredentialSelect(cred.id);
                      setCredentialOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 text-xs font-mono hover:bg-slate-50 transition-colors flex items-center justify-between ${
                      authConfig.credentialId === cred.id ? 'bg-slate-100 font-bold' : ''
                    }`}
                  >
                    <span className="truncate">{cred.name}</span>
                    {authConfig.credentialId === cred.id && (
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    )}
                  </button>
                ))
              )}
              <button
                type="button"
                onClick={() => {
                  setCredentialOpen(false);
                  onShowCreate(true);
                }}
                className="w-full text-left px-2 py-1.5 text-[10px] font-mono text-purple-600 hover:bg-purple-50 border-t border-slate-100 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Create new credential
              </button>
              {authConfig.credentialId && (
                <button
                  type="button"
                  onClick={() => {
                    onClearCredential();
                    setCredentialOpen(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-[10px] font-mono text-rose-600 hover:bg-rose-50 border-t border-slate-100"
                >
                  Clear selection
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {showCreate && authConfig.type && authConfig.type !== 'none' && (
        <div className="mt-2 p-2 border border-purple-200 bg-purple-50 space-y-2">
          <label className="block text-[9px] font-mono font-bold text-purple-700 uppercase tracking-wider">
            New Credential
          </label>
          <input
            type="text"
            value={newCredName}
            onChange={(e) => onNewCredNameChange(e.target.value)}
            className="w-full bg-white border border-purple-200 p-1.5 text-xs font-mono outline-none rounded-none"
            placeholder="Credential name..."
          />
          <input
            type="password"
            value={newCredValue}
            onChange={(e) => onNewCredValueChange(e.target.value)}
            className="w-full bg-white border border-purple-200 p-1.5 text-xs font-mono outline-none rounded-none"
            placeholder="Secret value..."
          />
          <input
            type="text"
            value={newCredDesc}
            onChange={(e) => onNewCredDescChange(e.target.value)}
            className="w-full bg-white border border-purple-200 p-1.5 text-xs font-mono outline-none rounded-none"
            placeholder="Description (optional)..."
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCreateCredential}
              disabled={!newCredName || !newCredValue}
              className="flex-1 py-1 text-[10px] font-bold font-mono bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 transition-colors"
            >
              Save & Select
            </button>
            <button
              type="button"
              onClick={() => onShowCreate(false)}
              className="py-1 px-2 text-[10px] font-mono text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
