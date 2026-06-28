import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bot,
  Brain,
  Image,
  Video,
  Volume2,
  Sparkles,
  Wrench,
  X,
  Star,
  Search,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Plus,
  Store,
  Play,
} from 'lucide-react';
import { useStore } from '../store/index.js';
import { client, client2, authHeaders } from '../lib/api-client.js';
import { setPendingTouchDrag } from '../lib/touch-drag.js';

const WORKER_OPTIONS = [
  {
    id: 'general',
    name: 'General Worker',
    description: 'General-purpose text analysis, synthesis, and tool-calling agent.',
    group: 'text',
    model: 'qwen3.7-plus',
    enableThinking: false,
    outputFormat: 'text' as const,
    systemPrompt: 'You are a general worker agent. Complete your task accurately and concisely.',
    icon: Bot,
    iconBg: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
  },
  {
    id: 'reasoning',
    name: 'Deep Reasoning Worker',
    description: 'Expert agent with thinking/reasoning mode enabled for complex tasks.',
    group: 'text',
    model: 'qwen3.7-max',
    enableThinking: true,
    outputFormat: 'markdown' as const,
    systemPrompt: 'You are a deep reasoning worker. Analyze step-by-step before answering.',
    icon: Brain,
    iconBg: 'bg-purple-50 border-purple-200',
    iconColor: 'text-purple-600',
  },
  {
    id: 'fast',
    name: 'Fast Text Worker',
    description: 'Ultra-fast, cost-efficient worker for simple parser/formatting tasks.',
    group: 'text',
    model: 'qwen3.6-flash',
    enableThinking: false,
    outputFormat: 'text' as const,
    systemPrompt: 'You are a high-speed worker agent. Complete parsing tasks accurately.',
    icon: Sparkles,
    iconBg: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-600',
  },
  {
    id: 'image',
    name: 'Image Generator',
    description: 'Generates static PNG images from text prompts using Wanx Image Pro API.',
    group: 'media',
    model: 'wan2.7-image-pro',
    enableThinking: false,
    outputFormat: 'image' as const,
    systemPrompt: 'Wan2.7 Image Pro generator. Convert instructions to detailed visual prompts.',
    icon: Image,
    iconBg: 'bg-emerald-50 border-emerald-200',
    iconColor: 'text-emerald-600',
  },
  {
    id: 'video',
    name: 'Video Generator',
    description: 'Generates 1080P/720P videos from text prompts using Wanx Video Synthesis API.',
    group: 'media',
    model: 'wan2.7-t2v',
    enableThinking: false,
    outputFormat: 'video' as const,
    systemPrompt: 'Wan2.7 Text-to-Video synthesis. Animate the text instructions.',
    icon: Video,
    iconBg: 'bg-rose-50 border-rose-200',
    iconColor: 'text-rose-600',
  },
  {
    id: 'audio',
    name: 'Speech Synthesizer (TTS)',
    description: 'Synthesizes text into high-fidelity speech using CosyVoice or Qwen-TTS API.',
    group: 'media',
    model: 'cosyvoice-v3-plus',
    enableThinking: false,
    outputFormat: 'audio' as const,
    systemPrompt: 'CosyVoice speech synthesis. Render the given text to speech.',
    icon: Volume2,
    iconBg: 'bg-sky-50 border-sky-200',
    iconColor: 'text-sky-600',
  },
  {
    id: 'supervisor',
    name: 'Supervisor Agent',
    description: 'Coordinates multiple agents and resolves conflicting outputs.',
    group: 'supervisor',
    model: 'qwen3.7-max',
    enableThinking: true,
    outputFormat: 'text' as const,
    systemPrompt: 'You are a supervisor agent. Coordinate workers and resolve conflicts.',
    icon: Brain,
    iconBg: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
  },
];

const REGISTRY_URL = 'https://registry.modelcontextprotocol.io/v0/servers';
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

const TRIGGER_OPTIONS = [
  {
    type: 'trigger' as const,
    label: 'Manual Trigger',
    description: 'Trigger workflow manually or on a schedule.',
    icon: Play,
    iconBg: 'bg-emerald-50 border-emerald-200',
    iconColor: 'text-emerald-600',
  },
  {
    type: 'input_trigger' as const,
    label: 'Input Trigger',
    description: 'Enter initial instruction text to feed to the workflow.',
    icon: Play,
    iconBg: 'bg-emerald-50 border-emerald-200',
    iconColor: 'text-emerald-600',
  },
];

