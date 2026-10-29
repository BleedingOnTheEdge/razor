'use client';

import React from 'react';
import { Activity } from 'lucide-react';
import { formatCurrency, formatTimestamp } from '@razor/ui-kit';
import type { TradeItemPayload } from '@/lib/api-client';

export interface LiveTradeHistoryTableProps {
  trades: TradeItemPayload[];
  onSelectTrade: (trade: TradeItemPayload) => void;
}

export function LiveTradeHistoryTable({
  trades,
  onSelectTrade,
}: LiveTradeHistoryTableProps) {
  return (
    <div className="p-6 bg-[#171717] border border-[#262626] rounded-xl space-y-4 font-sans">
      <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
        <div>
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#3ECF8E]" />
            <span>Live Executed Trade Fill Ledger ({trades.length})</span>
          </h3>
          <p className="text-sm text-zinc-400 mt-0.5">
            Every trade is clickable to inspect the granular telemetry modal (price ladder, duration, venue, slippage).
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#141414] text-zinc-300 border border-[#262626] font-mono">
          Realized Fills
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#262626]">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-[#262626] bg-[#141414] text-zinc-400 font-semibold uppercase tracking-wider text-xs">
              <th className="py-3 px-4">Ticket</th>
              <th className="py-3 px-4">Symbol</th>
              <th className="py-3 px-4">Side</th>
              <th className="py-3 px-4">Size</th>
              <th className="py-3 px-4">Open Price</th>
              <th className="py-3 px-4">Close Price</th>
              <th className="py-3 px-4">Realized PnL</th>
              <th className="py-3 px-4">Exit Reason</th>
              <th className="py-3 px-4">Execution Venue</th>
              <th className="py-3 px-4 text-right">Close Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262626] bg-[#171717] font-mono text-xs">
            {trades.map((t) => {
              const isBuy = t.side.toUpperCase() === 'BUY';
              const isProfit = (t.profit ?? 0) >= 0;
              return (
                <tr
                  key={t.ticket}
                  onClick={() => onSelectTrade(t)}
                  className="hover:bg-[#1f1f1f] transition-colors cursor-pointer group select-none"
                >
                  <td className="py-3.5 px-4 font-bold text-[#3ECF8E] group-hover:underline">
                    #{t.ticket}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-zinc-100 font-sans">{t.symbol}</td>
                  <td className="py-3.5 px-4 font-sans">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        isBuy ? 'bg-emerald-950/40 text-[#3ECF8E] border border-emerald-500/30' : 'bg-rose-950/40 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {t.side}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-zinc-200">{t.volume}</td>
                  <td className="py-3.5 px-4 text-zinc-300">{formatCurrency(t.openPrice)}</td>
                  <td className="py-3.5 px-4 text-zinc-300">{formatCurrency(t.closePrice)}</td>
                  <td className={`py-3.5 px-4 font-bold ${isProfit ? 'text-[#3ECF8E]' : 'text-rose-400'}`}>
                    {t.profit != null ? (isProfit ? `+${formatCurrency(t.profit)}` : formatCurrency(t.profit)) : '—'}
                  </td>
                  <td className="py-3.5 px-4 font-sans">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-zinc-300 border border-[#262626] text-xs font-medium">
                      {t.exitReason || 'NormalExit'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400 font-sans text-xs">
                    {t.executionVenue || 'Exchange DMA'}
                  </td>
                  <td className="py-3.5 px-4 text-right text-zinc-500 font-mono text-xs">
                    {formatTimestamp(t.closeTime || '')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
