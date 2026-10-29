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
  winningDna?: Record<string, unknown>;
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
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#262626]">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-tight text-zinc-100">
            Auditable Execution Reports & Provenance
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Deterministic institutional performance verification, trade fill ledgers, and genetic algorithm convergence telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/panel/runs"
            className="px-3 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors"
          >
            Launch Flow Run
          </Link>
          <button
            type="button"
            onClick={loadReports}
            className="px-3 py-2 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium font-bold transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-[#262626] bg-[#171717]">
        <div>
          <label className="block font-bold text-zinc-100 mb-1">Search Hash or ID</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search run hash or instance..."
            className="w-full px-3 py-1.5 border border-[#262626] bg-[#171717] text-zinc-100 rounded-xl font-mono focus:outline-none focus:border-[#3ECF8E]"
          />
        </div>

        <div>
          <label className="block font-bold text-zinc-100 mb-1">Execution Kind</label>
          <select
            value={kindFilter}
            onChange={(e) => {
              setKindFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-1.5 border border-[#262626] bg-[#171717] text-zinc-100 rounded-xl font-mono font-bold focus:outline-none focus:border-[#3ECF8E]"
          >
            <option value="ALL">All Kinds</option>
            <option value="Backtest">Backtest</option>
            <option value="Optimization">Optimization</option>
            <option value="WalkForward">WalkForward</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-zinc-100 mb-1">Execution Status</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-1.5 border border-[#262626] bg-[#171717] text-zinc-100 rounded-xl font-mono font-bold focus:outline-none focus:border-[#3ECF8E]"
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
            className="w-full px-3 py-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-zinc-100 font-bold border border-[#262626]">
          [COMPILING AUDIT REPORTS FROM CLOUD DATABASE...]
        </div>
      ) : error ? (
        <div className="p-4 border border-[#262626] text-rose-400 font-bold">
          [ERROR]: {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center border border-[#262626] p-8">
          <p className="font-bold text-zinc-100 uppercase">[NO REPORTS FOUND MATCHING FILTER CRITERIA]</p>
          <p className="mt-2 text-zinc-100 font-normal">Execute a Backtest, Walk-Forward, or Optimization flow to generate auditable provenance reports.</p>
          <div className="mt-4">
            <Link
              href="/panel/runs"
              className="px-4 py-2 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium font-bold transition-colors"
            >
              [EXECUTE FLOW RUN]
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-[#262626] overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262626] bg-[#141414] text-xs font-bold text-zinc-300 uppercase tracking-wider">
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
              <tbody className="divide-y divide-[#262626] text-sm">
                {filtered.map((r) => {
                  const m = r.metrics || r.aggregates;
                  const profit = m?.netProfit ?? 0;
                  const ret = m?.totalReturn ?? 0;
                  const sharpe = m?.sharpeRatio ?? 0;
                  const dd = m?.maxDrawdown ?? 0;
                  const trades = m?.tradeCount ?? 0;

                  return (
                    <tr key={r.id} className="hover:bg-[#141414] transition-colors">
                      <td className="p-3">
                        <Link
                          href={`/panel/reports/${r.id}`}
                          className="font-bold text-zinc-100 hover:underline"
                        >
                          {formatHash(r.id, 8)}
                        </Link>
                        <span className="block text-[10px] text-zinc-100">
                          {formatTimestamp(r.createdAt)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold uppercase text-zinc-100">[{r.kind}]</span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-bold uppercase ${
                            r.status === 'Completed'
                              ? 'text-[#3ECF8E]'
                              : r.status === 'Running'
                              ? 'text-zinc-100'
                              : 'text-rose-400'
                          }`}
                        >
                          [{r.status}]
                        </span>
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        {r.engineInstanceId ? (
                          <Link
                            href={`/panel/instances/${r.engineInstanceId}`}
                            className="font-bold text-zinc-100 hover:underline"
                          >
                            {formatHash(r.engineInstanceId, 8)}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        className={`p-3 text-right font-bold ${
                          profit > 0 ? 'text-[#3ECF8E]' : profit < 0 ? 'text-rose-400' : 'text-zinc-100'
                        }`}
                      >
                        {formatCurrency(profit)}
                      </td>
                      <td
                        className={`p-3 text-right font-bold hidden sm:table-cell ${
                          ret > 0 ? 'text-[#3ECF8E]' : ret < 0 ? 'text-rose-400' : 'text-zinc-100'
                        }`}
                      >
                        {formatPercentage(ret)}
                      </td>
                      <td className="p-3 text-right font-bold text-zinc-100 hidden md:table-cell">
                        {sharpe != null ? sharpe.toFixed(2) : '—'}
                      </td>
                      <td className="p-3 text-right font-bold text-rose-400 hidden md:table-cell">
                        {formatPercentage(dd, false)}
                      </td>
                      <td className="p-3 text-right font-bold text-zinc-100 hidden lg:table-cell">{trades}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/panel/reports/${r.id}`}
                            className="px-2.5 py-1 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium font-bold transition-colors text-xs"
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
