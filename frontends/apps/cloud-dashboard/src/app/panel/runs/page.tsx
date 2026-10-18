'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiBaseUrl, getAuthHeaders, downloadRunXlsx } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { ServerPagination } from '@/components/ui/ServerPagination';
import { LaunchRunModal } from '@/components/runs/LaunchRunModal';
import { ActionDropdown } from '@/components/ui/ActionDropdown';
import { formatCurrency, formatPercentage, formatTimestamp, formatHash } from '@razor/ui-kit';

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

  // Launch modal
  const [launchModalOpen, setLaunchModalOpen] = useState(false);
  const [launchInstanceId, setLaunchInstanceId] = useState('');
  const [launchKind, setLaunchKind] = useState<'Backtest' | 'Optimization' | 'WalkForward' | 'Live'>('Backtest');

  async function loadInstances() {
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();
      const res = await fetch(`${baseUrl}/api/instances`, { headers });
      if (res.ok) {
        const json = await res.json();
        const items = Array.isArray(json) ? json : json.items || [];
        setInstances(items);
        if (items.length > 0 && !launchInstanceId) {
          setLaunchInstanceId(items[0].instanceId);
        }
      }
    } catch {
      // fallback
    }
  }

  async function loadRuns() {
    setLoading(true);
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
      setError(err instanceof Error ? err.message : 'Error fetching runs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInstances();
  }, []);

  useEffect(() => {
    loadRuns();
  }, [page, pageSize, kindFilter, statusFilter]);

  // Reactive auto-refresh when any run is in progress
  useEffect(() => {
    const hasRunning = runs.some((r) => r.status === 'Running');
    if (hasRunning) {
      const timer = setInterval(() => {
        loadRuns();
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [runs, page, pageSize, kindFilter, statusFilter]);

  async function handleExportXlsx(runId: string) {
    try {
      toast.info('Exporting', 'Compiling formulated Excel workbook...');
      await downloadRunXlsx(runId);
      toast.success('Downloaded', 'Excel report downloaded.');
    } catch (err) {
      toast.error('Export Failed', err instanceof Error ? err.message : 'Error downloading report.');
    }
  }

  const filtered = runs.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.id && r.id.toLowerCase().includes(q)) ||
      (r.engineInstanceId && r.engineInstanceId.toLowerCase().includes(q)) ||
      (r.kind && r.kind.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-black">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-tight text-black">
            Quantitative Flow Runs & Provenance DAG
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Deterministic execution lifecycle, strategy DNA mutation trees, and institutional audit verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLaunchModalOpen(true)}
            className="px-4 py-2 border border-black bg-black text-white hover:bg-white hover:text-black font-bold transition-colors"
          >
            [+ LAUNCH NEW RUN]
          </button>
          <button
            type="button"
            onClick={loadRuns}
            className="px-3 py-2 border border-black bg-white hover:bg-black hover:text-white font-bold transition-colors"
          >
            [REFRESH]
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 border border-black bg-white">
        <div>
          <label className="block font-bold text-black mb-1">Search Run ID or Hash</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search run hash..."
            className="w-full px-3 py-1.5 border border-black bg-white text-black font-mono focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-bold text-black mb-1">Execution Kind</label>
          <select
            value={kindFilter}
            onChange={(e) => {
              setKindFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-1.5 border border-black bg-white text-black font-mono font-bold focus:outline-none"
          >
            <option value="ALL">All Kinds</option>
            <option value="Backtest">Backtest</option>
            <option value="Optimization">Optimization</option>
            <option value="WalkForward">WalkForward</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-black mb-1">Execution Status</label>
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
            className="w-full px-3 py-1.5 border border-black bg-white hover:bg-zinc-100 text-black font-bold transition-colors"
          >
            [RESET FILTERS]
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-black font-bold border border-black">
          [QUERYING FLOW RUNS FROM CLOUD API...]
        </div>
      ) : error ? (
        <div className="p-4 border border-black text-red-600 font-bold">
          [ERROR]: {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center border border-black p-8 font-bold">
          <p className="uppercase">[NO FLOW RUNS FOUND]</p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setLaunchModalOpen(true)}
              className="px-4 py-2 border border-black bg-black text-white hover:bg-white hover:text-black font-bold transition-colors"
            >
              [LAUNCH FIRST RUN]
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-black overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black bg-zinc-50 text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  <th className="p-3">Run ID</th>
                  <th className="p-3">Kind</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 hidden sm:table-cell">Engine Instance</th>
                  <th className="p-3 text-right hidden md:table-cell">Seed</th>
                  <th className="p-3 hidden lg:table-cell">Created At</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-sm">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="p-3">
                      <Link
                        href={`/panel/reports/${r.id}`}
                        className="font-bold text-black hover:underline"
                      >
                        {formatHash(r.id, 8)}
                      </Link>
                      <span className="block lg:hidden text-[10px] text-black">
                        {formatTimestamp(r.createdAt)}
                      </span>
                    </td>
                    <td className="p-3 font-bold uppercase text-black">[{r.kind}]</td>
                    <td className="p-3">
                      <span
                        className={`font-bold uppercase ${
                          r.status === 'Completed'
                            ? 'text-green-600'
                            : r.status === 'Running'
                            ? 'text-black'
                            : 'text-red-600'
                        }`}
                      >
                        [{r.status}]
                      </span>
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      {r.engineInstanceId ? (
                        <Link
                          href={`/panel/instances/${r.engineInstanceId}`}
                          className="font-bold text-black hover:underline"
                        >
                          {formatHash(r.engineInstanceId, 8)}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3 text-right font-bold text-black hidden md:table-cell">{r.baseSeed ?? 42}</td>
                    <td className="p-3 text-black hidden lg:table-cell">{formatTimestamp(r.createdAt)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/panel/reports/${r.id}`}
                          className="px-2.5 py-1 border border-black bg-black text-white hover:bg-white hover:text-black font-bold transition-colors text-xs"
                        >
                          [REPORT]
                        </Link>
                        <ActionDropdown
                          label="⋮"
                          items={[
                            {
                              label: '[LINEAGE TREE]',
                              href: `/panel/runs/${r.id}/lineage`,
                            },
                            {
                              label: '[EXPORT XLSX]',
                              onClick: () => handleExportXlsx(r.id),
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
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

      {/* Launch Run Modal */}
      <LaunchRunModal
        isOpen={launchModalOpen}
        onClose={() => setLaunchModalOpen(false)}
        instances={instances}
        launchInstanceId={launchInstanceId}
        setLaunchInstanceId={setLaunchInstanceId}
        launchKind={launchKind}
        setLaunchKind={setLaunchKind}
        onRunLaunched={async (newRun) => {
          setLaunchModalOpen(false);
          await loadRuns();
          const id = typeof newRun === 'object' && newRun !== null ? (newRun as any).id : String(newRun);
          toast.success('Run Dispatched', `Flow Run ${formatHash(id, 6)} scheduled.`);
        }}
      />
    </div>
  );
}
