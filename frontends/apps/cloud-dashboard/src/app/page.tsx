'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiClient } from '@/lib/api-client';
import { useSseStream } from '@/hooks/use-sse-stream';
import { formatTimestamp } from '@razor/ui-kit';
import { Server, Activity, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function OverviewPage() {
  const { events } = useSseStream();
  const [activeCount, setActiveCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    async function loadStats() {
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
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">System Overview</h2>
          <p className="text-sm text-zinc-400 mt-1">High-level telemetry across registered engine instances and flow runs</p>
        </div>

        <Link
          href="/instances"
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-semibold rounded-lg text-sm transition-colors flex items-center gap-2 shadow-lg shadow-cyan-600/20"
        >
          <span>View Engine Fleet</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-mono flex items-center justify-between">
            <span>Active Engines</span>
            <Server className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white mt-2">{activeCount}</div>
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
          <div className="text-3xl font-bold text-white mt-2">{totalCount}</div>
          <div className="text-xs text-zinc-400 mt-1 font-mono">Registered engines</div>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-mono flex items-center justify-between">
            <span>Live Events</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-cyan-400 mt-2">{events.length}</div>
          <div className="text-xs text-zinc-400 mt-1 font-mono">Real-time SSE buffer</div>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-mono flex items-center justify-between">
            <span>Core Protocol</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-white mt-2">v1.0</div>
          <div className="text-xs text-zinc-400 mt-1 font-mono">Memory-safe Zero-alloc</div>
        </div>
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
