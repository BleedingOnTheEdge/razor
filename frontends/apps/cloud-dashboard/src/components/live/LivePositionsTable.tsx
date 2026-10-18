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
    <div className="p-6 bg-white border border-black space-y-4 font-mono">
      <div className="flex items-center justify-between pb-3 border-b border-black">
        <div>
          <h3 className="text-sm font-bold text-black uppercase">
            Active Open Positions ({positions.length})
          </h3>
          <p className="text-xs text-black mt-0.5">
            Market orders live on broker book. Click any position row to inspect granular fill ladder chart.
          </p>
        </div>
        <span className="text-xs text-black font-bold">
          [MARK PRICE: REAL-TIME TICK STREAM]
        </span>
      </div>

      {positions.length === 0 ? (
        <div className="py-12 text-center text-xs text-black font-bold border border-black bg-white">
          No open positions on active broker book. All capital currently in cash reserve.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-black text-black font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Ticket</th>
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Side</th>
                <th className="py-2.5 px-3">Size</th>
                <th className="py-2.5 px-3">Open Price</th>
                <th className="py-2.5 px-3">Mark Price</th>
                <th className="py-2.5 px-3">Unrealized PnL</th>
                <th className="py-2.5 px-3">Stop Loss / TP</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-black divide-y divide-black">
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
                    className="hover:bg-zinc-100 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-3 font-bold text-black group-hover:underline">
                      #{pos.ticket}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-black">{pos.symbol}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 border border-black text-[10px] font-bold ${
                          isBuy ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {pos.side}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold">{pos.volume}</td>
                    <td className="py-2.5 px-3">{formatCurrency(pos.openPrice)}</td>
                    <td className="py-2.5 px-3 font-bold text-black">{formatCurrency(pos.markPrice)}</td>
                    <td className={`py-2.5 px-3 font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(pos.unrealizedPnl)}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-zinc-700">
                      <span>SL: {pos.stopLoss ? formatCurrency(pos.stopLoss) : '—'}</span>
                      <span className="mx-1">•</span>
                      <span>TP: {pos.takeProfit ? formatCurrency(pos.takeProfit) : '—'}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onClosePosition(pos)}
                        className="px-2.5 py-1 border border-black bg-white hover:bg-red-600 hover:text-white text-red-600 text-[11px] font-bold transition-colors"
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
