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
      <div className="flex items-center gap-2 pb-2 border-b border-black">
        <Link href="/panel/reports" className="hover:underline font-bold">
          [REPORTS]
        </Link>
        <span>/</span>
        <Link href={`/panel/reports/${runId}`} className="hover:underline font-bold">
          [RUN {formatHash(runId, 6)}]
        </Link>
        <span>/</span>
        <span className="font-bold">[EXECUTED TRADES LEDGER]</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold uppercase text-black">
            Granular Trade Execution Ledger
          </h1>
          <p className="text-black font-normal mt-1">
            Itemized fills, price execution ladders, slippage, and PnL realization for Run {formatHash(runId, 8)}.
          </p>
        </div>

        <Link
          href={`/panel/reports/${runId}`}
          className="px-3 py-2 border border-black bg-white hover:bg-black hover:text-white font-bold transition-colors"
        >
          [RETURN TO REPORT]
        </Link>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border border-black bg-white">
        <div>
          <label className="block font-bold text-black mb-1">Filter by Symbol</label>
          <input
            type="text"
            value={symbolFilter}
            onChange={(e) => {
              setSymbolFilter(e.target.value);
              setPage(1);
            }}
            placeholder="e.g. BTC/USDT"
            className="w-full px-3 py-1.5 border border-black bg-white text-black font-mono focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-bold text-black mb-1">Direction / Side</label>
          <select
            value={sideFilter}
            onChange={(e) => {
              setSideFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-1.5 border border-black bg-white text-black font-mono font-bold focus:outline-none"
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
            className="w-full px-3 py-1.5 border border-black bg-white hover:bg-zinc-100 text-black font-bold transition-colors"
          >
            [RESET FILTERS]
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-black font-bold border border-black">
          [COMPILING EXECUTED TRADES FROM CLOUD API...]
        </div>
      ) : error ? (
        <div className="p-4 border border-black text-red-600 font-bold">
          [ERROR]: {error}
        </div>
      ) : trades.length === 0 ? (
        <div className="py-16 text-center border border-black p-8 font-bold">
          [NO TRADES RECORDED FOR THIS FLOW RUN]
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-black overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-black bg-white">
                  <th className="p-3 font-bold text-black">Ticket</th>
                  <th className="p-3 font-bold text-black">Symbol</th>
                  <th className="p-3 font-bold text-black">Direction</th>
                  <th className="p-3 font-bold text-black text-right">Volume</th>
                  <th className="p-3 font-bold text-black text-right">Entry Price</th>
                  <th className="p-3 font-bold text-black text-right">Exit Price</th>
                  <th className="p-3 font-bold text-black text-right">Commission</th>
                  <th className="p-3 font-bold text-black text-right">Realized PnL</th>
                  <th className="p-3 font-bold text-black text-right">Return %</th>
                  <th className="p-3 font-bold text-black text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr key={t.ticket} className="border-b border-black hover:bg-zinc-50">
                    <td className="p-3 font-bold text-black">
                      <Link
                        href={`/panel/reports/${runId}/trades/${t.ticket}`}
                        className="hover:underline"
                      >
                        {t.ticket}
                      </Link>
                    </td>
                    <td className="p-3 font-bold text-black">{t.symbol}</td>
                    <td className="p-3">
                      <span className="font-bold uppercase text-black">[{t.side}]</span>
                    </td>
                    <td className="p-3 text-right font-bold text-black">{t.volume}</td>
                    <td className="p-3 text-right font-bold text-black">
                      {t.openPrice != null ? t.openPrice.toFixed(2) : '—'}
                    </td>
                    <td className="p-3 text-right font-bold text-black">
                      {t.closePrice != null ? t.closePrice.toFixed(2) : '—'}
                    </td>
                    <td className="p-3 text-right text-black">
                      {formatCurrency(t.commission)}
                    </td>
                    <td
                      className={`p-3 text-right font-bold ${
                        t.pnl > 0 ? 'text-green-600' : t.pnl < 0 ? 'text-red-600' : 'text-black'
                      }`}
                    >
                      {formatCurrency(t.pnl)}
                    </td>
                    <td
                      className={`p-3 text-right font-bold ${
                        (t.returnPct ?? t.pnl) > 0 ? 'text-green-600' : (t.returnPct ?? t.pnl) < 0 ? 'text-red-600' : 'text-black'
                      }`}
                    >
                      {t.returnPct != null ? formatPercentage(t.returnPct) : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/panel/reports/${runId}/trades/${t.ticket}`}
                        className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white font-bold transition-colors"
                      >
                        [INSPECT]
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
