import React, { useState, useEffect, useCallback } from 'react';
import { Wrench, Search, X, Loader2, CheckCircle2, ChevronDown, Key, Shield } from 'lucide-react';
import { useStore } from '../store/index.js';
import { client, client2, authHeaders } from '../lib/api-client.js';

const PAGE_SIZE = 20;

const AUTH_LABELS: Record<string, string> = {
  bearer: 'Bearer',
  api_key: 'API Key',
  basic: 'Basic',
};

const AUTH_COLORS: Record<string, string> = {
  bearer: 'text-amber-700 bg-amber-50 border-amber-200',
  api_key: 'text-blue-700 bg-blue-50 border-blue-200',
  basic: 'text-slate-700 bg-slate-50 border-slate-200',
};

interface MarketplaceServer {
  registryId: string;
  name: string;
  description?: string;
  iconUrl?: string;
  transport?: string;
  url?: string;
  id?: string;
  supportedAuthTypes?: string[];
  authRequired?: boolean;
  homepage?: string;
}

export const MCPMarketplace = ({ onClose, initialTab }: { onClose: () => void; initialTab?: 'registry' | 'myservers' }) => {
  const [providedServers, setProvidedServers] = useState<MarketplaceServer[]>([]);
  const [userServers, setUserServers] = useState<MarketplaceServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [transportFilter, setTransportFilter] = useState<string>('');
  const [transportOpen, setTransportOpen] = useState(false);
  const transportRef = React.useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'registry' | 'myservers'>(initialTab || 'registry');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selectedServer, setSelectedServer] = useState<MarketplaceServer | null>(null);
  const addNode = useStore((s) => s.addNode);

  const loadServers = useCallback(async (q: string, transport: string, c: string | null, append = false) => {
    try {
      if (append) { setLoadingMore(true); } else { setLoading(true); }
      const qs: Record<string, string> = { limit: String(PAGE_SIZE) };
      if (q) qs['q'] = q;
      if (transport) qs['transport'] = transport;
      if (c) qs['cursor'] = c;
      const [regRes, userRes] = await Promise.all([
        client2.api.mcp.registry.search.$get({ query: qs }, { headers: authHeaders() }),
        client.api.mcp.servers.$get({}, { headers: authHeaders() }),
      ]);
      if (regRes.ok) {
        const data = await regRes.json() as any;
        if (append) {
          setProvidedServers(prev => [...prev, ...(data.servers || [])]);
        } else {
          setProvidedServers(data.servers || []);
        }
        setCursor(data.cursor ?? null);
        setHasMore(!!data.hasMore);
      }
      if (userRes.ok) {
        const data = await userRes.json() as any;
        setUserServers(data.servers || []);
      }
    } catch (err) {
      console.error('Failed to load servers', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Close transport dropdown on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (transportRef.current && !transportRef.current.contains(e.target as Node)) {
        setTransportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search to avoid firing an API call per keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setCursor(null);
      loadServers(search, transportFilter, null);
    }, 300);
    return () => clearTimeout(timer);
  }, [transportFilter, search, loadServers]);

  const loadMore = () => {
    if (cursor && hasMore && !loadingMore) {
      loadServers(search, transportFilter, cursor, true);
    }
  };

  const handleSaveToMyServers = async (registryId: string) => {
    setSaving(true);
    try {
      const res = await (client2.api.mcp.registry as any).adopt.$post(
        { json: { registryId } },
        { headers: authHeaders() },
      );
      if (res.ok) {
        const userRes = await client.api.mcp.servers.$get({}, { headers: authHeaders() });
        if (userRes.ok) {
          const data = await userRes.json() as any;
          setUserServers(data.servers || []);
        }
      }
    } catch (err) {
      console.error('Failed to save server', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddToCanvas = (server: MarketplaceServer) => {
    const supportedAuthTypes = server.supportedAuthTypes || [];
    // Pre-select the first supported auth type so the Inspector shows the right fields
    const initialAuthType = supportedAuthTypes.length > 0 ? supportedAuthTypes[0] : 'none';
    const userServer = server.registryId ? userServers.find(s => s.registryId === server.registryId) : null;
    addNode('mcp_tool', { x: 200, y: 200 }, {
      label: server.name,
      mcpServerUrl: server.url || '',
      mcpServerId: userServer?.id || server.registryId || server.id || '',
      iconUrl: server.iconUrl,
      mcpAuthConfig: { type: initialAuthType as 'none' | 'api_key' | 'bearer' | 'basic' },
      mcpSupportedAuthTypes: supportedAuthTypes,
      mcpUserServerId: userServer?.id || null,
    });
    onClose();
  };

  const configuredIds = new Set(userServers.map(s => s.registryId));

  if (selectedServer) {
    const server = selectedServer;
    const isConfigured = server.registryId ? configuredIds.has(server.registryId) : false;
    const authTypes = server.supportedAuthTypes || [];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white w-[480px] shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 shrink-0">
            <h2 className="text-sm font-bold text-slate-900 font-sans">Server Details</h2>
            <button onClick={() => setSelectedServer(null)} className="p-1 hover:bg-slate-100 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 overflow-y-auto flex-1">
            <div className="flex items-center gap-3 mb-4">
              {server.iconUrl ? (
                <img src={server.iconUrl} alt="" className="w-10 h-10 rounded object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="w-10 h-10 rounded bg-purple-100 flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-purple-600" />
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-slate-900">{server.name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-[10px] font-mono font-bold px-1 py-0.5 bg-slate-100 text-slate-500 uppercase">{server.transport || 'http'}</span>
                  {authTypes.map((t) => (
                    <span key={t} className={`text-[9px] font-mono font-bold px-1 py-0.5 border uppercase ${AUTH_COLORS[t] || 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                      {AUTH_LABELS[t] || t}
                    </span>
                  ))}
                  {isConfigured && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-mono leading-relaxed mb-4">{server.description || 'No description'}</p>

            {server.url && (
              <div className="text-[10px] text-slate-400 font-mono mb-3 truncate">
                URL: {server.url}
              </div>
            )}

            {/* Auth requirements section */}
            {authTypes.length > 0 ? (
              <div className="mb-4 border border-amber-200 bg-amber-50/50 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Key className="w-3.5 h-3.5 text-amber-700" />
                  <span className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-wider">
                    Authentication Required
                  </span>
                </div>
                <p className="text-[10px] text-amber-700 font-mono leading-relaxed">
                  This server supports {authTypes.map((t) => AUTH_LABELS[t] || t).join(', ')}.
                  Configure credentials in the Inspector panel after adding to canvas.
                </p>
              </div>
            ) : (
              <div className="mb-4 border border-emerald-200 bg-emerald-50/50 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider">
                    No Auth Required
                  </span>
                </div>
                <p className="text-[10px] text-emerald-600 font-mono">
                  This server can be used without authentication.
                </p>
              </div>
            )}

            {!isConfigured && (
              <button
                onClick={() => handleSaveToMyServers(server.registryId)}
                disabled={saving}
                className="w-full py-2 border border-slate-300 text-slate-600 text-xs font-mono hover:bg-slate-100 transition-colors cursor-pointer mb-2 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save to My Servers'}
              </button>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => handleAddToCanvas(server)}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-mono font-bold transition-colors cursor-pointer"
              >
                Add to Canvas
              </button>
              <button
                onClick={() => setSelectedServer(null)}
                className="px-4 py-2 border border-slate-300 text-slate-600 text-xs font-mono hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-[640px] max-h-[80vh] flex flex-col shadow-xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-bold text-slate-900 font-sans">MCP Tool Marketplace</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <form className="px-5 py-3 border-b border-slate-100">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search MCP servers..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 outline-none focus:border-purple-500 font-mono"
              />
            </div>
            <div className="relative" ref={transportRef}>
              <button
                type="button"
                onClick={() => setTransportOpen(!transportOpen)}
                className="text-xs border border-slate-300 px-2 py-1.5 font-mono outline-none focus:border-purple-500 bg-white flex items-center gap-1.5 whitespace-nowrap"
              >
                {transportFilter ? transportFilter.toUpperCase() : 'All Transports'}
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${transportOpen ? 'rotate-180' : ''}`} />
              </button>
              {transportOpen && (
                <div className="absolute z-10 top-full left-0 right-0 mt-0.5 border border-slate-300 bg-white shadow-md min-w-[140px]">
                  {[
                    { value: '', label: 'All Transports' },
                    { value: 'http', label: 'HTTP' },
                    { value: 'stdio', label: 'STDIO' },
                    { value: 'sse', label: 'SSE' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setTransportFilter(opt.value); setTransportOpen(false); }}
                      className={`w-full text-left px-2 py-1.5 text-xs font-mono hover:bg-slate-50 transition-colors ${
                        transportFilter === opt.value ? 'bg-slate-100 font-bold' : ''
                      } text-slate-600`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Tab bar */}
        <div className="flex border-b border-slate-200 px-5">
          <button
            onClick={() => setTab('registry')}
            className={`text-[10px] font-mono font-bold uppercase tracking-wider py-2.5 px-3 border-b-2 transition-colors ${
              tab === 'registry'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Registry ({providedServers.length})
          </button>
          <button
            onClick={() => setTab('myservers')}
            className={`text-[10px] font-mono font-bold uppercase tracking-wider py-2.5 px-3 border-b-2 transition-colors ${
              tab === 'myservers'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            My Servers ({userServers.length})
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-xs font-mono">Loading servers...</span>
            </div>
          ) : tab === 'registry' ? (
            <div>
              {providedServers.length === 0 ? (
                <p className="text-xs text-slate-400 font-mono">No servers found.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {providedServers.map((server) => {
                    const isConfigured = server.registryId ? configuredIds.has(server.registryId) : false;
                    return (
                      <div
                        key={'p-' + server.registryId}
                        onClick={() => setSelectedServer(server)}
                        className="border border-slate-200 p-3 hover:border-purple-300 hover:shadow-sm transition-all group cursor-pointer"
                      >
                        <div className="flex items-start gap-2.5">
                          {server.iconUrl ? (
                            <img src={server.iconUrl} alt="" className="w-7 h-7 rounded object-contain flex-shrink-0 mt-0.5" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <div className="w-7 h-7 bg-purple-100 flex items-center justify-center flex-shrink-0">
                              <Wrench className="w-3.5 h-3.5 text-purple-600" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-[11px] font-bold text-slate-900 truncate">{server.name}</h3>
                              {isConfigured && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />}
                            </div>
                            <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-2 font-mono leading-relaxed">{server.description || 'No description'}</p>
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[8px] font-mono font-bold px-1 py-0.5 bg-slate-100 text-slate-500 uppercase">{server.transport || 'http'}</span>
                              {server.supportedAuthTypes && server.supportedAuthTypes.map((t) => (
                                <span key={t} className={`text-[7px] font-mono font-bold px-1 py-0.5 border uppercase ${AUTH_COLORS[t] || 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                                  {AUTH_LABELS[t] || t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {hasMore && (
                    <div className="col-span-2">
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="w-full border border-dashed border-slate-300 py-2.5 text-[11px] text-slate-500 font-mono hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingMore ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Loading more...
                          </span>
                        ) : (
                          'Load more servers'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              {userServers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <p className="text-xs font-mono mb-1">No saved servers yet.</p>
                  <p className="text-[10px] font-mono text-slate-300">Save a server from the Registry tab to see it here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {userServers.map((server) => (
                    <div
                      key={'u-' + server.id}
                      onClick={() => setSelectedServer(server)}
                      className="border border-emerald-200 p-3 hover:border-emerald-400 hover:shadow-sm transition-all group cursor-pointer bg-emerald-50/30"
                    >
                      <div className="flex items-start gap-2.5">
                        {server.iconUrl ? (
                          <img src={server.iconUrl} alt="" className="w-7 h-7 rounded object-contain flex-shrink-0 mt-0.5" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div className="w-7 h-7 bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-[11px] font-bold text-slate-900 truncate">{server.name}</h3>
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                          </div>
                          <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-2 font-mono leading-relaxed">{server.description || 'No description'}</p>
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            <span className="text-[8px] font-mono font-bold px-1 py-0.5 bg-emerald-100 text-emerald-700 uppercase">{server.transport || 'http'}</span>
                            {server.supportedAuthTypes && server.supportedAuthTypes.map((t) => (
                              <span key={t} className={`text-[7px] font-mono font-bold px-1 py-0.5 border uppercase ${AUTH_COLORS[t] || 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                                {AUTH_LABELS[t] || t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
