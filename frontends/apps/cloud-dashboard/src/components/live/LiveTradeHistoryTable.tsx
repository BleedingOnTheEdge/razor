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
    <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Live Executed Trade Fill Ledger ({trades.length})
            </h3>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">
              Every trade is clickable to inspect the granular telemetry modal (price ladder, duration, venue, slippage).
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-zinc-400">
          Realized Fills
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono text-left">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="pb-3 font-semibold">Ticket</th>
              <th className="pb-3 font-semibold">Symbol</th>
              <th className="pb-3 font-semibold">Side</th>
              <th className="pb-3 font-semibold">Size</th>
              <th className="pb-3 font-semibold">Open Price</th>
              <th className="pb-3 font-semibold">Close Price</th>
              <th className="pb-3 font-semibold">Realized PnL</th>
              <th className="pb-3 font-semibold">Exit Reason</th>
              <th className="pb-3 font-semibold">Execution Venue</th>
              <th className="pb-3 font-semibold text-right">Close Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {trades.map((t) => {
              const isBuy = t.side.toUpperCase() === 'BUY';
              const isProfit = (t.profit ?? 0) >= 0;
              return (
                <tr
                  key={t.ticket}
                  onClick={() => onSelectTrade(t)}
                  className="hover:bg-zinc-850/60 transition-colors cursor-pointer group select-none"
                >
                  <td className="py-3 font-bold text-zinc-300 group-hover:text-cyan-400">
                    #{t.ticket}
                  </td>
                  <td className="py-3 font-bold text-white">{t.symbol}</td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isBuy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {t.side}
                    </span>
                  </td>
                  <td className="py-3 text-zinc-300">{t.volume}</td>
                  <td className="py-3 text-zinc-300">{formatCurrency(t.openPrice)}</td>
                  <td className="py-3 text-zinc-300">{formatCurrency(t.closePrice)}</td>
                  <td className={`py-3 font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(t.profit)}
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">
                      {t.exitReason || 'NormalExit'}
                    </span>
                  </td>
                  <td className="py-3 text-zinc-400 text-[11px]">
                    {t.executionVenue || 'Exchange DMA'}
                  </td>
                  <td className="py-3 text-right text-zinc-400 text-[11px]">
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
