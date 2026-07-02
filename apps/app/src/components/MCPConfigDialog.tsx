import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Wrench,
  Key,
  ChevronDown,
  Check,
  Plus,
  AlertTriangle,
  Puzzle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useStore } from '../store/index.js';
import { client, client2 } from '../lib/api-client.js';

const AUTH_LABELS: Record<string, string> = {
  none: 'No Auth',
  bearer: 'Bearer Token',
  api_key: 'API Key',
  basic: 'Basic Auth',
};

const AUTH_COLORS: Record<string, string> = {
  none: 'text-slate-500',
  bearer: 'text-amber-600',
  api_key: 'text-blue-600',
  basic: 'text-emerald-600',
};

export const MCPConfigDialog = () => {
  const nodeId = useStore((s) => s.mcpConfigDialogNodeId);
  const setDialogNodeId = useStore((s) => s.setMcpConfigDialogNodeId);
  const node = useStore((s) => s.nodes.find((n) => n.id === nodeId));
  const updateNodeData = useStore((s) => s.updateNodeData);

  const [mcpStatus, setMcpStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>(
    'disconnected',
  );
  const [discoveredTools, setDiscoveredTools] = useState<any[]>([]);
  const [mcpError, setMcpError] = useState('');
  const [mcpSecrets, setMcpSecrets] = useState<Record<string, string>>({});
  const [credentials, setCredentials] = useState<any[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [showCreateCredential, setShowCreateCredential] = useState(false);
  const [newCredName, setNewCredName] = useState('');
  const [newCredValue, setNewCredValue] = useState('');
  const [newCredDesc, setNewCredDesc] = useState('');

  useEffect(() => {
    if (nodeId) {
      setLoadingCreds(true);
      (async () => {
        try {
          const res = await client2.api.credentials.$get();
          const data = (await res.json()) as any;
          setCredentials(data.credentials || []);
        } catch {
          // ignore
        } finally {
          setLoadingCreds(false);
        }
      })();
    }
  }, [nodeId]);

  if (!nodeId || !node) return null;

  const data = node.data;

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(nodeId, { mcpServerUrl: e.target.value });
    setMcpStatus('disconnected');
    setDiscoveredTools([]);
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(nodeId, { mcpServerId: e.target.value });
    setMcpStatus('disconnected');
    setDiscoveredTools([]);
  };

  const handleAuthTypeChange = (type: string) => {
    updateNodeData(nodeId, {
      mcpAuthConfig: {
        ...data.mcpAuthConfig,
        type: type as 'none' | 'api_key' | 'bearer' | 'basic',
        credentialId: type === 'none' ? undefined : data.mcpAuthConfig?.credentialId,
      },
    });
    setMcpSecrets({});
  };

  const handleCredentialSelect = (credentialId: string) => {
    updateNodeData(nodeId, {
      mcpAuthConfig: {
        ...data.mcpAuthConfig,
        credentialId,
      },
    });
  };

  const handleClearCredential = () => {
    updateNodeData(nodeId, {
      mcpAuthConfig: {
        ...data.mcpAuthConfig,
        credentialId: undefined,
      },
    });
  };

  const handleConnect = async () => {
    if (!nodeId || !data.mcpServerId) {
      setMcpStatus('error');
      setMcpError('Save the server ID first');
      return;
    }
    try {
      setMcpStatus('connecting');
      const body: Record<string, unknown> = { serverId: data.mcpServerId };
      if (data.mcpServerUrl) body.serverUrl = data.mcpServerUrl;
      const authType = data.mcpAuthConfig?.type;
      if (authType && authType !== 'none') {
        body.auth = { type: authType, ...mcpSecrets };
      }
      const res = await client.api.mcp.tools.discover.$post({
        json: body as any,
      });
      const result: any = await res.json();
      if (!res.ok) {
        setMcpStatus('error');
        setMcpError(result.error || 'Failed to discover tools');
        return;
      }
      setDiscoveredTools(result.tools || []);
      setMcpStatus('connected');
      const userServerId = (data as any).mcpUserServerId;
      if (authType && authType !== 'none' && userServerId) {
        (client.api.mcp.servers[':id'] as any).auth
          .$post({
            param: { id: userServerId },
            json: { authConfig: { type: authType, ...mcpSecrets } },
          })
          .catch(() => {});
      }
    } catch {
      setMcpStatus('error');
      setMcpError('Connection failed');
    }
  };

  const handleCreateCredential = async () => {
    if (!newCredValue || !newCredName) return;
    try {
      const authType = data.mcpAuthConfig?.type;
      const typeMap: Record<string, string> = {
        bearer: 'mcp_bearer_token',
        api_key: 'mcp_api_key',
        basic: 'mcp_basic_auth',
      };
      const res = await client2.api.credentials.$post({
        json: {
          name: newCredName,
          type: (typeMap[authType || ''] || 'custom') as any,
          value: newCredValue,
          description: newCredDesc || undefined,
        },
      });
      const result: any = await res.json();
      if (res.ok && result.credential) {
        setCredentials((prev) => [...prev, result.credential]);
        updateNodeData(nodeId, {
          mcpAuthConfig: {
            ...data.mcpAuthConfig,
            credentialId: result.credential.id,
          },
        });
        setShowCreateCredential(false);
        setNewCredName('');
        setNewCredValue('');
        setNewCredDesc('');
      }
    } catch {
      // noop
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[520px] max-h-[80vh] bg-white shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-purple-100 flex items-center justify-center">
              <Wrench className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-sans">
                {data.label || 'MCP Tool'} — Configuration
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Configure MCP server connection and authentication
              </p>
            </div>
          </div>
          <button
            onClick={() => setDialogNodeId(null)}
            className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 border border-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Step 1: Server Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">
                1
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                Server Connection
              </span>
            </div>
            <div className="space-y-3 pl-7">
              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                  MCP Server URL
                </label>
                <input
                  type="text"
                  value={data.mcpServerUrl || ''}
                  onChange={handleUrlChange}
                  className="w-full border border-[#cbd5e1] p-2 text-xs font-mono text-slate-800 outline-none focus:border-purple-500"
                  placeholder="e.g. http://localhost:8000"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Exposed Server ID
                </label>
                <input
                  type="text"
                  value={data.mcpServerId || ''}
                  onChange={handleIdChange}
                  className="w-full border border-[#cbd5e1] p-2 text-xs font-mono text-slate-800 outline-none focus:border-purple-500"
                  placeholder="e.g. github-server"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Auth */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">
                2
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                Authentication
              </span>
            </div>
            <div className="pl-7 space-y-2">
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Key className="w-3 h-3" />
                Auth Type
              </label>
              <AuthTypeSelect
                value={data.mcpAuthConfig?.type || 'none'}
                onChange={handleAuthTypeChange}
              />
              {data.mcpAuthConfig?.type && data.mcpAuthConfig.type !== 'none' && (
                <CredentialPicker
                  authConfig={data.mcpAuthConfig}
                  credentials={credentials}
                  loadingCreds={loadingCreds}
                  showCreate={showCreateCredential}
                  newCredName={newCredName}
                  newCredValue={newCredValue}
                  newCredDesc={newCredDesc}
                  onCredentialSelect={handleCredentialSelect}
                  onClearCredential={handleClearCredential}
                  onShowCreate={setShowCreateCredential}
                  onNewCredNameChange={setNewCredName}
                  onNewCredValueChange={setNewCredValue}
                  onNewCredDescChange={setNewCredDesc}
                  onCreateCredential={handleCreateCredential}
                />
              )}
              {data.mcpAuthConfig?.type &&
                data.mcpAuthConfig.type !== 'none' &&
                !data.mcpAuthConfig?.credentialId && (
                  <div className="border border-amber-200 bg-amber-50 p-2">
                    <label className="block text-[10px] font-mono font-bold text-amber-600 uppercase tracking-wider mb-1">
                      Inline Credentials
                    </label>
                    {data.mcpAuthConfig.type === 'bearer' && (
                      <input
                        type="password"
                        value={mcpSecrets.token || ''}
                        onChange={(e) => setMcpSecrets((s) => ({ ...s, token: e.target.value }))}
                        className="w-full border border-[#cbd5e1] p-2 text-xs font-mono outline-none"
                        placeholder="Bearer token..."
                      />
                    )}
                    {data.mcpAuthConfig.type === 'api_key' && (
                      <input
                        type="password"
                        value={mcpSecrets.apiKey || ''}
                        onChange={(e) => setMcpSecrets((s) => ({ ...s, apiKey: e.target.value }))}
                        className="w-full border border-[#cbd5e1] p-2 text-xs font-mono outline-none"
                        placeholder="API key..."
                      />
                    )}
                    {data.mcpAuthConfig.type === 'basic' && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={mcpSecrets.username || ''}
                          onChange={(e) =>
                            setMcpSecrets((s) => ({ ...s, username: e.target.value }))
                          }
                          className="w-full border border-[#cbd5e1] p-2 text-xs font-mono outline-none"
                          placeholder="Username..."
                        />
                        <input
                          type="password"
                          value={mcpSecrets.password || ''}
                          onChange={(e) =>
                            setMcpSecrets((s) => ({ ...s, password: e.target.value }))
                          }
                          className="w-full border border-[#cbd5e1] p-2 text-xs font-mono outline-none"
                          placeholder="Password..."
                        />
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>

          {/* Step 3: Connect */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">
                3
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                Discover Tools
              </span>
            </div>
            <div className="pl-7">
              <button
                onClick={handleConnect}
                disabled={mcpStatus === 'connecting'}
                className={`w-full py-2.5 font-mono text-xs font-bold border transition-all ${
                  mcpStatus === 'connected'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : mcpStatus === 'error'
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : 'bg-white hover:bg-purple-50 border-purple-300 text-purple-700'
                }`}
              >
                {mcpStatus === 'disconnected' && 'Connect & Discover Tools'}
                {mcpStatus === 'connecting' && (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Connecting...
                  </span>
                )}
                {mcpStatus === 'connected' && (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected ({discoveredTools.length} Tools)
                  </span>
                )}
                {mcpStatus === 'error' && `Failed: ${mcpError}`}
              </button>

              {mcpStatus === 'connected' && discoveredTools.length > 0 && (
                <div className="mt-3 border border-slate-200">
                  <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                      Discovered Tools
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                    {discoveredTools.map((tool: any, idx: number) => (
                      <div key={idx} className="px-3 py-2 flex items-start gap-2">
                        <Puzzle className="w-3 h-3 text-purple-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate">
                            {tool.name}
                          </div>
                          {tool.description && (
                            <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                              {tool.description}
                            </div>
                          )}
                          <div className="text-[8px] text-purple-600 mt-0.5 font-mono">
                            input:{' '}
                            {tool.inputSchema
                              ? JSON.stringify(tool.inputSchema).slice(0, 80) + '...'
                              : 'none'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-5 py-3 flex justify-between items-center bg-slate-50">
          <span className="text-[10px] text-slate-400 font-mono">
            {mcpStatus === 'connected'
              ? `Tool config ready (${discoveredTools.length} tools available)`
              : 'Configure server details above'}
          </span>
          <button
            onClick={() => setDialogNodeId(null)}
            className="px-4 py-1.5 text-xs font-bold font-mono bg-slate-800 text-white hover:bg-slate-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

function AuthTypeSelect({ value, onChange }: { value: string; onChange: (type: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const types = ['none', 'bearer', 'api_key', 'basic'];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
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

function CredentialPicker({
  authConfig,
  credentials,
  loadingCreds,
  showCreate,
  newCredName,
  newCredValue,
  newCredDesc,
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
  onCredentialSelect: (id: string) => void;
  onClearCredential: () => void;
  onShowCreate: (show: boolean) => void;
  onNewCredNameChange: (v: string) => void;
  onNewCredValueChange: (v: string) => void;
  onNewCredDescChange: (v: string) => void;
  onCreateCredential: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCred = credentials.find((c) => c.id === authConfig.credentialId);
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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-xs border border-[#cbd5e1] px-2 py-1.5 font-mono bg-white focus:outline-none focus:border-purple-500"
      >
        <span className={selectedCred ? 'text-slate-800' : 'text-slate-400'}>
          {selectedCred ? selectedCred.name : 'Select a saved credential...'}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
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
                  setOpen(false);
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
              setOpen(false);
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
                setOpen(false);
              }}
              className="w-full text-left px-2 py-1.5 text-[10px] font-mono text-rose-600 hover:bg-rose-50 border-t border-slate-100"
            >
              Clear selection
            </button>
          )}
        </div>
      )}
      {showCreate && authConfig.type && authConfig.type !== 'none' && (
        <div className="mt-2 p-3 border border-purple-200 bg-purple-50 space-y-2">
          <label className="block text-[9px] font-mono font-bold text-purple-700 uppercase tracking-wider">
            New Credential
          </label>
          <input
            type="text"
            value={newCredName}
            onChange={(e) => onNewCredNameChange(e.target.value)}
            className="w-full bg-white border border-purple-200 p-1.5 text-xs font-mono outline-none"
            placeholder="Credential name..."
          />
          <input
            type="password"
            value={newCredValue}
            onChange={(e) => onNewCredValueChange(e.target.value)}
            className="w-full bg-white border border-purple-200 p-1.5 text-xs font-mono outline-none"
            placeholder="Secret value..."
          />
          <input
            type="text"
            value={newCredDesc}
            onChange={(e) => onNewCredDescChange(e.target.value)}
            className="w-full bg-white border border-purple-200 p-1.5 text-xs font-mono outline-none"
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
