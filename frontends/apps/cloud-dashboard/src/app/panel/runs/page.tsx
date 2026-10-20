'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiBaseUrl, getAuthHeaders, downloadRunXlsx } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { ServerPagination } from '@/components/ui/ServerPagination';
import { ActionDropdown } from '@/components/ui/ActionDropdown';
import { formatHash } from '@razor/ui-kit';
import { Play, RefreshCw, RotateCcw, FileText, Download, GitBranch } from 'lucide-react';

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
      toast.info('Generating XLSX', 'Building comprehensive formulated workbook...');
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
    <div className="space-y-6 max-w-7xl mx-auto font-mono text-xs text-black">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-black flex items-center gap-2 uppercase">
            <Play className="w-5 h-5 text-black" />
            <span>Deterministic Flow Runs</span>
          </h1>
          <p className="text-xs text-black font-normal mt-1 font-sans">
            Continuous genetic optimization, walk-forward windows, backtests, and live executions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadRuns(false)}
            disabled={loading}
            className="px-3 py-1.5 border border-black bg-white hover:bg-black hover:text-white text-black font-bold transition-colors flex items-center gap-1.5 select-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>[REFRESH]</span>
          </button>

          {/* Dedicated New Run Page link */}
          <Link
            href="/panel/runs/new"
            className="px-4 py-1.5 border border-black bg-white hover:bg-black hover:text-white text-black font-bold transition-colors flex items-center gap-2 select-none"
          >
            <Play className="w-3.5 h-3.5" />
            <span>[LAUNCH RUN →]</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 border border-black bg-white">
        <div>
          <label className="block font-bold text-black uppercase mb-1">Search Run</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search run ID, kind or engine..."
            className="w-full px-3 py-1.5 border border-black bg-white text-black font-mono focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-bold text-black uppercase mb-1">Execution Mode</label>
          <select
            value={kindFilter}
            onChange={(e) => {
              setKindFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-1.5 border border-black bg-white text-black font-mono font-bold focus:outline-none"
          >
            <option value="ALL">All Modes</option>
            <option value="Backtest">Backtest</option>
            <option value="Optimization">Optimization</option>
            <option value="WalkForward">WalkForward</option>
            <option value="Live">Live</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-black uppercase mb-1">Status Filter</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-1.5 border border-black bg-white text-black font-mono font-bold focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Running">Running</option>
            <option value="Failed">Failed</option>
            <option value="Paused">Paused</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setKindFilter('ALL');
              setStatusFilter('ALL');
              setPage(1);
            }}
            className="w-full px-3 py-1.5 border border-black bg-white hover:bg-zinc-100 text-black font-bold transition-colors select-none"
          >
            RESET FILTERS
          </button>
        </div>
      </div>

      {/* Runs Table */}
      {loading ? (
        <div className="py-16 text-center text-black font-bold border border-black">
          FETCHING RUNS FROM CLOUD REGISTRY...
        </div>
      ) : error ? (
        <div className="p-4 border border-black text-red-600 font-bold">
          ERROR: {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center border border-black p-8">
          <p className="font-bold text-black uppercase">NO FLOW RUNS FOUND</p>
          <p className="mt-2 text-black font-normal font-sans">Adjust filters or launch a new backtest or optimization run.</p>
          <div className="mt-4">
            <Link
              href="/panel/runs/new"
              className="px-4 py-2 border border-black bg-white hover:bg-black hover:text-white text-black font-bold transition-colors inline-flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              <span>LAUNCH FIRST RUN</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-black overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-black bg-zinc-50 font-bold text-black uppercase tracking-wider">
                  <th className="py-2.5 px-3">Run ID</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 hidden sm:table-cell">Engine Name</th>
                  <th className="py-2.5 px-3 text-right">Total Return & Drawdown</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Created At (Local Time)</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {filtered.map((r) => {
                  const engineName = r.engineInstanceName || instanceMap[r.engineInstanceId] || (r.engineInstanceId ? `Engine ${formatHash(r.engineInstanceId, 6)}` : '—');
                  const returnPct = r.totalReturn ?? r.metrics?.totalReturn ?? (r.netProfit ? (r.netProfit / 1000) : 0);
                  const isPositive = returnPct >= 0;
                  const maxDd = r.maxDrawdown ?? r.metrics?.maxDrawdown ?? 0;
                  const isDdHit = maxDd >= 10.0;

                  return (
                    <tr key={r.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3 px-3">
                        <Link
                          href={`/panel/reports/${r.id}`}
                          className="font-bold text-black hover:underline block font-mono"
                        >
                          {formatHash(r.id, 8)}
                        </Link>
                        <span className="block md:hidden text-[10px] text-zinc-600 mt-0.5">
                          {formatUserLocalTime(r.createdAt)}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-black uppercase">
                        [{r.kind}]
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-bold uppercase ${
                            r.status === 'Completed'
                              ? 'text-green-600'
                              : r.status === 'Running'
                              ? 'text-black animate-pulse'
                              : 'text-red-600'
                          }`}
                        >
                          [{r.status}]
                        </span>
                      </td>
                      <td className="py-3 px-3 hidden sm:table-cell font-bold text-black">
                        {r.engineInstanceId ? (
                          <Link
                            href={`/panel/instances/${r.engineInstanceId}`}
                            className="hover:underline"
                            title={`Instance ID: ${r.engineInstanceId}`}
                          >
                            {engineName}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                          {returnPct > 0 ? `+${returnPct.toFixed(2)}%` : `${returnPct.toFixed(2)}%`}
                        </span>
                        {isDdHit && (
                          <span className="ml-2 px-1.5 py-0.2 border border-red-600 bg-red-50 text-red-600 text-[10px] uppercase font-bold inline-block">
                            [DD REACHED]
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-zinc-700 hidden md:table-cell">
                        {formatUserLocalTime(r.createdAt)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/panel/reports/${r.id}`}
                            className="px-2.5 py-1 border border-black bg-white hover:bg-black hover:text-white text-black font-bold transition-colors inline-flex items-center gap-1 select-none"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>REPORT</span>
                          </Link>
                          <ActionDropdown
                            label="MORE ▾"
                            items={[
                              {
                                label: 'VIEW LINEAGE DAG',
                                href: `/panel/runs/${r.id}/lineage`,
                              },
                              {
                                label: 'RE-RUN WITH EXACT DNA',
                                href: `/panel/runs/new?cloneFrom=${r.id}`,
                              },
                              {
                                label: 'EXPORT FORMULATED XLSX',
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
