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
      return JSON.stringify(value, null, 2).slice(0, 500);
    } catch {
      return '[object]';
    }
  }
  if (valueType === 'json') {
    try {
      return JSON.stringify(value, null, 2).slice(0, 500);
    } catch {
      return String(value).slice(0, 500);
    }
  }
  return String(value).slice(0, 500);
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
  const map = new Map<string, TreeNode>();

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

function TreeNodeRow({ node, depth, filter }: { node: TreeNode; depth: number; filter: string }) {
  const [expanded, setExpanded] = useState(depth < 2);

  const matchesFilter = !filter || node.fullKey.toLowerCase().includes(filter.toLowerCase());

  const hasMatchingChild = !matchesFilter && node.children.some((c) => childMatches(c, filter));

  if (filter && !matchesFilter && !hasMatchingChild) return null;

  const showExpanded = filter ? true : expanded;

  return (
    <>
      <div
        className="flex items-start gap-1.5 px-2 py-1 hover:bg-slate-50 cursor-pointer group border-b border-slate-100/50"
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => !filter && setExpanded(!expanded)}
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
          {node.isLeaf && node.entry && (
            <div className="text-[10px] font-mono text-slate-400 mt-0.5 leading-relaxed whitespace-pre-wrap break-all line-clamp-2">
              {formatValue(node.entry.value, node.entry.valueType)}
            </div>
          )}
          {!node.isLeaf && (
            <div className="text-[9px] font-mono text-slate-400 mt-0.5">
              {node.children.length} item{node.children.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
      {showExpanded &&
        node.children.map((child) => (
          <TreeNodeRow key={child.fullKey} node={child} depth={depth + 1} filter={filter} />
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
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');

  const tree = useMemo(() => buildTree(entries), [entries]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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

      {/* Content */}
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
        ) : viewMode === 'tree' ? (
          <div className="py-1">
            {tree.map((node) => (
              <TreeNodeRow key={node.fullKey} node={node} depth={0} filter={filter} />
            ))}
          </div>
        ) : (
          <div className="p-2">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-200">
                  <th className="pb-1 pr-2">Key</th>
                  <th className="pb-1 pr-2">Type</th>
                  <th className="pb-1">Agent</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-1 pr-2 text-slate-700 truncate max-w-[140px]">{e.key}</td>
                    <td className="py-1 pr-2 text-slate-400">{e.valueType}</td>
                    <td className="py-1 text-slate-400 truncate max-w-[80px]">
                      {e.nodeId.slice(0, 8)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      {entries.length > 0 && (
        <div className="px-3 py-1.5 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <span className="text-[9px] font-mono text-slate-400">
            {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-1.5 py-0.5 text-[9px] font-mono border transition-colors ${
                viewMode === 'tree'
                  ? 'bg-orange-50 border-orange-300 text-orange-700'
                  : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
              }`}
            >
              Tree
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-1.5 py-0.5 text-[9px] font-mono border transition-colors ${
                viewMode === 'table'
                  ? 'bg-orange-50 border-orange-300 text-orange-700'
                  : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
              }`}
            >
              Table
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
