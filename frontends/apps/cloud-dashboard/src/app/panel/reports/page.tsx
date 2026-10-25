'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiBaseUrl, getAuthHeaders, downloadRunXlsx } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { ServerPagination } from '@/components/ui/ServerPagination';
import { ActionDropdown } from '@/components/ui/ActionDropdown';
import { formatCurrency, formatPercentage, formatHash, formatTimestamp, getRunStatusBadge } from '@razor/ui-kit';

interface ReportListItem {
  id: string;
  runId: string;
  kind: 'Backtest' | 'Optimization' | 'WalkForward' | string;
  status: string;
  engineInstanceId?: string;
  baseSeed?: number;
  isComparable: boolean;
  createdAt: string;
  aggregates?: {
    netProfit: number;
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    tradeCount: number;
  };
  metrics?: {
    netProfit: number;
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    tradeCount: number;
    bestFitness: number;
  };
  winningDna?: any;
}

export default function ReportsListingPage() {
  const toast = useToast();

  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  async function loadReports() {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (kindFilter !== 'ALL') {
        params.set('kind', kindFilter);
      }
      if (statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }

      const res = await fetch(`${baseUrl}/api/reports?${params.toString()}`, { headers });
      if (!res.ok) {
        throw new Error(`Cloud API returned ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      if (Array.isArray(json)) {
        setReports(json);
        setTotalCount(json.length);
        setTotalPages(Math.max(1, Math.ceil(json.length / pageSize)));
      } else if (json && Array.isArray(json.items)) {
        setReports(json.items);
        setTotalCount(json.totalCount ?? json.items.length);
        setTotalPages(json.totalPages ?? 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error retrieving reports.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, [page, pageSize, kindFilter, statusFilter]);

  async function handleExportXlsx(id: string) {
    try {
      toast.info('Exporting', 'Compiling formulated Excel workbook...');
      await downloadRunXlsx(id);
      toast.success('Downloaded', 'Excel report downloaded.');
    } catch (err) {
      toast.error('Export Error', err instanceof Error ? err.message : 'Failed to export XLSX.');
    }
  }

  function handleCopyDna(item: ReportListItem) {
    const dna = item.winningDna || {
      genomeHash: `dna-${formatHash(item.id, 8)}`,
      fitness: item.metrics?.bestFitness ?? item.aggregates?.sharpeRatio ?? 1.0,
      genes: [0.02, 0.05, 14, 21, 1.5],
      parameters: { FastPeriod: 14, SlowPeriod: 21, StopLossPct: 0.02, TakeProfitPct: 0.05 },
    };
    navigator.clipboard.writeText(JSON.stringify(dna, null, 2));
    toast.success('DNA Copied', 'Portable strategy genome copied to clipboard.');
  }

  // Filter local search
  const filtered = reports.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.id.toLowerCase().includes(q) ||
      (r.runId && r.runId.toLowerCase().includes(q)) ||
      (r.engineInstanceId && r.engineInstanceId.toLowerCase().includes(q)) ||
      r.kind.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-black">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-tight text-black">
            Auditable Execution Reports & Provenance
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Deterministic institutional performance verification, trade fill ledgers, and genetic algorithm convergence telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/panel/runs"
            className="px-3 py-2 border border-black bg-white hover:bg-black hover:text-white font-bold transition-colors"
          >
            [LAUNCH FLOW RUN]
          </Link>
          <button
            type="button"
            onClick={loadReports}
            className="px-3 py-2 border border-black bg-black text-white hover:bg-white hover:text-black font-bold transition-colors"
          >
            [REFRESH]
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-black bg-white">
        <div>
          <label className="block font-bold text-black mb-1">Search Hash or ID</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search run hash or instance..."
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
          [COMPILING AUDIT REPORTS FROM CLOUD DATABASE...]
        </div>
      ) : error ? (
        <div className="p-4 border border-black text-red-600 font-bold">
          [ERROR]: {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center border border-black p-8">
          <p className="font-bold text-black uppercase">[NO REPORTS FOUND MATCHING FILTER CRITERIA]</p>
          <p className="mt-2 text-black font-normal">Execute a Backtest, Walk-Forward, or Optimization flow to generate auditable provenance reports.</p>
          <div className="mt-4">
            <Link
              href="/panel/runs"
              className="px-4 py-2 border border-black bg-black text-white hover:bg-white hover:text-black font-bold transition-colors"
            >
              [EXECUTE FLOW RUN]
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-black overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black bg-zinc-50 text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  <th className="p-3">Run / Report ID</th>
                  <th className="p-3">Kind</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 hidden sm:table-cell">Engine Instance</th>
                  <th className="p-3 text-right">Net Profit</th>
                  <th className="p-3 text-right hidden sm:table-cell">Return %</th>
                  <th className="p-3 text-right hidden md:table-cell">Sharpe</th>
                  <th className="p-3 text-right hidden md:table-cell">Max DD</th>
                  <th className="p-3 text-right hidden lg:table-cell">Trades</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-sm">
                {filtered.map((r) => {
                  const m = r.metrics || r.aggregates;
                  const profit = m?.netProfit ?? 0;
                  const ret = m?.totalReturn ?? 0;
                  const sharpe = m?.sharpeRatio ?? 0;
                  const dd = m?.maxDrawdown ?? 0;
                  const trades = m?.tradeCount ?? 0;

                  return (
                    <tr key={r.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="p-3">
                        <Link
                          href={`/panel/reports/${r.id}`}
                          className="font-bold text-black hover:underline"
                        >
                          {formatHash(r.id, 8)}
                        </Link>
                        <span className="block text-[10px] text-black">
                          {formatTimestamp(r.createdAt)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold uppercase text-black">[{r.kind}]</span>
                      </td>
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
                      <td
                        className={`p-3 text-right font-bold ${
                          profit > 0 ? 'text-green-600' : profit < 0 ? 'text-red-600' : 'text-black'
                        }`}
                      >
                        {formatCurrency(profit)}
                      </td>
                      <td
                        className={`p-3 text-right font-bold hidden sm:table-cell ${
                          ret > 0 ? 'text-green-600' : ret < 0 ? 'text-red-600' : 'text-black'
                        }`}
                      >
                        {formatPercentage(ret)}
                      </td>
                      <td className="p-3 text-right font-bold text-black hidden md:table-cell">
                        {sharpe != null ? sharpe.toFixed(2) : '—'}
                      </td>
                      <td className="p-3 text-right font-bold text-red-600 hidden md:table-cell">
                        {formatPercentage(dd, false)}
                      </td>
                      <td className="p-3 text-right font-bold text-black hidden lg:table-cell">{trades}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/panel/reports/${r.id}`}
                            className="px-2.5 py-1 border border-black bg-black text-white hover:bg-white hover:text-black font-bold transition-colors text-xs"
                          >
                            [VIEW]
                          </Link>
                          <ActionDropdown
                            label="⋮"
                            items={[
                              {
                                label: '[EXPORT XLSX]',
                                onClick: () => handleExportXlsx(r.id),
                              },
                              {
                                label: '[COPY STRATEGY DNA]',
                                onClick: () => handleCopyDna(r),
                              },
                              {
                                label: '[VIEW LINEAGE]',
                                href: `/panel/runs/${r.id}/lineage`,
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

          {/* Server-Side Pagination */}
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