interface DockedPanelProps {
  mode: 'triggers' | 'agents' | 'mcp';
  onClose: () => void;
}

function handleDragStart(
  event: React.DragEvent,
  nodeType: string,
  nodeData?: Record<string, unknown>,
) {
  event.dataTransfer.setData('application/reactflow', nodeType);
  if (nodeData) {
    event.dataTransfer.setData('application/qwenweaver-node-data', JSON.stringify(nodeData));
  }
  event.dataTransfer.effectAllowed = 'move';
}

export const DockedPanel = ({ mode, onClose }: DockedPanelProps) => {
  const addNode = useStore((s) => s.addNode);

  const headerIcon = () => {
    switch (mode) {
      case 'triggers':
        return <Play className="w-4 h-4 text-emerald-600" />;
      case 'agents':
        return <Bot className="w-4 h-4 text-[#f97316]" />;
      case 'mcp':
        return <Wrench className="w-4 h-4 text-purple-600" />;
    }
  };

  const headerTitle = () => {
    switch (mode) {
      case 'triggers':
        return 'TRIGGERS';
      case 'agents':
        return 'AGENTS';
      case 'mcp':
        return 'MCP TOOLS';
    }
  };

  return (
    <div className="h-full bg-white border-r border-[#cbd5e1] flex flex-col font-sans select-none text-slate-800 w-[420px] shadow-xl z-30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#cbd5e1] bg-[#f8fafc] shrink-0">
        <div className="flex items-center gap-2">
          {headerIcon()}
          <h2 className="text-xs font-mono font-bold tracking-wider text-slate-900">
            {headerTitle()}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 border border-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar">
        {mode === 'triggers' ? (
          <TriggerPanel
            onSelect={(type) => {
              addNode(type, { x: 250, y: 200 });
              onClose();
            }}
          />
        ) : mode === 'agents' ? (
          <AgentPanel
            onSelectAgent={(data) => {
              addNode('agent', { x: 250, y: 200 }, data);
              onClose();
            }}
            onSelectSupervisor={(data) => {
              addNode('supervisor', { x: 250, y: 200 }, data);
              onClose();
            }}
          />
        ) : (
          <MCPPanel />
        )}
      </div>
    </div>
  );
};

