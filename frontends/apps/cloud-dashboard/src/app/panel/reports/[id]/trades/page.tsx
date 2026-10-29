'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getApiBaseUrl, getAuthHeaders } from '@/lib/api-client';
import { ServerPagination } from '@/components/ui/ServerPagination';
import { formatCurrency, formatPercentage, formatTimestamp, formatHash } from '@razor/ui-kit';

interface TradeItem {
  ticket: string;
  symbol: string;
  side: 'Buy' | 'Sell' | string;
  volume: number;
  openTime: string;
  openPrice: number;
  closeTime?: string;
  closePrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  commission: number;
  pnl: number;
  returnPct?: number;
  slippageTicks?: number;
  durationSeconds?: number;
}

export default function RunTradesListingPage() {
  const params = useParams();
  const runId = params.id as string;

  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [symbolFilter, setSymbolFilter] = useState('');
  const [sideFilter, setSideFilter] = useState('ALL');

  async function loadTrades() {
    if (!runId) return;
    setLoading(true);
    setError(null);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();
      const q = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (symbolFilter.trim()) q.set('symbol', symbolFilter.trim());
      if (sideFilter !== 'ALL') q.set('side', sideFilter);

      const res = await fetch(`${baseUrl}/api/reports/${runId}/trades?${q.toString()}`, { headers });
      if (!res.ok) {
        throw new Error(`Cloud API returned ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      if (Array.isArray(json)) {
        setTrades(json);
        setTotalCount(json.length);
        setTotalPages(Math.max(1, Math.ceil(json.length / pageSize)));
      } else if (json && Array.isArray(json.items)) {
        setTrades(json.items);
        setTotalCount(json.totalCount ?? json.items.length);
        setTotalPages(json.totalPages ?? 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error retrieving trades ledger.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrades();
  }, [runId, page, pageSize, symbolFilter, sideFilter]);

  return (
    <div className="space-y-6 max-w-7xl font-mono text-xs">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 pb-2 border-b border-[#262626]">
        <Link href="/panel/reports" className="hover:underline font-bold">
          REPORTS
        </Link>
        <span>/</span>
        <Link href={`/panel/reports/${runId}`} className="hover:underline font-bold">
          RUN {formatHash(runId, 6)}
        </Link>
        <span>/</span>
        <span className="font-bold">[EXECUTED TRADES LEDGER]</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold uppercase text-zinc-100">
            Granular Trade Execution Ledger
          </h1>
          <p className="text-zinc-100 font-normal mt-1">
            Itemized fills, price execution ladders, slippage, and PnL realization for Run {formatHash(runId, 8)}.
          </p>
        </div>

        <Link
          href={`/panel/reports/${runId}`}
          className="px-3 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors"
        >
          RETURN TO REPORT
        </Link>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border border-[#262626] bg-[#171717] rounded-xl">
        <div>
          <label className="block font-bold text-zinc-100 mb-1">Filter by Symbol</label>
          <input
            type="text"
            value={symbolFilter}
            onChange={(e) => {
              setSymbolFilter(e.target.value);
              setPage(1);
            }}
            placeholder="e.g. BTC/USDT"
            className="w-full px-3 py-1.5 border border-[#262626] bg-[#171717] text-zinc-100 rounded-xl font-mono focus:outline-none focus:border-[#3ECF8E]"
          />
        </div>

        <div>
          <label className="block font-bold text-zinc-100 mb-1">Direction / Side</label>
          <select
            value={sideFilter}
            onChange={(e) => {
              setSideFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-1.5 border border-[#262626] bg-[#171717] text-zinc-100 rounded-xl font-mono font-bold focus:outline-none focus:border-[#3ECF8E]"
          >
            <option value="ALL">All Sides</option>
            <option value="Buy">Buy (Long)</option>
            <option value="Sell">Sell (Short)</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              setSymbolFilter('');
              setSideFilter('ALL');
              setPage(1);
            }}
            className="w-full px-3 py-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-zinc-100 font-bold border border-[#262626]">
          [COMPILING EXECUTED TRADES FROM CLOUD API...]
        </div>
      ) : error ? (
        <div className="p-4 border border-rose-800/40 bg-rose-950/20 text-rose-300 font-bold rounded-xl">
          ERROR: {error}
        </div>
      ) : trades.length === 0 ? (
        <div className="py-16 text-center border border-[#262626] p-8 bg-[#141414] rounded-xl text-zinc-400 font-bold bg-[#141414] rounded-xl text-zinc-400">
          NO TRADES RECORDED FOR THIS FLOW RUN
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-[#262626] overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#262626] bg-[#171717]">
                  <th className="p-3 font-bold text-zinc-100">Ticket</th>
                  <th className="p-3 font-bold text-zinc-100">Symbol</th>
                  <th className="p-3 font-bold text-zinc-100">Direction</th>
                  <th className="p-3 font-bold text-zinc-100 text-right">Volume</th>
                  <th className="p-3 font-bold text-zinc-100 text-right">Entry Price</th>
                  <th className="p-3 font-bold text-zinc-100 text-right">Exit Price</th>
                  <th className="p-3 font-bold text-zinc-100 text-right">Commission</th>
                  <th className="p-3 font-bold text-zinc-100 text-right">Realized PnL</th>
                  <th className="p-3 font-bold text-zinc-100 text-right">Return %</th>
                  <th className="p-3 font-bold text-zinc-100 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr key={t.ticket} className="border-b border-[#262626] hover:bg-[#141414]">
                    <td className="p-3 font-bold text-zinc-100">
                      <Link
                        href={`/panel/reports/${runId}/trades/${t.ticket}`}
                        className="hover:underline"
                      >
                        {t.ticket}
                      </Link>
                    </td>
                    <td className="p-3 font-bold text-zinc-100">{t.symbol}</td>
                    <td className="p-3">
                      <span className="font-bold uppercase text-zinc-100">[{t.side}]</span>
                    </td>
                    <td className="p-3 text-right font-bold text-zinc-100">{t.volume}</td>
                    <td className="p-3 text-right font-bold text-zinc-100">
                      {t.openPrice != null ? t.openPrice.toFixed(2) : '—'}
                    </td>
                    <td className="p-3 text-right font-bold text-zinc-100">
                      {t.closePrice != null ? t.closePrice.toFixed(2) : '—'}
                    </td>
                    <td className="p-3 text-right text-zinc-100">
                      {formatCurrency(t.commission)}
                    </td>
                    <td
                      className={`p-3 text-right font-bold ${
                        t.pnl > 0 ? 'text-[#3ECF8E]' : t.pnl < 0 ? 'text-rose-400' : 'text-zinc-100'
                      }`}
                    >
                      {formatCurrency(t.pnl)}
                    </td>
                    <td
                      className={`p-3 text-right font-bold ${
                        (t.returnPct ?? t.pnl) > 0 ? 'text-[#3ECF8E]' : (t.returnPct ?? t.pnl) < 0 ? 'text-rose-400' : 'text-zinc-100'
                      }`}
                    >
                      {t.returnPct != null ? formatPercentage(t.returnPct) : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/panel/reports/${runId}/trades/${t.ticket}`}
                        className="px-2 py-1 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors"
                      >
                        Inspect
                      </Link>
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
    </div>
  );
}
