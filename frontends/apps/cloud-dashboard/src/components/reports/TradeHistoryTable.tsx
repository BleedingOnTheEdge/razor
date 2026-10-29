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
    <div className="p-5 bg-[#171717] border border-[#262626] rounded-xl space-y-4 font-sans text-xs text-zinc-100">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#262626]">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-100" />
            <span>Granular Trade Fill History</span>
            <span className="ml-2 px-2.5 py-0.5 rounded-full border border-[#262626] bg-[#141414] font-bold text-[10px] text-zinc-300">
              {filteredTrades.length} Fills
            </span>
          </h3>
        </div>

        {/* Search / Filter input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-zinc-100 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={tradeSearch}
            onChange={(e) => {
              setTradeSearch(e.target.value);
              setTradePage(1);
            }}
            placeholder="Search ticket, symbol, side, reason..."
            className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 placeholder:text-zinc-500 font-mono text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-[#262626] bg-[#171717] rounded-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#1f1f1f] border-b border-[#262626] font-bold uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3">Ticket</th>
              <th className="py-2.5 px-3">Symbol</th>
              <th className="py-2.5 px-3">Side</th>
              <th className="py-2.5 px-3 text-right">Volume</th>
              <th className="py-2.5 px-3">Open (Time & Px)</th>
              <th className="py-2.5 px-3">Close (Time & Px)</th>
              <th className="py-2.5 px-3 text-right">PnL ($)</th>
              <th className="py-2.5 px-3 text-right">Return</th>
              <th className="py-2.5 px-3 text-center">Exit Reason</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262626]">
            {currentTrades.map((t: TradeItemPayload) => (
              <tr
                key={t.ticket}
                className="hover:bg-[#141414] transition-colors"
              >
                <td className="py-2.5 px-3 font-bold text-zinc-100 font-mono">
                  <button
                    type="button"
                    onClick={() => onSelectTrade(t)}
                    className="hover:underline font-bold"
                  >
                    #{t.ticket}
                  </button>
                </td>
                <td className="py-2.5 px-3 font-bold text-zinc-100">{t.symbol}</td>
                <td className="py-2.5 px-3">
                  <span
                    className={`px-2 py-0.5 rounded-full border font-bold text-[10px] uppercase ${
                      t.side.toUpperCase() === 'BUY'
                        ? 'border-[#3ECF8E]/30 bg-emerald-950/20 text-[#3ECF8E]'
                        : 'border-rose-800/30 bg-rose-950/20 text-rose-400'
                    }`}
                  >
                    {t.side.toUpperCase()}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-100">{t.volume != null ? t.volume.toFixed(2) : '—'}</td>
                <td className="py-2.5 px-3">
                  <div className="font-bold">${typeof t.openPrice === 'number' ? t.openPrice.toLocaleString() : (t.openPrice ?? '—')}</div>
                  <div className="text-[10px] text-zinc-500 font-sans">{t.openTime}</div>
                </td>
                <td className="py-2.5 px-3">
                  <div className="font-bold">${typeof t.closePrice === 'number' ? t.closePrice.toLocaleString() : (t.closePrice ?? '—')}</div>
                  <div className="text-[10px] text-zinc-500 font-sans">{t.closeTime}</div>
                </td>
                <td className={`py-2.5 px-3 text-right font-bold ${(t.profit ?? 0) >= 0 ? 'text-[#3ECF8E]' : 'text-rose-400'}`}>
                  {t.profit != null ? (t.profit >= 0 ? `+${formatCurrency(t.profit)}` : formatCurrency(t.profit)) : '—'}
                </td>
                <td className={`py-2.5 px-3 text-right font-bold ${(t.returnPct ?? 0) >= 0 ? 'text-[#3ECF8E]' : 'text-rose-400'}`}>
                  {t.returnPct != null ? (t.returnPct >= 0 ? `+${t.returnPct.toFixed(2)}%` : `${t.returnPct.toFixed(2)}%`) : '—'}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className="px-2 py-0.5 rounded-md border border-[#262626] bg-[#141414] font-bold text-[10px] text-zinc-300">
                    {t.exitReason || 'Signal'}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => onSelectTrade(t)}
                    className="px-2.5 py-0.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-bold transition-colors select-none text-[11px]"
                  >
                    INSPECT →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalTradePages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-[#262626] text-xs font-mono">
          <span className="text-zinc-400">
            Showing {((tradePage - 1) * tradesPerPage) + 1}–
            {Math.min(tradePage * tradesPerPage, filteredTrades.length)} of {filteredTrades.length} fills
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={tradePage === 1}
              onClick={() => setTradePage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-full border border-[#262626] bg-[#171717] hover:bg-[#1f1f1f] text-zinc-200 font-bold disabled:opacity-40 transition-colors flex items-center gap-1 select-none"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>PREV</span>
            </button>
            <span className="px-2 py-1 font-bold">
              PAGE {tradePage} OF {totalTradePages}
            </span>
            <button
              type="button"
              disabled={tradePage >= totalTradePages}
              onClick={() => setTradePage((p) => Math.min(totalTradePages, p + 1))}
              className="px-3 py-1 rounded-full border border-[#262626] bg-[#171717] hover:bg-[#1f1f1f] text-zinc-200 font-bold disabled:opacity-40 transition-colors flex items-center gap-1 select-none"
            >
              <span>NEXT</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