function TriggerPanel({ onSelect }: { onSelect: (type: 'trigger' | 'input_trigger') => void }) {
  return (
    <div className="p-4 space-y-3">
      <h3 className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-2">
        <span>Workflow Triggers</span>
        <span className="h-px bg-slate-200 flex-1" />
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {TRIGGER_OPTIONS.map((trigger) => {
          const Icon = trigger.icon;
          return (
            <button
              key={trigger.type}
              onClick={() => onSelect(trigger.type)}
              onDragStart={(e) => handleDragStart(e, trigger.type)}
              onTouchStart={() => setPendingTouchDrag(trigger.type)}
              draggable
              className="border border-slate-200 p-3 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all group text-left cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-8 h-8 border ${trigger.iconBg} flex items-center justify-center shrink-0`}
                >
                  <Icon className={`w-4 h-4 ${trigger.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-[11px] font-bold text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                    {trigger.label}
                  </h4>
                  <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-2 font-mono leading-relaxed">
                    {trigger.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AgentPanel({
  onSelectAgent,
  onSelectSupervisor,
}: {
  onSelectAgent: (data: Record<string, unknown>) => void;
  onSelectSupervisor: (data: Record<string, unknown>) => void;
}) {
  const textWorkers = WORKER_OPTIONS.filter((w) => w.group === 'text');
  const mediaWorkers = WORKER_OPTIONS.filter((w) => w.group === 'media');
  const supervisor = WORKER_OPTIONS.find((w) => w.group === 'supervisor')!;

  return (
    <div className="p-4 space-y-5">
      {/* Orchestration first */}
      <div>
        <h3 className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-2">
          <span>Orchestration</span>
          <span className="h-px bg-slate-200 flex-1" />
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() =>
              onSelectSupervisor({
                label: supervisor.name,
                model: supervisor.model,
                enableThinking: supervisor.enableThinking,
                outputFormat: supervisor.outputFormat,
                systemPrompt: supervisor.systemPrompt,
              })
            }
            onDragStart={(e) =>
              handleDragStart(e, 'supervisor', {
                label: supervisor.name,
                model: supervisor.model,
                enableThinking: supervisor.enableThinking,
                outputFormat: supervisor.outputFormat,
                systemPrompt: supervisor.systemPrompt,
              })
            }
            onTouchStart={() =>
              setPendingTouchDrag('supervisor', {
                label: supervisor.name,
                model: supervisor.model,
                enableThinking: supervisor.enableThinking,
                outputFormat: supervisor.outputFormat,
                systemPrompt: supervisor.systemPrompt,
              })
            }
            draggable
            className="border border-blue-200 p-3 hover:border-blue-400 hover:bg-blue-50/30 transition-all group text-left bg-blue-50/20 cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 border bg-blue-50 border-blue-200 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[11px] font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                  {supervisor.name}
                </h4>
                <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-2 font-mono leading-relaxed">
                  {supervisor.description}
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-2">
          <span>Text & Reasoning</span>
          <span className="h-px bg-slate-200 flex-1" />
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {textWorkers.map((worker) => {
            const Icon = worker.icon;
            return (
              <button
                key={worker.id}
                onClick={() =>
                  onSelectAgent({
                    label: worker.name,
                    model: worker.model,
                    enableThinking: worker.enableThinking,
                    outputFormat: worker.outputFormat,
                    systemPrompt: worker.systemPrompt,
                    workerType: worker.id,
                  })
                }
                onDragStart={(e) =>
                  handleDragStart(e, 'agent', {
                    label: worker.name,
                    model: worker.model,
                    enableThinking: worker.enableThinking,
                    outputFormat: worker.outputFormat,
                    systemPrompt: worker.systemPrompt,
                    workerType: worker.id,
                  })
                }
                onTouchStart={() =>
                  setPendingTouchDrag('agent', {
                    label: worker.name,
                    model: worker.model,
                    enableThinking: worker.enableThinking,
                    outputFormat: worker.outputFormat,
                    systemPrompt: worker.systemPrompt,
                    workerType: worker.id,
                  })
                }
                draggable
                className="border border-slate-200 p-3 hover:border-[#f97316] hover:bg-orange-50/30 transition-all group text-left cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-8 h-8 border ${worker.iconBg} flex items-center justify-center shrink-0`}
                  >
                    <Icon className={`w-4 h-4 ${worker.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[11px] font-bold text-slate-900 group-hover:text-[#f97316] transition-colors truncate">
                      {worker.name}
                    </h4>
                    <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-2 font-mono leading-relaxed">
                      {worker.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-2">
          <span>Media Generation</span>
          <span className="h-px bg-slate-200 flex-1" />
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {mediaWorkers.map((worker) => {
            const Icon = worker.icon;
            return (
              <button
                key={worker.id}
                onClick={() =>
                  onSelectAgent({
                    label: worker.name,
                    model: worker.model,
                    enableThinking: worker.enableThinking,
                    outputFormat: worker.outputFormat,
                    systemPrompt: worker.systemPrompt,
                    workerType: worker.id,
                  })
                }
                onDragStart={(e) =>
                  handleDragStart(e, 'agent', {
                    label: worker.name,
                    model: worker.model,
                    enableThinking: worker.enableThinking,
                    outputFormat: worker.outputFormat,
                    systemPrompt: worker.systemPrompt,
                    workerType: worker.id,
                  })
                }
                onTouchStart={() =>
                  setPendingTouchDrag('agent', {
                    label: worker.name,
                    model: worker.model,
                    enableThinking: worker.enableThinking,
                    outputFormat: worker.outputFormat,
                    systemPrompt: worker.systemPrompt,
                    workerType: worker.id,
                  })
                }
                draggable
                className="border border-slate-200 p-3 hover:border-[#f97316] hover:bg-orange-50/30 transition-all group text-left cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-8 h-8 border ${worker.iconBg} flex items-center justify-center shrink-0`}
                  >
                    <Icon className={`w-4 h-4 ${worker.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[11px] font-bold text-slate-900 group-hover:text-[#f97316] transition-colors truncate">
                      {worker.name}
                    </h4>
                    <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-2 font-mono leading-relaxed">
                      {worker.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MCPPanel() {
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

  const fetchUserServers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await client.api.mcp.servers.$get({}, { headers: authHeaders() });
      if (res.ok) {
        const data = (await res.json()) as any;
        const sorted = (data.servers || []).sort((a: any, b: any) => {
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          return 0;
        });
        setUserServers(sorted);
      }
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
    try {
      const res = await (client.api.mcp.servers[':id'] as any).favorite.$post(
        { param: { id: serverId } },
        { headers: authHeaders() },
      );
      if (res.ok) {
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
    } catch {
      /* noop */
    }
  };

  const handleSaveToMyServers = async (registryId: string) => {
    setSaving(registryId);
    try {
      await (client2.api.mcp.registry as any).adopt.$post(
        { json: { registryId } },
        { headers: authHeaders() },
      );
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
    addNode(
      'mcp_tool',
      { x: 200, y: 200 },
      {
        label: 'Custom MCP',
        mcpServerUrl: '',
      },
    );
  };

  const loadRegistry = useCallback(
    async (q: string, transport: string, c: string | null, append = false) => {
      try {
        if (!append) setRegistryLoading(true);
        const searchLower = q.toLowerCase();
        let regCursor: string | undefined = c || undefined;
        const matches: any[] = [];
        let nextCursor: string | undefined;
        let pageCount = 0;

        while (matches.length < 20 && pageCount < 10) {
          const params = new URLSearchParams({ limit: '100', version: 'latest' });
          if (regCursor) params.set('cursor', regCursor);
          const res = await fetch(`${REGISTRY_URL}?${params}`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(15000),
          });
          if (!res.ok) break;
          const data = await res.json();
          if (!data.servers?.length) break;
          nextCursor = data.metadata?.nextCursor;
          pageCount++;

          for (const entry of data.servers) {
            const s = entry.server || {};
            const name = s.name;
            if (!name) continue;
            if (searchLower) {
              const haystack = (
                (s.title || '') +
                ' ' +
                name +
                ' ' +
                (s.description || '')
              ).toLowerCase();
              if (!haystack.includes(searchLower)) continue;
            }
            const normEntry = (() => {
              const server = entry.server || entry;
              const remotes = server.remotes || [];
              const packages = server.packages || [];
              const transports = [
                ...remotes.map((r: any) => (r.type === 'streamable-http' ? 'http' : r.type)),
                ...packages.map((p: any) =>
                  p.transport?.type === 'stdio' ? 'stdio' : p.transport?.type,
                ),
              ].filter(Boolean);
              const firstRemote = remotes[0] || {};
              return {
                registryId: server.name || '',
                name: server.title || server.name || '',
                description: server.description || '',
                transport: transports[0] || 'http',
                url: firstRemote.url || null,
                iconUrl: server.icons?.[0]?.src || null,
              };
            })();
            if (transport && normEntry.transport !== transport) continue;
            const supportedAuthTypes = (() => {
              const types = new Set<string>();
              const remotes = s.remotes || [];
              for (const remote of remotes) {
                const headers = remote.headers || [];
                for (const h of headers) {
                  if (h.isRequired && typeof h.name === 'string') {
                    const hn = h.name.toLowerCase();
                    if (hn === 'authorization') {
                      types.add(
                        (h.description || '').toLowerCase().includes('basic') ? 'basic' : 'bearer',
                      );
                    } else if (hn.includes('api') && hn.includes('key')) {
                      types.add('api_key');
                    }
                  }
                }
              }
              const packages = s.packages || [];
              for (const pkg of packages) {
                const envVars = pkg.environmentVariables || [];
                let hasUser = false,
                  hasPass = false;
                for (const env of envVars) {
                  if (!env.isRequired || typeof env.name !== 'string') continue;
                  const en = env.name.toLowerCase();
                  if (en.includes('api_key') || en.includes('apikey') || en.includes('api-key'))
                    types.add('api_key');
                  else if (en.includes('token')) types.add('bearer');
                  else if (en.includes('username') || en.includes('user')) hasUser = true;
                  else if (en.includes('password') || en.includes('pass')) hasPass = true;
                }
                if (hasUser && hasPass) types.add('basic');
              }
              return Array.from(types);
            })();
            matches.push({
              ...normEntry,
              id: normEntry.registryId,
              supportedAuthTypes,
              authRequired: supportedAuthTypes.length > 0,
            });
            if (matches.length >= 20) break;
          }
          regCursor = nextCursor;
          if (!regCursor) break;
        }
        if (append) {
          setRegistryServers((prev) => [...prev, ...matches]);
        } else {
          setRegistryServers(matches);
        }
        setCursor(nextCursor || null);
        setHasMore(!!nextCursor && matches.length >= 20);
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
