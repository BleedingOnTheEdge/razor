'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { formatCurrency } from '@razor/ui-kit';

export interface LiveStatsSummaryProps {
  totalUnrealized: number;
  totalRealizedDaily: number;
  openPositionsCount: number;
  maxDailyDrawdown: string;
}

export function LiveStatsSummary({
  totalUnrealized,
  totalRealizedDaily,
  openPositionsCount,
  maxDailyDrawdown,
}: LiveStatsSummaryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Unrealized PnL */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-sm">
        <span className="text-xs font-mono text-zinc-400 block">Open Unrealized PnL</span>
        <span className={`text-2xl font-bold mt-2 block font-mono ${totalUnrealized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {formatCurrency(totalUnrealized)}
        </span>
        <span className="text-[11px] text-zinc-500 mt-1 block font-mono">Floating Equity Shift</span>
      </div>

      {/* Realized Daily PnL */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-sm">
        <span className="text-xs font-mono text-zinc-400 block">Realized Daily PnL</span>
        <span className={`text-2xl font-bold mt-2 block font-mono ${totalRealizedDaily >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {formatCurrency(totalRealizedDaily)}
        </span>
        <span className="text-[11px] text-zinc-500 mt-1 block font-mono">Closed Executed Fills</span>
      </div>

      {/* Open Positions Count */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-sm">
        <span className="text-xs font-mono text-zinc-400 block">Open Positions</span>
        <span className="text-2xl font-bold text-white mt-2 block font-mono">
          {openPositionsCount} Active
        </span>
        <span className="text-[11px] text-zinc-500 mt-1 block font-mono">Notional: ~$42.5k</span>
      </div>

      {/* Margin Utilization */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-sm">
        <span className="text-xs font-mono text-zinc-400 block">Margin Utilization</span>
        <span className="text-2xl font-bold text-cyan-400 mt-2 block font-mono">
          18.5%
        </span>
        <span className="text-[11px] text-zinc-500 mt-1 block font-mono">Leverage: 3.5x Cap</span>
      </div>

      {/* Risk Shield Status */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-sm">
        <span className="text-xs font-mono text-zinc-400 block">Circuit Breaker</span>
        <span className="text-2xl font-bold text-emerald-400 mt-2 block font-mono flex items-center gap-1.5">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          Nominal
        </span>
        <span className="text-[11px] text-zinc-500 mt-1 block font-mono">Daily DD: 0.8% / {maxDailyDrawdown}%</span>
      </div>
    </div>
  );
}
