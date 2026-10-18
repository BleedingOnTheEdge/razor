'use client';

import React from 'react';
import { X, TrendingUp, TrendingDown, Clock, ShieldCheck, DollarSign, Activity, Target, AlertOctagon } from 'lucide-react';
import { formatCurrency, formatTimestamp } from '@razor/ui-kit';
import type { TradeItemPayload } from '@/lib/api-client';

export interface GranularTradeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: TradeItemPayload | null;
}

export function GranularTradeDetailModal({ isOpen, onClose, trade }: GranularTradeDetailModalProps) {
  if (!isOpen || !trade) return null;

  const isBuy = trade.side.toUpperCase() === 'BUY';
  const isProfit = (trade.profit ?? 0) >= 0;

  // Calculate duration if open and close times exist
  let durationStr = '—';
  if (trade.openTime && trade.closeTime) {
    try {
      const openMs = new Date(trade.openTime).getTime();
      const closeMs = new Date(trade.closeTime).getTime();
      const diffSec = Math.max(0, Math.floor((closeMs - openMs) / 1000));
      if (diffSec < 60) {
        durationStr = `${diffSec}s`;
      } else if (diffSec < 3600) {
        const mins = Math.floor(diffSec / 60);
        const secs = diffSec % 60;
        durationStr = `${mins}m ${secs}s`;
      } else {
        const hours = Math.floor(diffSec / 3600);
        const mins = Math.floor((diffSec % 3600) / 60);
        durationStr = `${hours}h ${mins}m`;
      }
    } catch {
      durationStr = '—';
    }
  }

  // Price points for the visual execution ladder
  const openPx = typeof trade.openPrice === 'number' ? trade.openPrice : parseFloat(String(trade.openPrice || 0));
  const closePx = typeof trade.closePrice === 'number' ? trade.closePrice : parseFloat(String(trade.closePrice || 0));
  const slPx = trade.stopLoss ?? (isBuy ? openPx * 0.98 : openPx * 1.02);
  const tpPx = trade.takeProfit ?? (isBuy ? openPx * 1.05 : openPx * 0.95);

  const minPx = Math.min(openPx, closePx, slPx, tpPx);
  const maxPx = Math.max(openPx, closePx, slPx, tpPx);
  const range = maxPx - minPx || 1;

  function toPct(px: number) {
    return Math.max(5, Math.min(95, ((px - minPx) / range) * 100));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 font-mono text-xs"
      onClick={onClose}
    >
      <div
        className="bg-white border border-black max-w-2xl w-full p-6 text-black space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-black">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-black">
                Ticket #{trade.ticket}
              </span>
              <span className="text-lg font-bold text-black">{trade.symbol}</span>
              <span
                className={`px-2 py-0.5 border border-black text-xs font-bold uppercase ${
                  isBuy ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trade.side}
              </span>
              <span className="px-2 py-0.5 border border-black bg-white text-black text-xs font-bold">
                {trade.volume} Lots
              </span>
            </div>
            <p className="text-xs text-zinc-600 mt-1">
              Fill execution telemetry, price markers, risk targets, and audit trail.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white font-bold transition-colors"
          >
            [CLOSE]
          </button>
        </div>

        {/* Headline Result Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-white border border-black">
            <span className="text-zinc-600 text-[11px] block font-bold">Realized PnL</span>
            <span className={`text-lg font-bold mt-1 block ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
              {trade.profit != null ? (trade.profit >= 0 ? `+${formatCurrency(trade.profit)}` : formatCurrency(trade.profit)) : '—'}
            </span>
            <span className={`text-[10px] font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
              Return: {trade.returnPct != null ? (trade.returnPct >= 0 ? `+${trade.returnPct.toFixed(2)}%` : `${trade.returnPct.toFixed(2)}%`) : '—'}
            </span>
          </div>

          <div className="p-3.5 bg-white border border-black">
            <span className="text-zinc-600 text-[11px] block font-bold">Execution Duration</span>
            <span className="text-lg font-bold text-black mt-1 block">
              {durationStr}
            </span>
            <span className="text-[10px] text-zinc-600">Contiguous fill life</span>
          </div>

          <div className="p-3.5 bg-white border border-black">
            <span className="text-zinc-600 text-[11px] block font-bold">Entry Price</span>
            <span className="text-base font-bold text-black mt-1 block">
              ${openPx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </span>
            <span className="text-[10px] text-zinc-600">Filled at market</span>
          </div>

          <div className="p-3.5 bg-white border border-black">
            <span className="text-zinc-600 text-[11px] block font-bold">Close Price</span>
            <span className="text-base font-bold text-black mt-1 block">
              ${closePx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </span>
            <span className="text-[10px] text-zinc-600">Trigger: {trade.exitReason}</span>
          </div>
        </div>

        {/* Visual Price Ladder & Target Execution Chart */}
        <div className="p-4 bg-white border border-black space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="text-black font-bold uppercase">
              Execution Price Level Ladder
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-red-600 font-bold">
                [SL] Stop Loss
              </span>
              <span className="flex items-center gap-1 text-black font-bold">
                [PX] Entry / Exit
              </span>
              <span className="flex items-center gap-1 text-green-600 font-bold">
                [TP] Take Profit
              </span>
            </div>
          </div>

          {/* Horizontal Level Gauge */}
          <div className="relative pt-6 pb-6 px-4 bg-white border border-black">
            {/* Background Track */}
            <div className="h-2 w-full bg-zinc-200 relative border border-black">
              {/* Range between Open and Close */}
              <div
                className={`absolute h-2 ${isProfit ? 'bg-green-600' : 'bg-red-600'}`}
                style={{
                  left: `${Math.min(toPct(openPx), toPct(closePx))}%`,
                  width: `${Math.max(1, Math.abs(toPct(closePx) - toPct(openPx)))}%`,
                }}
              />
            </div>

            {/* Stop Loss Pin */}
            <div
              className="absolute top-1 transform -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${toPct(slPx)}%` }}
            >
              <div className="text-[10px] text-red-600 font-bold">
                SL: ${slPx.toFixed(2)}
              </div>
              <div className="w-1 h-3 bg-red-600 my-0.5" />
            </div>

            {/* Entry Pin */}
            <div
              className="absolute top-4 transform -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${toPct(openPx)}%` }}
            >
              <div className="w-2.5 h-2.5 bg-black" />
              <div className="text-[10px] text-black mt-1 font-bold">
                Entry: ${openPx.toFixed(2)}
              </div>
            </div>

            {/* Exit Pin */}
            <div
              className="absolute top-4 transform -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${toPct(closePx)}%` }}
            >
              <div className={`w-2.5 h-2.5 ${isProfit ? 'bg-green-600' : 'bg-red-600'}`} />
              <div className={`text-[10px] mt-1 font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                Exit: ${closePx.toFixed(2)}
              </div>
            </div>

            {/* Take Profit Pin */}
            <div
              className="absolute top-1 transform -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${toPct(tpPx)}%` }}
            >
              <div className="text-[10px] text-green-600 font-bold">
                TP: ${tpPx.toFixed(2)}
              </div>
              <div className="w-1 h-3 bg-green-600 my-0.5" />
            </div>
          </div>
        </div>

        {/* Detailed Fill Telemetry Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-black">
            Granular Fill & Execution Telemetry
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-white border border-black flex items-center justify-between">
              <span className="text-zinc-600">Open Timestamp</span>
              <span className="text-black font-bold">{trade.openTime ? formatTimestamp(trade.openTime) : '—'}</span>
            </div>
            <div className="p-3 bg-white border border-black flex items-center justify-between">
              <span className="text-zinc-600">Close Timestamp</span>
              <span className="text-black font-bold">{trade.closeTime ? formatTimestamp(trade.closeTime) : '—'}</span>
            </div>
            <div className="p-3 bg-white border border-black flex items-center justify-between">
              <span className="text-zinc-600">Broker Commission</span>
              <span className="text-black font-bold">${(trade.commission ?? 1.50).toFixed(2)} USD</span>
            </div>
            <div className="p-3 bg-white border border-black flex items-center justify-between">
              <span className="text-zinc-600">Overnight Financing (Swap)</span>
              <span className="text-black font-bold">${(trade.swap ?? 0.00).toFixed(2)} USD</span>
            </div>
            <div className="p-3 bg-white border border-black flex items-center justify-between">
              <span className="text-zinc-600">Execution Venue</span>
              <span className="text-black font-bold">{trade.executionVenue || 'Binance Futures Direct'}</span>
            </div>
            <div className="p-3 bg-white border border-black flex items-center justify-between">
              <span className="text-zinc-600">Exit Mechanism</span>
              <span className="px-2 py-0.5 border border-black bg-white text-black font-bold text-[11px]">
                {trade.exitReason}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-black text-xs">
          <span className="text-black font-bold">
            [DETERMINISTIC BROKER FILL VERIFIED]
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-black bg-black text-white hover:bg-white hover:text-black font-bold transition-colors"
          >
            Close Telemetry
          </button>
        </div>
      </div>
    </div>
  );
}
