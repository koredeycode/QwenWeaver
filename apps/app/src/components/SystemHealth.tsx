import { useState, useEffect } from 'react';
import { Activity, Circle } from 'lucide-react';
import { client2, authHeaders } from '../lib/api-client.js';

interface HealthData {
  node: string;
  database: { type: string; reachable: boolean };
  docker: { available: boolean; version: string | null };
  installMode: string;
  version: string | null;
}

type StatusLevel = 'healthy' | 'degraded' | 'down';

function statusDot(level: StatusLevel) {
  const colors = {
    healthy: 'text-green-500 fill-green-500',
    degraded: 'text-amber-500 fill-amber-500',
    down: 'text-red-500 fill-red-500',
  };
  return <Circle className={`w-2 h-2 ${colors[level]} inline-block`} />;
}

function dbStatus(db: HealthData['database']): StatusLevel {
  if (!db.reachable) return 'down';
  return 'healthy';
}

function dockerStatus(d: HealthData['docker']): StatusLevel {
  if (!d.available) return 'degraded';
  return 'healthy';
}

export const SystemHealth = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchHealth = async () => {
      try {
        const res = await client2.api.system.update.health.$get({}, { headers: authHeaders() });
        if (!res.ok) {
          if (!cancelled) setError(`HTTP ${res.status}`);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setHealth(data as HealthData);
          setError(null);
        }
      } catch {
        if (!cancelled) setError('Failed to fetch');
      }
    };
    fetchHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="text-xs text-slate-400 flex items-center gap-1.5">
        <Activity className="w-3 h-3" />
        <span>System status unavailable</span>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="text-xs text-slate-400 flex items-center gap-1.5">
        <Activity className="w-3 h-3 animate-pulse" />
        <span>Checking...</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <Activity className="w-3 h-3" />
        <span>System Health</span>
      </div>
      <div className="space-y-1 pl-1">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="w-3 flex justify-center">{statusDot('healthy')}</span>
          <span className="w-16">Node</span>
          <span className="font-mono text-[10px] text-slate-400">{health.node}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="w-3 flex justify-center">{statusDot(dbStatus(health.database))}</span>
          <span className="w-16">Database</span>
          <span className="font-mono text-[10px] text-slate-400 capitalize">
            {health.database.type}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="w-3 flex justify-center">{statusDot(dockerStatus(health.docker))}</span>
          <span className="w-16">Docker</span>
          <span className="font-mono text-[10px] text-slate-400">
            {health.docker.available ? 'available' : 'not found'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="w-3 flex justify-center">{statusDot('healthy')}</span>
          <span className="w-16">Mode</span>
          <span className="font-mono text-[10px] text-slate-400">{health.installMode}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="w-3 flex justify-center">{statusDot('healthy')}</span>
          <span className="w-16">Version</span>
          <span className="font-mono text-[10px] text-slate-400">{health.version || 'dev'}</span>
        </div>
      </div>
    </div>
  );
};
