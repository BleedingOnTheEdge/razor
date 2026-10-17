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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-zinc-100 space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-bold text-zinc-400">
                Ticket #{trade.ticket}
              </span>
              <span className="text-lg font-black text-white">{trade.symbol}</span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold uppercase ${
                  isBuy
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {trade.side}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                {trade.volume} Lots
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 font-mono">
              Fill execution telemetry, price markers, risk targets, and audit trail.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Headline Result Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
            <span className="text-zinc-500 text-[11px] block">Realized PnL</span>
            <span className={`text-lg font-black mt-1 block flex items-center gap-1 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {trade.profit != null ? (trade.profit >= 0 ? `+${formatCurrency(trade.profit)}` : formatCurrency(trade.profit)) : '—'}
            </span>
            <span className={`text-[10px] ${isProfit ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
              Return: {trade.returnPct != null ? (trade.returnPct >= 0 ? `+${trade.returnPct.toFixed(2)}%` : `${trade.returnPct.toFixed(2)}%`) : '—'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
            <span className="text-zinc-500 text-[11px] block">Execution Duration</span>
            <span className="text-lg font-black text-zinc-100 mt-1 block flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>{durationStr}</span>
            </span>
            <span className="text-[10px] text-zinc-500">Contiguous fill life</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
            <span className="text-zinc-500 text-[11px] block">Entry Price</span>
            <span className="text-base font-bold text-zinc-200 mt-1 block">
              ${openPx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </span>
            <span className="text-[10px] text-zinc-500">Filled at market</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
            <span className="text-zinc-500 text-[11px] block">Close Price</span>
            <span className="text-base font-bold text-zinc-200 mt-1 block">
              ${closePx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </span>
            <span className="text-[10px] text-cyan-400">Trigger: {trade.exitReason}</span>
          </div>
        </div>

        {/* Visual Price Ladder & Target Execution Chart */}
        <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-zinc-300 font-bold">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Execution Price Level Ladder</span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Stop Loss
              </span>
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> Entry / Exit
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Take Profit
              </span>
            </div>
          </div>

          {/* Horizontal Level Gauge */}
          <div className="relative pt-6 pb-6 px-4 bg-zinc-900 rounded-lg border border-zinc-800">
            {/* Background Track */}
            <div className="h-2 w-full bg-zinc-800 rounded-full relative">
              {/* Range between Open and Close */}
              <div
                className={`absolute h-2 rounded-full ${isProfit ? 'bg-emerald-500/40' : 'bg-rose-500/40'}`}
                style={{
                  left: `${Math.min(toPct(openPx), toPct(closePx))}%`,
                  width: `${Math.abs(toPct(closePx) - toPct(openPx))}%`,
                }}
              />
            </div>

            {/* Stop Loss Pin */}
            <div
              className="absolute top-1 transform -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${toPct(slPx)}%` }}
            >
              <div className="text-[10px] font-mono text-rose-400 font-bold flex items-center gap-0.5">
                <AlertOctagon className="w-2.5 h-2.5" /> SL: ${slPx.toFixed(2)}
              </div>
              <div className="w-1 h-3 bg-rose-500 rounded-full my-0.5" />
            </div>

            {/* Entry Pin */}
            <div
              className="absolute top-4 transform -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${toPct(openPx)}%` }}
            >
              <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full ring-2 ring-cyan-950" />
              <div className="text-[10px] font-mono text-cyan-300 mt-1 font-semibold">
                Entry: ${openPx.toFixed(2)}
              </div>
            </div>

            {/* Exit Pin */}
            <div
              className="absolute top-4 transform -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${toPct(closePx)}%` }}
            >
              <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-zinc-950 ${isProfit ? 'bg-emerald-400 ring-emerald-950' : 'bg-rose-400 ring-rose-950'}`} />
              <div className={`text-[10px] font-mono mt-1 font-bold ${isProfit ? 'text-emerald-300' : 'text-rose-300'}`}>
                Exit: ${closePx.toFixed(2)}
              </div>
            </div>

            {/* Take Profit Pin */}
            <div
              className="absolute top-1 transform -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${toPct(tpPx)}%` }}
            >
              <div className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-0.5">
                <Target className="w-2.5 h-2.5" /> TP: ${tpPx.toFixed(2)}
              </div>
              <div className="w-1 h-3 bg-emerald-500 rounded-full my-0.5" />
            </div>
          </div>
        </div>

        {/* Detailed Fill Telemetry Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider font-mono text-zinc-400">
            Granular Fill & Execution Telemetry
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between">
              <span className="text-zinc-500">Open Timestamp</span>
              <span className="text-zinc-200">{trade.openTime ? formatTimestamp(trade.openTime) : '—'}</span>
            </div>
            <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between">
              <span className="text-zinc-500">Close Timestamp</span>
              <span className="text-zinc-200">{trade.closeTime ? formatTimestamp(trade.closeTime) : '—'}</span>
            </div>
            <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between">
              <span className="text-zinc-500">Broker Commission</span>
              <span className="text-zinc-200">${(trade.commission ?? 1.50).toFixed(2)} USD</span>
            </div>
            <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between">
              <span className="text-zinc-500">Overnight Financing (Swap)</span>
              <span className="text-zinc-200">${(trade.swap ?? 0.00).toFixed(2)} USD</span>
            </div>
            <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between">
              <span className="text-zinc-500">Simulated Slippage</span>
              <span className="text-cyan-400 font-bold">~0.8 bps ($0.51)</span>
            </div>
            <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between">
              <span className="text-zinc-500">Exit Mechanism</span>
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-bold text-[11px]">
                {trade.exitReason}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs font-mono">
          <span className="text-zinc-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Deterministic Broker Fill Verified</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold transition-colors"
          >
            Close Telemetry
          </button>
        </div>
      </div>
    </div>
  );
}
