import React, { useState, useMemo } from 'react';
import {
  FileText,
  Database,
  Image,
  Music,
  Film,
  Search,
  RefreshCw,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import type { WorkspaceEntry } from '@qwenweaver/types';

interface WorkspacePanelProps {
  entries: WorkspaceEntry[];
  loading: boolean;
  onRefresh: () => void;
  activeExecutionId: string | null;
}

function getEntryIcon(valueType: string) {
  switch (valueType) {
    case 'file_ref':
      return <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    case 'image_ref':
      return <Image className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
    case 'audio_ref':
      return <Music className="w-3.5 h-3.5 text-sky-500 shrink-0" />;
    case 'json':
      return <Database className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
    default:
      return <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  }
}

function formatValue(value: unknown, valueType: string): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[object]';
    }
  }
  if (valueType === 'json') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

interface TreeNode {
  key: string;
  fullKey: string;
  children: TreeNode[];
  entry?: WorkspaceEntry;
  isLeaf: boolean;
}

function buildTree(entries: WorkspaceEntry[]): TreeNode[] {
  const root: TreeNode[] = [];
  const sorted = [...entries].sort((a, b) => a.key.localeCompare(b.key));

  for (const entry of sorted) {
    const parts = entry.key.split('.');
    let current = root;
    let accumulated = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      accumulated = accumulated ? `${accumulated}.${part}` : part;
      const isLast = i === parts.length - 1;
      const existing = current.find((n) => n.key === part);
      if (existing) {
        if (isLast) {
          existing.entry = entry;
          existing.isLeaf = true;
        }
        current = existing.children;
      } else {
        const newNode: TreeNode = {
          key: part,
          fullKey: accumulated,
          children: [],
          entry: isLast ? entry : undefined,
          isLeaf: isLast,
        };
        current.push(newNode);
        current = newNode.children;
      }
    }
  }

  return root;
}

function TreeNodeRow({
  node,
  depth,
  filter,
  expandedLeaves,
  toggleLeaf,
}: {
  node: TreeNode;
  depth: number;
  filter: string;
  expandedLeaves: Set<string>;
  toggleLeaf: (fullKey: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isLeafExpanded = expandedLeaves.has(node.fullKey);

  const matchesFilter = !filter || node.fullKey.toLowerCase().includes(filter.toLowerCase());
  const hasMatchingChild = !matchesFilter && node.children.some((c) => childMatches(c, filter));

  if (filter && !matchesFilter && !hasMatchingChild) return null;

  const showExpanded = filter ? true : expanded;

  const handleClick = () => {
    if (filter) return;
    if (node.isLeaf) {
      toggleLeaf(node.fullKey);
    } else {
      setExpanded(!expanded);
    }
  };

  const leafValue =
    node.isLeaf && node.entry ? formatValue(node.entry.value, node.entry.valueType) : '';

  return (
    <>
      <div
        className="flex items-start gap-1.5 px-2 py-1 hover:bg-slate-50 cursor-pointer group border-b border-slate-100/50"
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={handleClick}
      >
        {node.isLeaf ? (
          <span className="mt-0.5 shrink-0">{getEntryIcon(node.entry?.valueType || 'text')}</span>
        ) : (
          <span className="mt-0.5 shrink-0 text-slate-400">
            {showExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-mono font-bold text-slate-700 truncate">{node.key}</div>
          {node.isLeaf && node.entry && !isLeafExpanded && (
            <div className="text-[10px] font-mono text-slate-400 mt-0.5 leading-relaxed whitespace-pre-wrap break-all line-clamp-2">
              {leafValue}
            </div>
          )}
          {!node.isLeaf && (
            <div className="text-[9px] font-mono text-slate-400 mt-0.5">
              {node.children.length} item{node.children.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {node.isLeaf && isLeafExpanded && node.entry && (
        <div
          className="border-b border-slate-100/50 bg-slate-50"
          style={{ paddingLeft: `${8 + depth * 14 + 20}px` }}
        >
          <div className="px-2 py-1.5 text-[10px] font-mono text-slate-600 whitespace-pre-wrap break-all leading-relaxed max-h-60 overflow-y-auto border-l-2 border-orange-300 ml-1">
            {leafValue}
          </div>
          <div className="flex items-center gap-3 px-2 pb-1.5 text-[9px] font-mono text-slate-400">
            <span>{node.entry.valueType === 'json' ? 'JSON' : node.entry.valueType || 'text'}</span>
            <span className="text-slate-300">{leafValue.length.toLocaleString()} chars</span>
            <span className="text-slate-300">agent: {node.entry.nodeId.slice(0, 10)}...</span>
          </div>
        </div>
      )}

      {showExpanded &&
        node.children.map((child) => (
          <TreeNodeRow
            key={child.fullKey}
            node={child}
            depth={depth + 1}
            filter={filter}
            expandedLeaves={expandedLeaves}
            toggleLeaf={toggleLeaf}
          />
        ))}
    </>
  );
}

function childMatches(node: TreeNode, filter: string): boolean {
  if (node.fullKey.toLowerCase().includes(filter.toLowerCase())) return true;
  return node.children.some((c) => childMatches(c, filter));
}

export function WorkspacePanel({
  entries,
  loading,
  onRefresh,
  activeExecutionId,
}: WorkspacePanelProps) {
  const [filter, setFilter] = useState('');
  const [expandedLeaves, setExpandedLeaves] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildTree(entries), [entries]);

  const toggleLeaf = (fullKey: string) => {
    setExpandedLeaves((prev) => {
      const next = new Set(prev);
      if (next.has(fullKey)) next.delete(fullKey);
      else next.add(fullKey);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">
            Shared Workspace
          </h3>
          <button
            onClick={onRefresh}
            disabled={loading || !activeExecutionId}
            className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors border border-slate-200 disabled:opacity-40"
            title="Refresh workspace entries"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter keys..."
            className="w-full pl-6 pr-2 py-1 text-[11px] font-mono border border-slate-200 bg-white outline-none focus:border-orange-400 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar bg-white">
        {!activeExecutionId ? (
          <div className="p-4 text-center">
            <p className="text-[10px] font-mono text-slate-400">
              Run a workflow to see shared workspace entries
            </p>
          </div>
        ) : loading && entries.length === 0 ? (
          <div className="p-4 text-center">
            <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-[10px] font-mono text-slate-400">Loading workspace...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-[10px] font-mono text-slate-400">
              No workspace entries yet. Agents can write to the workspace using the{' '}
              <code className="bg-slate-100 px-1 text-[9px]">workspace_write</code> tool.
            </p>
          </div>
        ) : (
          <div className="py-1">
            {tree.map((node) => (
              <TreeNodeRow
                key={node.fullKey}
                node={node}
                depth={0}
                filter={filter}
                expandedLeaves={expandedLeaves}
                toggleLeaf={toggleLeaf}
              />
            ))}
          </div>
        )}
      </div>

      {entries.length > 0 && (
        <div className="px-3 py-1.5 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <span className="text-[9px] font-mono text-slate-400">
            {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
          </span>
          <span className="text-[9px] font-mono text-slate-400">
            click leaf to expand / collapse
          </span>
        </div>
      )}
    </div>
  );
}
