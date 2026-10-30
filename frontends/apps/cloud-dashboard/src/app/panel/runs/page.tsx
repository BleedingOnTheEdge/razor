'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiBaseUrl, getAuthHeaders, downloadRunXlsx } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { ServerPagination } from '@/components/ui/ServerPagination';
import { ActionDropdown } from '@/components/ui/ActionDropdown';
import { formatHash, Button, Card, Badge, Input } from '@razor/ui-kit';
import { Play, RotateCw, FileText, Search, ArrowRight, Activity, TrendingUp, AlertTriangle } from 'lucide-react';

export default function PanelRunsPage() {
  const toast = useToast();

  const [runs, setRuns] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  async function loadInstances() {
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();
      const res = await fetch(`${baseUrl}/api/instances`, { headers });
      if (res.ok) {
        const json = await res.json();
        const items = Array.isArray(json) ? json : json.items || [];
        setInstances(items);
      }
    } catch {
      // non-fatal prefetch
    }
  }

  async function loadRuns(silent = false) {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();
      const q = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (kindFilter !== 'ALL') q.set('kind', kindFilter);
      if (statusFilter !== 'ALL') q.set('status', statusFilter);

      const res = await fetch(`${baseUrl}/api/runs?${q.toString()}`, { headers });
      if (!res.ok) {
        throw new Error(`Cloud API returned ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      if (Array.isArray(json)) {
        setRuns(json);
        setTotalCount(json.length);
        setTotalPages(Math.max(1, Math.ceil(json.length / pageSize)));
      } else if (json && Array.isArray(json.items)) {
        setRuns(json.items);
        setTotalCount(json.totalCount ?? json.items.length);
        setTotalPages(json.totalPages ?? 1);
      }
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : 'Error fetching runs.');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadInstances();
  }, []);

  useEffect(() => {
    loadRuns(false);
  }, [page, pageSize, kindFilter, statusFilter]);

  // Polling for live status updates if any run is running (every 2s with quiet refresh)
  useEffect(() => {
    const hasRunning = runs.some((r) => r.status === 'Running');
    if (!hasRunning) return;

    const interval = setInterval(() => {
      loadRuns(true);
    }, 2000);

    return () => clearInterval(interval);
  }, [runs]);

  async function handleExportXlsx(runId: string) {
    try {
      toast.info('Generating XLSX', 'Building comprehensive formulated workbook…');
      await downloadRunXlsx(runId);
      toast.success('XLSX Ready', `Downloaded formulated workbook for ${formatHash(runId, 6)}`);
    } catch (err) {
      toast.error('Export Failed', err instanceof Error ? err.message : 'Could not export XLSX.');
    }
  }

  // Engine instance name lookup map
  const instanceMap: Record<string, string> = {};
  instances.forEach((inst) => {
    if (inst.instanceId) {
      instanceMap[inst.instanceId] = inst.name || inst.engineId || inst.instanceId;
    }
  });

  // Client-side search filtering
  const filtered = runs.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const instName = (r.engineInstanceName || instanceMap[r.engineInstanceId] || '').toLowerCase();
    return (
      r.id.toLowerCase().includes(q) ||
      (r.kind || '').toLowerCase().includes(q) ||
      instName.includes(q)
    );
  });

  function formatUserLocalTime(dateStr?: string | null) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-xs text-zinc-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="emerald" dot>
              Execution Pipeline
            </Badge>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#3ECF8E]" />
            <span>Deterministic Flow Runs</span>
          </h1>
          <p className="text-xs text-zinc-400 font-normal mt-1">
            Continuous genetic optimization, walk-forward windows, backtests, and live executions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            pill
            size="sm"
            onClick={() => loadRuns(false)}
            disabled={loading}
            className="gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          {/* Dedicated New Run Page link */}
          <Link href="/panel/runs/new">
            <Button variant="primary" pill size="sm" className="gap-1.5 shadow-sm shadow-[#3ECF8E]/20">
              <Play className="w-3.5 h-3.5" />
              <span>Launch Run →</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Telemetry Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-white border-zinc-200 shadow-xs">
          <span className="text-[11px] font-medium text-zinc-500 block">Total Pipelines</span>
          <span className="text-xl font-bold font-mono text-zinc-900 mt-1 block tabular-nums">
            {totalCount || runs.length}
          </span>
        </Card>
        <Card className="p-3.5 bg-white border-zinc-200 shadow-xs">
          <span className="text-[11px] font-medium text-zinc-500 block">Active Running</span>
          <span className="text-xl font-bold font-mono text-emerald-600 mt-1 block tabular-nums flex items-center gap-1.5">
            <span>{runs.filter((r) => r.status === 'Running').length}</span>
            {runs.some((r) => r.status === 'Running') && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </span>
        </Card>
        <Card className="p-3.5 bg-white border-zinc-200 shadow-xs">
          <span className="text-[11px] font-medium text-zinc-500 block">Completed Backtests</span>
          <span className="text-xl font-bold font-mono text-zinc-900 mt-1 block tabular-nums">
            {runs.filter((r) => r.kind === 'Backtest' && r.status === 'Completed').length}
          </span>
        </Card>
        <Card className="p-3.5 bg-white border-zinc-200 shadow-xs">
          <span className="text-[11px] font-medium text-zinc-500 block">Optimizations</span>
          <span className="text-xl font-bold font-mono text-zinc-900 mt-1 block tabular-nums">
            {runs.filter((r) => r.kind === 'Optimization' || r.kind === 'WalkForward').length}
          </span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white border-zinc-200 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block font-medium text-zinc-300 mb-1.5">Search Run</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search run ID, kind or engine…"
                className="w-full pl-9 pr-3 py-1.5 border border-[#262626] rounded-lg bg-[#141414] text-zinc-100 placeholder:text-zinc-500 font-mono text-xs focus:outline-none focus:border-[#3ECF8E] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-zinc-300 mb-1.5">Execution Mode</label>
            <select
              value={kindFilter}
              onChange={(e) => {
                setKindFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 border border-[#262626] rounded-lg bg-[#141414] text-zinc-200 font-mono text-xs focus:outline-none focus:border-[#3ECF8E]"
            >
              <option value="ALL">All Modes</option>
              <option value="Backtest">Backtest</option>
              <option value="Optimization">Optimization</option>
              <option value="WalkForward">WalkForward</option>
              <option value="Live">Live</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-zinc-300 mb-1.5">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 border border-[#262626] rounded-lg bg-[#141414] text-zinc-200 font-mono text-xs focus:outline-none focus:border-[#3ECF8E]"
            >
              <option value="ALL">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Running">Running</option>
              <option value="Failed">Failed</option>
              <option value="Paused">Paused</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              pill
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setKindFilter('ALL');
                setStatusFilter('ALL');
                setPage(1);
              }}
              className="w-full justify-center"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Runs Table */}
      {loading ? (
        <Card className="py-16 text-center text-zinc-400 font-mono">
          Fetching runs from cloud registry…
        </Card>
      ) : error ? (
        <Card className="p-4 border-rose-500/30 bg-rose-500/10 text-rose-400 font-medium">
          Error: {error}
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="py-16 text-center p-8">
          <Activity className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="font-semibold text-zinc-200 text-sm">No Flow Runs Found</p>
          <p className="mt-1 text-zinc-500 text-xs">Adjust filters or launch a new backtest or optimization run.</p>
          <div className="mt-4">
            <Link href="/panel/runs/new">
              <Button variant="primary" pill size="sm" className="gap-2">
                <Play className="w-3.5 h-3.5" />
                <span>Launch First Run</span>
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#262626] bg-[#171717] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#262626] bg-[#141414] font-semibold text-zinc-400 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Run ID</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 hidden sm:table-cell">Engine Name</th>
                  <th className="py-2.5 px-3 text-right">Total Return & Drawdown</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Created At (Local Time)</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {filtered.map((r) => {
                  const engineName = r.engineInstanceName || instanceMap[r.engineInstanceId] || (r.engineInstanceId ? `Engine ${formatHash(r.engineInstanceId, 6)}` : '—');
                  const returnPct = r.totalReturn ?? r.metrics?.totalReturn ?? (r.netProfit ? (r.netProfit / 1000) : 0);
                  const isPositive = returnPct >= 0;
                  const maxDd = r.maxDrawdown ?? r.metrics?.maxDrawdown ?? 0;
                  const isDdHit = maxDd >= 10.0;

                  return (
                    <tr key={r.id} className="hover:bg-[#1f1f1f] transition-colors">
                      <td className="py-3 px-3">
                        <Link
                          href={`/panel/reports/${r.id}`}
                          className="font-medium text-zinc-100 hover:text-[#3ECF8E] transition-colors block font-mono"
                        >
                          {formatHash(r.id, 8)}
                        </Link>
                        <span className="block md:hidden text-[10px] text-zinc-500 mt-0.5 font-mono">
                          {formatUserLocalTime(r.createdAt)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-zinc-300 text-xs">{r.kind}</span>
                      </td>
                      <td className="py-3 px-3">
                        {r.status === 'Completed' ? (
                          <Badge variant="emerald" dot>Completed</Badge>
                        ) : r.status === 'Running' ? (
                          <Badge variant="info" dot className="animate-pulse">Running</Badge>
                        ) : (
                          <Badge variant="danger">{r.status}</Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 hidden sm:table-cell font-medium text-zinc-300">
                        {r.engineInstanceId ? (
                          <Link
                            href={`/panel/instances/${r.engineInstanceId}`}
                            className="hover:text-[#3ECF8E] transition-colors"
                            title={`Instance ID: ${r.engineInstanceId}`}
                          >
                            {engineName}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium">
                        <span className={isPositive ? 'text-[#3ECF8E]' : 'text-rose-400'}>
                          {returnPct > 0 ? `+${returnPct.toFixed(2)}%` : `${returnPct.toFixed(2)}%`}
                        </span>
                        {isDdHit && (
                          <span className="ml-2 px-1.5 py-0.2 rounded border border-rose-500/30 bg-rose-500/10 text-rose-400 text-[10px] font-mono inline-block">
                            DD Reached
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-zinc-400 font-mono text-[11px] hidden md:table-cell">
                        {formatUserLocalTime(r.createdAt)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/panel/reports/${r.id}`}>
                            <Button variant="outline" size="sm" pill className="text-xs h-7 px-2.5 gap-1">
                              <FileText className="w-3.5 h-3.5 text-[#3ECF8E]" />
                              <span>Report</span>
                            </Button>
                          </Link>
                          <ActionDropdown
                            label="⋯"
                            items={[
                              {
                                label: 'View Lineage DAG',
                                href: `/panel/runs/${r.id}/lineage`,
                              },
                              {
                                label: 'Re-run With Exact DNA',
                                href: `/panel/runs/new?cloneFrom=${r.id}`,
                              },
                              {
                                label: 'Export Formulated XLSX',
                                onClick: () => handleExportXlsx(r.id),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ServerPagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
}
