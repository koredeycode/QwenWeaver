import { useState } from 'react';
import { Key, Database } from 'lucide-react';

interface SetupRuntimeProps {
  onSubmit: (data: { dashscopeApiKey?: string; databaseUrl?: string }) => void;
}

export function SetupRuntime({ onSubmit }: SetupRuntimeProps) {
  const [dashscopeApiKey, setDashscopeApiKey] = useState('');
  const [databaseUrl, setDatabaseUrl] = useState('./data/qwenweaver.db');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      dashscopeApiKey: dashscopeApiKey || undefined,
      databaseUrl: databaseUrl || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <Key className="w-3.5 h-3.5 text-slate-400" /> DashScope API Key
        </label>
        <input
          type="text"
          value={dashscopeApiKey}
          onChange={(e) => setDashscopeApiKey(e.target.value)}
          className="w-full bg-white border border-[#cbd5e1] p-2.5 text-sm text-slate-800 outline-none focus:border-secondary"
          placeholder="sk-..."
        />
        <p className="text-[10px] text-slate-400 font-mono">
          Required for AI agent nodes.{' '}
          <a
            href="https://bailian.console.aliyun.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary underline"
          >
            Get one
          </a>
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-slate-400" /> Database URL
        </label>
        <input
          type="text"
          value={databaseUrl}
          onChange={(e) => setDatabaseUrl(e.target.value)}
          className="w-full bg-white border border-[#cbd5e1] p-2.5 text-sm text-slate-800 outline-none focus:border-secondary font-mono"
        />
        <p className="text-[10px] text-slate-400 font-mono">
          SQLite path (<code>./data/qwenweaver.db</code>) or PostgreSQL URI
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[10px] font-mono text-slate-500">
        JWT secret and other settings are auto-generated. You can change them later in your{' '}
        <code>.env</code> file.
      </div>

      <button
        type="submit"
        className="w-full py-2.5 bg-[#ea580c] hover:bg-[#a73a00] text-white font-bold text-xs flex items-center justify-center gap-2 tracking-wide cursor-pointer"
      >
        Apply Configuration
      </button>
    </form>
  );
}
