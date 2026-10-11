'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiClient } from '@/lib/api-client';
import { getInstanceStatusBadge, formatTimestamp, formatHash } from '@razor/ui-kit';
import { Server, RefreshCw, ArrowRight } from 'lucide-react';

interface InstanceItem {
  instanceId: string;
  accountId: string;
  licenseId: string;
  engineId: string;
  name: string;
  status: string;
  createdAt: string;
  lastSeenAt?: string | null;
  isConnected: boolean;
  manifestExtensionCount: number;
}

export default function InstancesPage() {
  const [instances, setInstances] = useState<InstanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadInstances() {
    setLoading(true);
    setError(null);
    try {
      const client = getApiClient();
      const { data, error: err } = await client.GET('/api/instances', {});
      if (err) {
        setError('Failed to load engine instances from Cloud API.');
      } else if (data) {
        setInstances(data);
      }
    } catch (e: any) {
      setError(e?.message || 'Error communicating with Cloud API backend.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInstances();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Engine Fleet</h2>
          <p className="text-sm text-zinc-400 mt-1">Manage, inspect, and dispatch control commands to connected Razor Engines</p>
        </div>

        <button
          onClick={loadInstances}
          className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Fleet</span>
        </button>
      </div>

      {loading && (
        <div className="py-12 text-center text-sm font-mono text-zinc-400">
          Fetching engine fleet from Cloud API...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-mono">
          {error}
        </div>
      )}

      {!loading && !error && instances.length === 0 && (
        <div className="py-16 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20">
          <div className="w-12 h-12 mx-auto rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
            <Server className="w-6 h-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-zinc-200">No Engine Instances Registered</h3>
          <p className="mt-1 text-sm text-zinc-400">Register an engine instance via POST /api/engines or start a local worker.</p>
        </div>
      )}

      {!loading && instances.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instances.map((instance) => {
            const badge = getInstanceStatusBadge(instance.status);
            return (
              <div
                key={instance.instanceId}
                className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-white text-lg tracking-tight">
                        {instance.name || instance.engineId}
                      </h3>
                      <p className="text-xs font-mono text-zinc-400 mt-0.5">
                        ID: {formatHash(instance.instanceId, 6)}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="mt-5 space-y-2 text-xs font-mono text-zinc-400">
                    <div className="flex items-center justify-between py-1 border-b border-zinc-800/40">
                      <span className="text-zinc-400">Connection</span>
                      <span
                        className={`flex items-center gap-1.5 ${
                          instance.isConnected ? 'text-emerald-400' : 'text-zinc-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            instance.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                          }`}
                        />
                        {instance.isConnected ? 'Connected' : 'Offline'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-zinc-800/40">
                      <span className="text-zinc-400">Manifest Plugins</span>
                      <span className="text-zinc-200 font-semibold">
                        {instance.manifestExtensionCount} extensions
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-zinc-800/40">
                      <span className="text-zinc-400">Registered</span>
                      <span className="text-zinc-300">{formatTimestamp(instance.createdAt)}</span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-zinc-400">Last Heartbeat</span>
                      <span className="text-zinc-300">{formatTimestamp(instance.lastSeenAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                  <Link
                    href={`/instances/${instance.instanceId}`}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5"
                  >
                    <span>Manage Engine</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
