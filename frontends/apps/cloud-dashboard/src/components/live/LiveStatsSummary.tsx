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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 font-mono">
      {/* Unrealized PnL */}
      <div className="p-4 bg-white border border-black">
        <span className="text-xs text-black font-bold block uppercase">Open Unrealized PnL</span>
        <span className={`text-2xl font-bold mt-2 block ${totalUnrealized >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {totalUnrealized >= 0 ? `+${formatCurrency(totalUnrealized)}` : formatCurrency(totalUnrealized)}
        </span>
        <span className="text-[11px] text-zinc-600 mt-1 block">Floating Equity Shift</span>
      </div>

      {/* Realized Daily PnL */}
      <div className="p-4 bg-white border border-black">
        <span className="text-xs text-black font-bold block uppercase">Realized Daily PnL</span>
        <span className={`text-2xl font-bold mt-2 block ${totalRealizedDaily >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {totalRealizedDaily >= 0 ? `+${formatCurrency(totalRealizedDaily)}` : formatCurrency(totalRealizedDaily)}
        </span>
        <span className="text-[11px] text-zinc-600 mt-1 block">Closed Executed Fills</span>
      </div>

      {/* Open Positions Count */}
      <div className="p-4 bg-white border border-black">
        <span className="text-xs text-black font-bold block uppercase">Open Positions</span>
        <span className="text-2xl font-bold text-black mt-2 block">
          {openPositionsCount} Active
        </span>
        <span className="text-[11px] text-zinc-600 mt-1 block">Notional Exposure</span>
      </div>

      {/* Margin Utilization */}
      <div className="p-4 bg-white border border-black">
        <span className="text-xs text-black font-bold block uppercase">Margin Utilization</span>
        <span className="text-2xl font-bold text-black mt-2 block">
          18.5%
        </span>
        <span className="text-[11px] text-zinc-600 mt-1 block">Leverage: 3.5x Cap</span>
      </div>

      {/* Risk Shield Status */}
      <div className="p-4 bg-white border border-black">
        <span className="text-xs text-black font-bold block uppercase">Circuit Breaker</span>
        <span className="text-2xl font-bold text-green-600 mt-2 block">
          Nominal
        </span>
        <span className="text-[11px] text-zinc-600 mt-1 block">Daily DD: 0.8% / {maxDailyDrawdown}%</span>
      </div>
    </div>
  );
}
