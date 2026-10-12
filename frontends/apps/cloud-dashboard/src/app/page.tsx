'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getApiClient } from '@/lib/api-client';
import { useSseStream } from '@/hooks/use-sse-stream';
import { formatTimestamp } from '@razor/ui-kit';
import {
  Server,
  Activity,
  ArrowRight,
  ShieldCheck,
  Zap,
  GitBranch,
  Play,
  FileText,
} from 'lucide-react';

export default function OverviewPage() {
  const { events } = useSseStream();
  const [activeCount, setActiveCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const loadStats = useCallback(async () => {
    try {
      const client = getApiClient();
      const { data: instances } = await client.GET('/api/instances', {});
      if (instances) {
        setTotalCount(instances.length);
        setActiveCount(instances.filter((i) => i.status === 'Active' || i.isConnected).length);
      }
    } catch {
      // Backend offline or starting up
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Reactive reload when instance events arrive on the SSE stream
  useEffect(() => {
    if (events.length > 0) {
      const latest = events[0];
      if (latest.eventType?.toLowerCase().includes('instance') || latest.eventType?.toLowerCase().includes('engine')) {
        loadStats();
      }
    }
  }, [events, loadStats]);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">System Overview</h2>
          <p className="text-sm text-zinc-400 mt-1">High-level telemetry across registered engine instances and flow runs</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/instances"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-semibold rounded-lg text-xs font-mono transition-colors flex items-center gap-2 shadow-lg shadow-cyan-600/20"
          >
            <span>View Engine Fleet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            href="/runs"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-lg text-xs font-mono transition-colors flex items-center gap-2"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Flow Runs</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-mono flex items-center justify-between">
            <span>Active Engines</span>
            <Server className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white mt-2 font-mono">{activeCount}</div>
          <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Connected via TCP Socket
          </div>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-mono flex items-center justify-between">
            <span>Total Fleet</span>
            <ShieldCheck className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-3xl font-bold text-white mt-2 font-mono">{totalCount}</div>
          <div className="text-xs text-zinc-400 mt-1 font-mono">Registered engines</div>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-mono flex items-center justify-between">
            <span>Live Events</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-cyan-400 mt-2 font-mono">{events.length}</div>
          <div className="text-xs text-zinc-400 mt-1 font-mono">Real-time SSE buffer</div>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-mono flex items-center justify-between">
            <span>Core Protocol</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-white mt-2 font-mono">v1.0</div>
          <div className="text-xs text-zinc-400 mt-1 font-mono">Memory-safe Zero-alloc</div>
        </div>
      </div>

      {/* Operator Quick Actions Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/instances"
          className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-cyan-500/50 hover:bg-zinc-900/70 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-105 transition-transform">
              <Server className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
          </div>
          <h3 className="text-sm font-bold text-white mt-3 font-mono">Engine Fleet Control</h3>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            Manage hot-swappable extension profiles (Adapter, Strategy, NeuralNetwork) and dispatch real-time commands.
          </p>
        </Link>

        <Link
          href="/runs"
          className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-purple-500/50 hover:bg-zinc-900/70 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-105 transition-transform">
              <GitBranch className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 transition-colors" />
          </div>
          <h3 className="text-sm font-bold text-white mt-3 font-mono">Flow Runs & Lineage DAG</h3>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            Supervise deterministic simulations, checkpoint interventions, branch forks, and spliced runs.
          </p>
        </Link>

        <a
          href="http://localhost:3001"
          target="_blank"
          rel="noreferrer"
          className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-emerald-500/50 hover:bg-zinc-900/70 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 font-mono text-zinc-400">:3001</span>
          </div>
          <h3 className="text-sm font-bold text-white mt-3 font-mono">Extension Marketplace</h3>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            Acquire signed indicators, strategies, and neural network models with cryptographic license keys.
          </p>
        </a>
      </div>

      {/* SSE Real-Time Event Feed */}
      <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono">
            Live Real-Time SSE Stream (Last Events)
          </h3>
          <span className="text-xs text-zinc-400 font-mono">{events.length} events received</span>
        </div>

        {events.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-400 font-mono">
            Waiting for domain events from /api/events/stream...
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {events.map((evt, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/50 flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-cyan-400 font-semibold">
                    {evt.eventType}
                  </span>
                  <span className="text-zinc-400">Instance: {evt.instanceId || '—'}</span>
                </div>
                <span className="text-zinc-400">{formatTimestamp(evt.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
