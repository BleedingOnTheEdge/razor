'use client';

import React, { useState, useMemo } from 'react';
import { Layers, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@razor/ui-kit';
import type { TradeItemPayload } from '@/lib/api-client';

export interface TradeHistoryTableProps {
  trades: TradeItemPayload[];
  onSelectTrade: (trade: TradeItemPayload) => void;
}

export function TradeHistoryTable({ trades, onSelectTrade }: TradeHistoryTableProps) {
  const [tradeSearch, setTradeSearch] = useState('');
  const [tradePage, setTradePage] = useState(1);
  const tradesPerPage = 10;

  const filteredTrades = useMemo(() => {
    if (!trades) return [];
    if (!tradeSearch.trim()) return trades;
    const q = tradeSearch.toLowerCase();
    return trades.filter(
      (t) =>
        String(t.ticket).includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        t.side.toLowerCase().includes(q) ||
        (t.exitReason || '').toLowerCase().includes(q)
    );
  }, [trades, tradeSearch]);

  const totalTradePages = Math.max(1, Math.ceil(filteredTrades.length / tradesPerPage));
  const currentTrades = useMemo(() => {
    const start = (tradePage - 1) * tradesPerPage;
    return filteredTrades.slice(start, start + tradesPerPage);
  }, [filteredTrades, tradePage]);

  if (!trades || trades.length === 0) return null;

  return (
    <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-zinc-700" />
          <h3 className="text-sm font-bold text-zinc-900">
            <span>Granular Trade Fill History</span>
            <span className="ml-2 px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-xs font-mono">
              {filteredTrades.length} Fills
            </span>
          </h3>
        </div>

        {/* Search / Filter input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={tradeSearch}
            onChange={(e) => {
              setTradeSearch(e.target.value);
              setTradePage(1);
            }}
            placeholder="Search ticket, symbol, side, reason..."
            className="w-full pl-8 pr-3 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono divide-y divide-zinc-200">
          <thead>
            <tr className="text-zinc-500 uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3">Ticket</th>
              <th className="py-2.5 px-3">Symbol</th>
              <th className="py-2.5 px-3">Side</th>
              <th className="py-2.5 px-3">Volume</th>
              <th className="py-2.5 px-3">Open (Time & Px)</th>
              <th className="py-2.5 px-3">Close (Time & Px)</th>
              <th className="py-2.5 px-3">PnL ($)</th>
              <th className="py-2.5 px-3">Return</th>
              <th className="py-2.5 px-3">Exit Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-zinc-800">
            {currentTrades.map((t: TradeItemPayload) => (
              <tr
                key={t.ticket}
                onClick={() => onSelectTrade(t)}
                className="hover:bg-cyan-50/70 cursor-pointer transition-colors group"
                title="Click to view granular trade fill telemetry"
              >
                <td className="py-2.5 px-3 font-bold text-cyan-700 group-hover:underline">#{t.ticket}</td>
                <td className="py-2.5 px-3 font-bold text-zinc-900">{t.symbol}</td>
                <td className="py-2.5 px-3">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      t.side.toUpperCase() === 'BUY'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {t.side.toUpperCase()}
                  </span>
                </td>
                <td className="py-2.5 px-3">{t.volume != null ? t.volume.toFixed(2) : '—'}</td>
                <td className="py-2.5 px-3 text-[11px] text-zinc-600">
                  <div>${typeof t.openPrice === 'number' ? t.openPrice.toLocaleString() : (t.openPrice ?? '—')}</div>
                  <div className="text-[10px] text-zinc-400">{t.openTime}</div>
                </td>
                <td className="py-2.5 px-3 text-[11px] text-zinc-600">
                  <div>${typeof t.closePrice === 'number' ? t.closePrice.toLocaleString() : (t.closePrice ?? '—')}</div>
                  <div className="text-[10px] text-zinc-400">{t.closeTime}</div>
                </td>
                <td className={`py-2.5 px-3 font-bold ${(t.profit ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {t.profit != null ? (t.profit >= 0 ? `+${formatCurrency(t.profit)}` : formatCurrency(t.profit)) : '—'}
                </td>
                <td className={`py-2.5 px-3 font-semibold ${(t.returnPct ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {t.returnPct != null ? (t.returnPct >= 0 ? `+${t.returnPct.toFixed(2)}%` : `${t.returnPct.toFixed(2)}%`) : '—'}
                </td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 text-[10px]">
                    {t.exitReason}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalTradePages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 text-xs font-mono text-zinc-500">
          <span>
            Showing {((tradePage - 1) * tradesPerPage) + 1}–
            {Math.min(tradePage * tradesPerPage, filteredTrades.length)} of {filteredTrades.length} fills
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={tradePage === 1}
              onClick={() => setTradePage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-semibold text-zinc-800">
              {tradePage} / {totalTradePages}
            </span>
            <button
              type="button"
              disabled={tradePage >= totalTradePages}
              onClick={() => setTradePage((p) => Math.min(totalTradePages, p + 1))}
              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
