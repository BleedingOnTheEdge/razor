'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getApiBaseUrl, getAuthHeaders } from '@/lib/api-client';
import { useSseStream } from '@/hooks/use-sse-stream';
import { formatTimestamp, formatHash } from '@razor/ui-kit';

export default function PanelOverviewPage() {
  const { events } = useSseStream();
  const [activeCount, setActiveCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [runsCount, setRunsCount] = useState(0);

  const loadStats = useCallback(async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();
      const [resInst, resRuns] = await Promise.all([
        fetch(`${baseUrl}/api/instances`, { headers }),
        fetch(`${baseUrl}/api/runs?page=1&pageSize=1`, { headers }),
      ]);

      if (resInst.ok) {
        const json = await resInst.json();
        const items = Array.isArray(json) ? json : json.items || [];
        setTotalCount(items.length);
        setActiveCount(items.filter((i: any) => i.isConnected || i.status === 'Active').length);
      }

      if (resRuns.ok) {
        const json = await resRuns.json();
        setRunsCount(json.totalCount ?? (Array.isArray(json) ? json.length : 0));
      }
    } catch {
      // Offline fallback
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (events.length > 0) {
      loadStats();
    }
  }, [events, loadStats]);

  return (
    <div className="space-y-6 max-w-7xl font-mono text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-black">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-tight text-black">
            Razor Operator Command Surface
          </h1>
          <p className="text-black font-normal mt-1">
            Real-time quantitative engine telemetry, execution fleet synchronization, and institutional audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/panel/live"
            className="px-3 py-2 border border-black bg-white hover:bg-black hover:text-white font-bold transition-colors"
          >
            [LIVE TRADING MANAGER]
          </Link>
          <Link
            href="/panel/runs"
            className="px-3 py-2 border border-black bg-black text-white hover:bg-white hover:text-black font-bold transition-colors"
          >
            [+ LAUNCH FLOW RUN]
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border border-black bg-white">
          <span className="font-bold text-black uppercase block">Connected Engines</span>
          <span className="text-2xl font-bold text-green-600 mt-2 block">
            {activeCount} / {totalCount}
          </span>
          <span className="text-[10px] text-black mt-1 block">Active Execution Sockets</span>
        </div>

        <div className="p-4 border border-black bg-white">
          <span className="font-bold text-black uppercase block">Total Flow Runs</span>
          <span className="text-2xl font-bold text-black mt-2 block">
            {runsCount}
          </span>
          <span className="text-[10px] text-black mt-1 block">Backtest / GA / Walk-Forward</span>
        </div>

        <div className="p-4 border border-black bg-white">
          <span className="font-bold text-black uppercase block">Cluster Protocol</span>
          <span className="text-2xl font-bold text-black mt-2 block">
            WebSocket TLS
          </span>
          <span className="text-[10px] text-black mt-1 block">Sub-Millisecond Framing</span>
        </div>

        <div className="p-4 border border-black bg-white">
          <span className="font-bold text-black uppercase block">Platform State</span>
          <span className="text-2xl font-bold text-green-600 mt-2 block">
            [OPERATIONAL]
          </span>
          <span className="text-[10px] text-black mt-1 block">Deterministic Audit Active</span>
        </div>
      </div>

      {/* Quick Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border border-black bg-white space-y-3">
          <h2 className="font-bold text-black uppercase text-sm">Engine Fleet Management</h2>
          <p className="text-black font-normal">
            Inspect connected engine workers, view installed extensions and strategies, rotate API keys, or temporarily share an engine with a developer.
          </p>
          <Link
            href="/panel/instances"
            className="inline-block px-3 py-1.5 border border-black bg-white hover:bg-black hover:text-white font-bold transition-colors"
          >
            [OPEN FLEET REGISTRY]
          </Link>
        </div>

        <div className="p-4 border border-black bg-white space-y-3">
          <h2 className="font-bold text-black uppercase text-sm">Flow Runs & Lineage DAG</h2>
          <p className="text-black font-normal">
            Execute genetic algorithm optimizations, inspect generational parameter convergence, copy winning strategy genomes, and download formulated XLSX workbooks.
          </p>
          <Link
            href="/panel/runs"
            className="inline-block px-3 py-1.5 border border-black bg-white hover:bg-black hover:text-white font-bold transition-colors"
          >
            [INSPECT RUNS & LINEAGE]
          </Link>
        </div>

        <div className="p-4 border border-black bg-white space-y-3">
          <h2 className="font-bold text-black uppercase text-sm">Live Trading Operations</h2>
          <p className="text-black font-normal">
            Monitor real-time positions, track margin utilization, execute emergency killswitches (Command 2001), and dynamically tune risk parameters (Command 1107).
          </p>
          <Link
            href="/panel/live"
            className="inline-block px-3 py-1.5 border border-black bg-white hover:bg-black hover:text-white font-bold transition-colors"
          >
            [ACCESS LIVE MANAGER]
          </Link>
        </div>
      </div>

      {/* Real-Time Telemetry Event Log */}
      <div className="p-4 border border-black bg-white space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-black">
          <h2 className="font-bold text-black uppercase">
            Live Cluster Event Stream (SSE)
          </h2>
          <span className="font-bold text-green-600">[CONNECTED]</span>
        </div>

        {events.length === 0 ? (
          <div className="py-8 text-center text-black font-normal">
            Listening for engine heartbeats, order fills, and flow run status transitions...
          </div>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {events.slice(0, 15).map((ev, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 border border-black hover:bg-zinc-50"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-black">[{ev.eventType}]</span>
                  <span className="text-black">
                    {typeof ev.data === 'string' ? ev.data : JSON.stringify(ev.data ?? {})}
                  </span>
                </div>
                <span className="text-[10px] text-black">
                  {formatTimestamp(ev.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
