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
    <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4 font-sans">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <span>Live Executed Trade Fill Ledger ({trades.length})</span>
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Every trade is clickable to inspect the granular telemetry modal (price ladder, duration, venue, slippage).
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono">
          Realized Fills
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-xs">
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
          <tbody className="divide-y divide-slate-100 bg-white font-mono text-xs">
            {trades.map((t) => {
              const isBuy = t.side.toUpperCase() === 'BUY';
              const isProfit = (t.profit ?? 0) >= 0;
              return (
                <tr
                  key={t.ticket}
                  onClick={() => onSelectTrade(t)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group select-none"
                >
                  <td className="py-3.5 px-4 font-bold text-indigo-700 group-hover:underline">
                    #{t.ticket}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 font-sans">{t.symbol}</td>
                  <td className="py-3.5 px-4 font-sans">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        isBuy ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {t.side}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">{t.volume}</td>
                  <td className="py-3.5 px-4 text-slate-700">{formatCurrency(t.openPrice)}</td>
                  <td className="py-3.5 px-4 text-slate-700">{formatCurrency(t.closePrice)}</td>
                  <td className={`py-3.5 px-4 font-bold ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {t.profit != null ? (isProfit ? `+${formatCurrency(t.profit)}` : formatCurrency(t.profit)) : '—'}
                  </td>
                  <td className="py-3.5 px-4 font-sans">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                      {t.exitReason || 'NormalExit'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-sans text-xs">
                    {t.executionVenue || 'Exchange DMA'}
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-500 font-mono text-xs">
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
