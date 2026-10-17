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
    <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Active Open Positions ({positions.length})
            </h3>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">
              Market orders live on broker book. Click any position row to inspect granular fill ladder chart.
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-zinc-400">
          Mark Price: Real-Time Tick Stream
        </span>
      </div>

      {positions.length === 0 ? (
        <div className="py-12 text-center text-xs font-mono text-zinc-500">
          No open positions on active broker book. All capital currently in cash reserve.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="pb-3 font-semibold">Ticket</th>
                <th className="pb-3 font-semibold">Symbol</th>
                <th className="pb-3 font-semibold">Side</th>
                <th className="pb-3 font-semibold">Size</th>
                <th className="pb-3 font-semibold">Open Price</th>
                <th className="pb-3 font-semibold">Mark Price</th>
                <th className="pb-3 font-semibold">Unrealized PnL</th>
                <th className="pb-3 font-semibold">Stop Loss / TP</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
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
                    className="hover:bg-zinc-850/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 font-bold text-zinc-300 group-hover:text-cyan-400">
                      #{pos.ticket}
                    </td>
                    <td className="py-3 font-bold text-white">{pos.symbol}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isBuy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {pos.side}
                      </span>
                    </td>
                    <td className="py-3 text-zinc-300">{pos.volume}</td>
                    <td className="py-3 text-zinc-300">{formatCurrency(pos.openPrice)}</td>
                    <td className="py-3 font-bold text-white">{formatCurrency(pos.markPrice)}</td>
                    <td className={`py-3 font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(pos.unrealizedPnl)}
                    </td>
                    <td className="py-3 text-zinc-400 text-[11px]">
                      <span>SL: {pos.stopLoss ? formatCurrency(pos.stopLoss) : '—'}</span>
                      <span className="mx-1">•</span>
                      <span>TP: {pos.takeProfit ? formatCurrency(pos.takeProfit) : '—'}</span>
                    </td>
                    <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onClosePosition(pos)}
                        className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold border border-rose-500/30 transition-colors"
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
