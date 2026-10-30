'use client';

import React from 'react';
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 font-sans">
      {/* Unrealized PnL */}
      <div className="p-5 bg-[#171717] border border-[#262626] rounded-xl">
        <span className="text-xs font-semibold text-zinc-400 block uppercase tracking-wider">Open Unrealized PnL</span>
        <span className={`text-2xl font-bold font-mono mt-2 block ${totalUnrealized >= 0 ? 'text-[#3ECF8E]' : 'text-rose-400'}`}>
          {totalUnrealized >= 0 ? `+${formatCurrency(totalUnrealized)}` : formatCurrency(totalUnrealized)}
        </span>
        <span className="text-xs text-zinc-500 mt-1 block">Floating Equity Shift</span>
      </div>

      {/* Realized Daily PnL */}
      <div className="p-5 bg-[#171717] border border-[#262626] rounded-xl">
        <span className="text-xs font-semibold text-zinc-400 block uppercase tracking-wider">Realized Daily PnL</span>
        <span className={`text-2xl font-bold font-mono mt-2 block ${totalRealizedDaily >= 0 ? 'text-[#3ECF8E]' : 'text-rose-400'}`}>
          {totalRealizedDaily >= 0 ? `+${formatCurrency(totalRealizedDaily)}` : formatCurrency(totalRealizedDaily)}
        </span>
        <span className="text-xs text-zinc-500 mt-1 block">Closed Executed Fills</span>
      </div>

      {/* Open Positions Count */}
      <div className="p-5 bg-[#171717] border border-[#262626] rounded-xl">
        <span className="text-xs font-semibold text-zinc-400 block uppercase tracking-wider">Open Positions</span>
        <span className="text-2xl font-bold font-mono text-zinc-100 mt-2 block">
          {openPositionsCount} Active
        </span>
        <span className="text-xs text-zinc-500 mt-1 block">Notional Exposure</span>
      </div>

      {/* Margin Utilization */}
      <div className="p-5 bg-[#171717] border border-[#262626] rounded-xl">
        <span className="text-xs font-semibold text-zinc-400 block uppercase tracking-wider">Margin Utilization</span>
        <span className="text-2xl font-bold font-mono text-zinc-100 mt-2 block">
          18.5%
        </span>
        <span className="text-xs text-zinc-500 mt-1 block">Leverage: 3.5x Cap</span>
      </div>

      {/* Risk Shield Status */}
      <div className="p-5 bg-[#171717] border border-[#262626] rounded-xl">
        <span className="text-xs font-semibold text-zinc-400 block uppercase tracking-wider">Circuit Breaker</span>
        <span className="text-2xl font-bold font-mono text-[#3ECF8E] mt-2 block">
          Nominal
        </span>
        <span className="text-xs text-zinc-500 mt-1 block">Daily DD: 0.8% / {maxDailyDrawdown}%</span>
      </div>
    </div>
  );
}
