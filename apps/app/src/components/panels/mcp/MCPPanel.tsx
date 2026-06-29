import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  ChevronDown,
  Loader2,
  Store,
  Plus,
  CheckCircle2,
  Star,
  Wrench,
} from 'lucide-react';
import { useStore } from '../../../store/index.js';
import { setPendingTouchDrag } from '../../../lib/touch-drag.js';
import { AUTH_LABELS, AUTH_COLORS } from '../../../data/worker-options.js';
import { handleDragStart } from '../../../utils/drag-handle.js';
import {
  listUserServers,
  toggleFavorite,
  adoptRegistryServer,
  searchRegistry,
} from '../../../services/mcp-service.js';

export function MCPPanel() {
  const addNode = useStore((s) => s.addNode);
  const [tab, setTab] = useState<'myservers' | 'registry'>('myservers');
  const [userServers, setUserServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registryServers, setRegistryServers] = useState<any[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [transportFilter, setTransportFilter] = useState('');
  const [transportOpen, setTransportOpen] = useState(false);
  const transportRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const registryServersRef = useRef(registryServers);
  registryServersRef.current = registryServers;

  const fetchUserServers = useCallback(async () => {
    try {
      setLoading(true);
      const servers = await listUserServers();
      const sorted = servers.sort((a: any, b: any) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return 0;
      });
      setUserServers(sorted);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserServers();
  }, [fetchUserServers]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (transportRef.current && !transportRef.current.contains(e.target as Node)) {
        setTransportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleFavorite = async (serverId: string) => {
    const ok = await toggleFavorite(serverId);
    if (ok) {
      setUserServers((prev) =>
        prev
          .map((s) => {
            if (s.id === serverId) return { ...s, isFavorite: !s.isFavorite };
            return s;
          })
          .sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            return 0;
          }),
      );
    }
  };

  const handleSaveToMyServers = async (registryId: string) => {
    setSaving(registryId);
    try {
      await adoptRegistryServer(registryId);
      await fetchUserServers();
    } catch {
      /* noop */
    } finally {
      setSaving(null);
    }
  };

  const handleAddMcpToCanvas = (server: any) => {
    const supportedAuthTypes = server.supportedAuthTypes || [];
    const initialAuthType = supportedAuthTypes.length > 0 ? supportedAuthTypes[0] : 'none';
    const userServer = server.registryId
      ? userServers.find((s) => s.registryId === server.registryId)
      : null;
    addNode(
      'mcp_tool',
      { x: 200, y: 200 },
      {
        label: server.name,
        mcpServerUrl: server.url || '',
        mcpServerId: userServer?.id || server.registryId || server.id || '',
        iconUrl: server.iconUrl,
        mcpAuthConfig: { type: initialAuthType },
        mcpSupportedAuthTypes: supportedAuthTypes,
        mcpUserServerId: userServer?.id || null,
      },
    );
  };

  const handleAddCustomMcp = () => {
    addNode('mcp_tool', { x: 200, y: 200 }, { label: 'Custom MCP', mcpServerUrl: '' });
  };

  const loadRegistry = useCallback(
    async (q: string, transport: string, c: string | null, append = false) => {
      try {
        if (!append) setRegistryLoading(true);
        const result = await searchRegistry(q, transport, c, append, registryServersRef.current);
        setRegistryServers(result.servers);
        setCursor(result.nextCursor);
        setHasMore(result.hasMore);
      } catch {
        /* noop */
      } finally {
        setRegistryLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (tab === 'registry') {
      const timer = setTimeout(() => {
        setCursor(null);
        loadRegistry(search, transportFilter, null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [tab, search, transportFilter, loadRegistry]);

  const configuredIds = new Set(userServers.map((s: any) => s.registryId));

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-[#cbd5e1] px-4 shrink-0">
        <button
          onClick={() => setTab('myservers')}
          className={`text-[9px] font-mono font-bold uppercase tracking-wider py-2.5 px-3 border-b-2 transition-colors ${
            tab === 'myservers'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          My Servers ({userServers.length})
        </button>
        <button
          onClick={() => setTab('registry')}
          className={`text-[9px] font-mono font-bold uppercase tracking-wider py-2.5 px-3 border-b-2 transition-colors ${
            tab === 'registry'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Registry
        </button>
      </div>

      {tab === 'registry' && (
        <div className="px-4 py-2.5 border-b border-[#cbd5e1] shrink-0">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search registry..."
                className="w-full pl-7 pr-2 py-1 text-[10px] border border-slate-300 outline-none focus:border-purple-500 font-mono"
              />
            </div>
            <div className="relative" ref={transportRef}>
              <button
                type="button"
                onClick={() => setTransportOpen(!transportOpen)}
                className="text-[10px] border border-slate-300 px-2 py-1 font-mono outline-none focus:border-purple-500 bg-white flex items-center gap-1 whitespace-nowrap"
              >
                {transportFilter ? transportFilter.toUpperCase() : 'All'}
                <ChevronDown
                  className={`w-2.5 h-2.5 text-slate-400 transition-transform ${transportOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {transportOpen && (
                <div className="absolute z-10 top-full right-0 mt-0.5 border border-slate-300 bg-white shadow-md min-w-[120px]">
                  {[
                    { value: '', label: 'All' },
                    { value: 'http', label: 'HTTP' },
                    { value: 'stdio', label: 'STDIO' },
                    { value: 'sse', label: 'SSE' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setTransportFilter(opt.value);
                        setTransportOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 text-[10px] font-mono hover:bg-slate-50 transition-colors ${transportFilter === opt.value ? 'bg-slate-100 font-bold' : ''} text-slate-600`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 scrollbar">
        {tab === 'myservers' ? (
          <MyServersContent
            servers={userServers}
            loading={loading}
            onToggleFavorite={handleToggleFavorite}
            onAddToCanvas={handleAddMcpToCanvas}
            onAddCustom={handleAddCustomMcp}
          />
        ) : (
          <RegistryContent
            servers={registryServers}
            loading={registryLoading}
            configuredIds={configuredIds}
            saving={saving}
            onSave={handleSaveToMyServers}
            onAddToCanvas={handleAddMcpToCanvas}
            hasMore={hasMore}
            onLoadMore={() => loadRegistry(search, transportFilter, cursor, true)}
          />
        )}
      </div>
    </div>
  );
}

function MyServersContent({
  servers,
  loading,
  onToggleFavorite,
  onAddToCanvas,
  onAddCustom,
}: {
  servers: any[];
  loading: boolean;
  onToggleFavorite: (id: string) => void;
  onAddToCanvas: (server: any) => void;
  onAddCustom: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-[10px] font-mono">Loading...</span>
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <Store className="w-8 h-8 text-slate-300 mb-2" />
        <p className="text-xs font-mono mb-1">No saved MCPs yet.</p>
        <p className="text-[9px] font-mono text-slate-300 mb-4">
          Explore the Registry tab to find and save MCP servers.
        </p>
        <button
          onClick={onAddCustom}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Custom MCP
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {servers.map((server) => (
          <div
            key={server.id}
            onDragStart={(e) =>
              handleDragStart(e, 'mcp_tool', {
                label: server.name,
                mcpServerUrl: server.url || '',
                mcpServerId: server.id || '',
                iconUrl: server.iconUrl,
                mcpAuthConfig: { type: 'none' },
              })
            }
            onTouchStart={() =>
              setPendingTouchDrag('mcp_tool', {
                label: server.name,
                mcpServerUrl: server.url || '',
                mcpServerId: server.id || '',
                iconUrl: server.iconUrl,
                mcpAuthConfig: { type: 'none' },
              })
            }
            draggable
            className="border border-slate-200 p-2.5 hover:border-purple-300 hover:shadow-sm transition-all group relative cursor-grab active:cursor-grabbing"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(server.id);
              }}
              className="absolute top-1.5 right-1.5 p-0.5 text-slate-300 hover:text-amber-500 transition-colors z-10"
              title={server.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star
                className={`w-3 h-3 ${server.isFavorite ? 'fill-amber-500 text-amber-500' : ''}`}
              />
            </button>
            <button onClick={() => onAddToCanvas(server)} className="text-left w-full">
              <div className="flex items-start gap-2">
                {server.iconUrl ? (
                  <img
                    src={server.iconUrl}
                    alt=""
                    className="w-6 h-6 rounded object-contain shrink-0 mt-0.5"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-6 h-6 bg-purple-100 flex items-center justify-center shrink-0">
                    <Wrench className="w-3 h-3 text-purple-600" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-[10px] font-bold text-slate-900 truncate pr-4">
                    {server.name}
                  </h4>
                  <p className="text-[8px] text-slate-500 mt-0.5 line-clamp-2 font-mono leading-relaxed">
                    {server.description || 'No description'}
                  </p>
                  <span className="inline-block text-[7px] font-mono font-bold px-1 py-0.5 bg-slate-100 text-slate-500 uppercase mt-1">
                    {server.transport || 'http'}
                  </span>
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={onAddCustom}
        className="w-full py-2 flex items-center justify-center gap-1.5 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
      >
        <Plus className="w-3 h-3" />
        Add Custom MCP
      </button>
    </div>
  );
}

function RegistryContent({
  servers,
  loading,
  configuredIds,
  saving,
  onSave,
  onAddToCanvas,
  hasMore,
  onLoadMore,
}: {
  servers: any[];
  loading: boolean;
  configuredIds: Set<string>;
  saving: string | null;
  onSave: (registryId: string) => void;
  onAddToCanvas: (server: any) => void;
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-[10px] font-mono">Loading registry...</span>
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <p className="text-[10px] text-slate-400 font-mono text-center py-8">No servers found.</p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {servers.map((server) => {
          const isConfigured = server.registryId ? configuredIds.has(server.registryId) : false;
          return (
            <div
              key={server.registryId}
              onDragStart={(e) =>
                handleDragStart(e, 'mcp_tool', {
                  label: server.name,
                  mcpServerUrl: server.url || '',
                  mcpServerId: server.registryId || '',
                  iconUrl: server.iconUrl,
                  mcpAuthConfig: { type: 'none' },
                })
              }
              onTouchStart={() =>
                setPendingTouchDrag('mcp_tool', {
                  label: server.name,
                  mcpServerUrl: server.url || '',
                  mcpServerId: server.registryId || '',
                  iconUrl: server.iconUrl,
                  mcpAuthConfig: { type: 'none' },
                })
              }
              draggable
              className="border border-slate-200 p-2.5 hover:border-purple-300 hover:shadow-sm transition-all group cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-start gap-2 mb-2">
                {server.iconUrl ? (
                  <img
                    src={server.iconUrl}
                    alt=""
                    className="w-6 h-6 rounded object-contain shrink-0 mt-0.5"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-6 h-6 bg-purple-100 flex items-center justify-center shrink-0">
                    <Wrench className="w-3 h-3 text-purple-600" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <h4 className="text-[10px] font-bold text-slate-900 truncate">{server.name}</h4>
                    {isConfigured && (
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-[8px] text-slate-500 mt-0.5 line-clamp-2 font-mono leading-relaxed">
                    {server.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <span className="text-[7px] font-mono font-bold px-1 py-0.5 bg-slate-100 text-slate-500 uppercase">
                      {server.transport || 'http'}
                    </span>
                    {server.supportedAuthTypes?.map((t: string) => (
                      <span
                        key={t}
                        className={`text-[6px] font-mono font-bold px-1 py-0.5 border uppercase ${AUTH_COLORS[t] || ''}`}
                      >
                        {AUTH_LABELS[t] || t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                {!isConfigured ? (
                  <button
                    onClick={() => onSave(server.registryId)}
                    disabled={saving === server.registryId}
                    className="flex-1 py-1 text-[8px] font-mono font-bold border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                  >
                    {saving === server.registryId ? 'Saving...' : 'Save'}
                  </button>
                ) : (
                  <button
                    onClick={() => onAddToCanvas(server)}
                    className="flex-1 py-1 text-[8px] font-mono font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={onLoadMore}
          className="w-full border border-dashed border-slate-300 py-2 text-[10px] text-slate-500 font-mono hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Load more servers
        </button>
      )}
    </div>
  );
}
