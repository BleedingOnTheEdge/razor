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
    <div className="p-6 bg-white border border-black space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-black">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-black uppercase">
            <span>Granular Trade Fill History</span>
            <span className="ml-2 px-2 py-0.5 bg-black text-white text-xs font-mono font-bold">
              {filteredTrades.length} Fills
            </span>
          </h3>
        </div>

        {/* Search / Filter input */}
        <div className="min-w-[220px]">
          <input
            type="text"
            value={tradeSearch}
            onChange={(e) => {
              setTradeSearch(e.target.value);
              setTradePage(1);
            }}
            placeholder="Search ticket, symbol, side, reason..."
            className="w-full px-3 py-1.5 bg-white border border-black text-xs font-mono text-black placeholder-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-black">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-black text-zinc-700 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3">Ticket</th>
              <th className="py-3 px-3">Symbol</th>
              <th className="py-3 px-3">Side</th>
              <th className="py-3 px-3 text-right">Volume</th>
              <th className="py-3 px-3">Open (Time & Px)</th>
              <th className="py-3 px-3">Close (Time & Px)</th>
              <th className="py-3 px-3 text-right">PnL ($)</th>
              <th className="py-3 px-3 text-right">Return</th>
              <th className="py-3 px-3 text-center">Exit Reason</th>
            </tr>
          </thead>
          <tbody className="text-black divide-y divide-zinc-200 bg-white">
            {currentTrades.map((t: TradeItemPayload) => (
              <tr
                key={t.ticket}
                onClick={() => onSelectTrade(t)}
                className="hover:bg-zinc-50 cursor-pointer transition-colors group"
                title="Click to view granular trade fill telemetry"
              >
                <td className="py-3 px-3 font-bold text-black group-hover:underline">#{t.ticket}</td>
                <td className="py-2.5 px-3 font-bold text-black">{t.symbol}</td>
                <td className="py-2.5 px-3">
                  <span
                    className={`px-1.5 py-0.5 border border-black text-[10px] font-bold ${
                      t.side.toUpperCase() === 'BUY'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {t.side.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-bold">{t.volume != null ? t.volume.toFixed(2) : '—'}</td>
                <td className="py-3 px-3 text-[11px] text-black">
                  <div>${typeof t.openPrice === 'number' ? t.openPrice.toLocaleString() : (t.openPrice ?? '—')}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">{t.openTime}</div>
                </td>
                <td className="py-3 px-3 text-[11px] text-black">
                  <div>${typeof t.closePrice === 'number' ? t.closePrice.toLocaleString() : (t.closePrice ?? '—')}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">{t.closeTime}</div>
                </td>
                <td className={`py-3 px-3 text-right font-bold ${(t.profit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {t.profit != null ? (t.profit >= 0 ? `+${formatCurrency(t.profit)}` : formatCurrency(t.profit)) : '—'}
                </td>
                <td className={`py-3 px-3 text-right font-bold ${(t.returnPct ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {t.returnPct != null ? (t.returnPct >= 0 ? `+${t.returnPct.toFixed(2)}%` : `${t.returnPct.toFixed(2)}%`) : '—'}
                </td>
                <td className="py-3 px-3 text-center">
                  <span className={`px-2 py-0.5 border text-[10px] font-bold ${t.exitReason === 'TakeProfit' ? 'border-green-600 text-green-600' : 'border-red-600 text-red-600'}`}>
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
        <div className="flex items-center justify-between pt-3 border-t border-black text-xs font-mono text-black">
          <span className="font-bold">
            Showing {((tradePage - 1) * tradesPerPage) + 1}–
            {Math.min(tradePage * tradesPerPage, filteredTrades.length)} of {filteredTrades.length} fills
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={tradePage === 1}
              onClick={() => setTradePage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white font-bold disabled:opacity-40"
            >
              PREV
            </button>
            <span className="px-2 font-bold text-black">
              {tradePage} / {totalTradePages}
            </span>
            <button
              type="button"
              disabled={tradePage >= totalTradePages}
              onClick={() => setTradePage((p) => Math.min(totalTradePages, p + 1))}
              className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white font-bold disabled:opacity-40"
            >
              NEXT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
