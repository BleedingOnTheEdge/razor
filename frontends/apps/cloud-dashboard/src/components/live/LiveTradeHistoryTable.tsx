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
    <div className="p-6 bg-white border border-black space-y-4 font-mono">
      <div className="flex items-center justify-between pb-3 border-b border-black">
        <div>
          <h3 className="text-sm font-bold text-black uppercase">
            Live Executed Trade Fill Ledger ({trades.length})
          </h3>
          <p className="text-xs text-black mt-0.5">
            Every trade is clickable to inspect the granular telemetry modal (price ladder, duration, venue, slippage).
          </p>
        </div>
        <span className="text-xs text-black font-bold">
          [REALIZED FILLS]
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-black text-black font-bold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3">Ticket</th>
              <th className="py-2.5 px-3">Symbol</th>
              <th className="py-2.5 px-3">Side</th>
              <th className="py-2.5 px-3">Size</th>
              <th className="py-2.5 px-3">Open Price</th>
              <th className="py-2.5 px-3">Close Price</th>
              <th className="py-2.5 px-3">Realized PnL</th>
              <th className="py-2.5 px-3">Exit Reason</th>
              <th className="py-2.5 px-3">Execution Venue</th>
              <th className="py-2.5 px-3 text-right">Close Time</th>
            </tr>
          </thead>
          <tbody className="text-black divide-y divide-black">
            {trades.map((t) => {
              const isBuy = t.side.toUpperCase() === 'BUY';
              const isProfit = (t.profit ?? 0) >= 0;
              return (
                <tr
                  key={t.ticket}
                  onClick={() => onSelectTrade(t)}
                  className="hover:bg-zinc-100 transition-colors cursor-pointer group select-none"
                >
                  <td className="py-2.5 px-3 font-bold text-black group-hover:underline">
                    #{t.ticket}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-black">{t.symbol}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 border border-black text-[10px] font-bold ${
                        isBuy ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {t.side}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold">{t.volume}</td>
                  <td className="py-2.5 px-3">{formatCurrency(t.openPrice)}</td>
                  <td className="py-2.5 px-3">{formatCurrency(t.closePrice)}</td>
                  <td className={`py-2.5 px-3 font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                    {t.profit != null ? (isProfit ? `+${formatCurrency(t.profit)}` : formatCurrency(t.profit)) : '—'}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 border border-black bg-white text-black text-[10px] font-bold">
                      {t.exitReason || 'NormalExit'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-zinc-700">
                    {t.executionVenue || 'Exchange DMA'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-[11px] text-zinc-700">
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
