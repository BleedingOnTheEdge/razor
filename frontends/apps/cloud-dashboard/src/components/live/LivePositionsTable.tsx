'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import { formatCurrency } from '@razor/ui-kit';
import type { TradeItemPayload } from '@/lib/api-client';

export interface OpenPosition {
  ticket: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  stopLoss?: number;
  takeProfit?: number;
  openTime: string;
}

export interface LivePositionsTableProps {
  positions: OpenPosition[];
  onSelectPosition: (trade: TradeItemPayload) => void;
  onClosePosition: (position: OpenPosition) => void;
}

export function LivePositionsTable({
  positions,
  onSelectPosition,
  onClosePosition,
}: LivePositionsTableProps) {
  return (
    <div className="p-6 bg-[#171717] border border-[#262626] rounded-xl space-y-4 font-sans">
      <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
        <div>
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#3ECF8E]" />
            <span>Active Open Positions ({positions.length})</span>
          </h3>
          <p className="text-sm text-zinc-400 mt-0.5">
            Market orders live on broker book. Click any position row to inspect granular fill ladder chart.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#141414] text-zinc-300 border border-[#262626] font-mono">
          Mark Price: Real-time tick stream
        </span>
      </div>

      {positions.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-500 rounded-xl border border-[#262626] bg-[#141414]">
          No open positions on active broker book. All capital currently in cash reserve.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#262626]">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-[#262626] bg-[#141414] text-zinc-400 font-semibold uppercase tracking-wider text-xs">
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-4">Side</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Open Price</th>
                <th className="py-3 px-4">Mark Price</th>
                <th className="py-3 px-4">Unrealized PnL</th>
                <th className="py-3 px-4">Stop Loss / TP</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626] bg-[#171717] font-mono text-xs">
              {positions.map((pos) => {
                const isBuy = pos.side === 'BUY';
                const isProfit = pos.unrealizedPnl >= 0;
                return (
                  <tr
                    key={pos.ticket}
                    onClick={() => {
                      onSelectPosition({
                        ticket: pos.ticket,
                        symbol: pos.symbol,
                        side: pos.side,
                        volume: pos.volume,
                        openPrice: pos.openPrice,
                        closePrice: pos.markPrice,
                        openTime: pos.openTime,
                        closeTime: null,
                        profit: pos.unrealizedPnl,
                        returnPct: ((pos.markPrice - pos.openPrice) / pos.openPrice) * 100 * (isBuy ? 1 : -1),
                        stopLoss: pos.stopLoss,
                        takeProfit: pos.takeProfit,
                        executionVenue: 'Binance Futures Direct',
                        commission: 1.5,
                      });
                    }}
                    className="hover:bg-[#1f1f1f] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-bold text-[#3ECF8E] group-hover:underline">
                      #{pos.ticket}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-zinc-100 font-sans">{pos.symbol}</td>
                    <td className="py-3.5 px-4 font-sans">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isBuy ? 'bg-emerald-950/40 text-[#3ECF8E] border border-emerald-500/30' : 'bg-rose-950/40 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {pos.side}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-zinc-200">{pos.volume}</td>
                    <td className="py-3.5 px-4 text-zinc-300">{formatCurrency(pos.openPrice)}</td>
                    <td className="py-3.5 px-4 font-semibold text-zinc-100">{formatCurrency(pos.markPrice)}</td>
                    <td className={`py-3.5 px-4 font-bold ${isProfit ? 'text-[#3ECF8E]' : 'text-rose-400'}`}>
                      {formatCurrency(pos.unrealizedPnl)}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500 font-sans text-xs">
                      <span>SL: {pos.stopLoss ? formatCurrency(pos.stopLoss) : '—'}</span>
                      <span className="mx-1">•</span>
                      <span>TP: {pos.takeProfit ? formatCurrency(pos.takeProfit) : '—'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onClosePosition(pos)}
                        className="px-3 py-1.5 rounded-full border border-rose-500/30 bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 text-xs font-medium font-sans transition-colors"
                      >
                        Flatten / Close
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
