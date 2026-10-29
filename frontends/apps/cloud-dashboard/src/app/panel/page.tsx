'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getApiBaseUrl, getAuthHeaders } from '@/lib/api-client';
import { useSseStream } from '@/hooks/use-sse-stream';
import { formatTimestamp, Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@razor/ui-kit';
import { Server, Activity, Radio, Plus, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

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
        setActiveCount(items.filter((i: { isConnected?: boolean; status?: string }) => i.isConnected || i.status === 'Active').length);
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
    <div className="space-y-6 max-w-7xl font-sans text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#262626]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="emerald" dot>
              Internal Dev Surface
            </Badge>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            Operator Command Surface
          </h1>
          <p className="text-zinc-400 font-normal mt-1 text-xs">
            Real-time quantitative engine telemetry, execution fleet synchronization, and institutional audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/panel/live">
            <Button variant="secondary" pill size="sm" className="gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#3ECF8E]" />
              <span>Live Trading Manager</span>
            </Button>
          </Link>
          <Link href="/panel/runs">
            <Button variant="primary" pill size="sm" className="gap-1.5 shadow-sm shadow-[#3ECF8E]/20">
              <Plus className="w-3.5 h-3.5" />
              <span>Launch Flow Run</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-[#171717] border-[#262626]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Connected Engines</span>
            <Server className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-semibold text-[#3ECF8E] mt-2 font-mono tabular-nums">
            {activeCount} <span className="text-sm font-normal text-zinc-500">/ {totalCount}</span>
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">Active Execution Sockets</span>
        </Card>

        <Card className="p-4 bg-[#171717] border-[#262626]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Flow Runs</span>
            <Activity className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-semibold text-zinc-100 mt-2 font-mono tabular-nums">
            {runsCount}
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">Backtest / GA / Walk-Forward</span>
        </Card>

        <Card className="p-4 bg-[#171717] border-[#262626]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Cluster Protocol</span>
            <Zap className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-base font-semibold text-zinc-100 mt-2 font-mono">
            WebSocket TLS
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">Sub-Millisecond Framing</span>
        </Card>

        <Card className="p-4 bg-[#171717] border-[#262626]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Platform State</span>
            <ShieldCheck className="w-4 h-4 text-[#3ECF8E]" />
          </div>
          <div className="text-base font-semibold text-[#3ECF8E] mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#3ECF8E] animate-pulse" />
            Operational
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">Deterministic Audit Active</span>
        </Card>
      </div>

      {/* Quick Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card interactive className="p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#222222] border border-[#2e2e2e]">
                <Server className="w-4 h-4 text-[#3ECF8E]" />
              </div>
              <h2 className="font-semibold text-zinc-100 text-sm">Engine Fleet Management</h2>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Inspect connected engine workers, view installed extensions and strategies, rotate API keys, or temporarily share an engine with a developer.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#262626]">
            <Link href="/panel/instances">
              <Button variant="outline" size="sm" pill className="w-full justify-between">
                <span>Open Fleet Registry</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#3ECF8E]" />
              </Button>
            </Link>
          </div>
        </Card>

        <Card interactive className="p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#222222] border border-[#2e2e2e]">
                <Activity className="w-4 h-4 text-[#3ECF8E]" />
              </div>
              <h2 className="font-semibold text-zinc-100 text-sm">Flow Runs & Lineage DAG</h2>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Execute genetic algorithm optimizations, inspect generational parameter convergence, copy winning strategy genomes, and download formulated XLSX workbooks.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#262626]">
            <Link href="/panel/runs">
              <Button variant="outline" size="sm" pill className="w-full justify-between">
                <span>Inspect Runs & Lineage</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#3ECF8E]" />
              </Button>
            </Link>
          </div>
        </Card>

        <Card interactive className="p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#222222] border border-[#2e2e2e]">
                <Radio className="w-4 h-4 text-[#3ECF8E]" />
              </div>
              <h2 className="font-semibold text-zinc-100 text-sm">Live Trading Operations</h2>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Monitor real-time positions, track margin utilization, execute emergency killswitches (Command 2001), and dynamically tune risk parameters (Command 1107).
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#262626]">
            <Link href="/panel/live">
              <Button variant="outline" size="sm" pill className="w-full justify-between">
                <span>Access Live Manager</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#3ECF8E]" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Real-Time Telemetry Event Log */}
      <Card className="p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-zinc-100 text-sm">
              Live Cluster Event Stream (SSE)
            </h2>
          </div>
          <Badge variant="emerald" dot>
            Connected
          </Badge>
        </div>

        {events.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 font-mono text-xs">
            Listening for engine heartbeats, order fills, and flow run status transitions…
          </div>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto mt-3">
            {events.slice(0, 15).map((ev, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg border border-[#262626] bg-[#1a1a1a] hover:bg-[#222222] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-medium text-[#3ECF8E] text-[11px]">
                    {ev.eventType}
                  </span>
                  <span className="text-zinc-300 font-mono text-[11px] truncate max-w-xl">
                    {typeof ev.data === 'string' ? ev.data : JSON.stringify(ev.data ?? {})}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-zinc-500 shrink-0">
                  {formatTimestamp(ev.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
