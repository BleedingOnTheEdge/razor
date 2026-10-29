'use client';

import React from 'react';
import { ShieldCheck, TrendingUp, DollarSign, Activity, AlertCircle } from 'lucide-react';
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
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
        <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">Open Unrealized PnL</span>
        <span className={`text-2xl font-bold font-mono mt-2 block ${totalUnrealized >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
          {totalUnrealized >= 0 ? `+${formatCurrency(totalUnrealized)}` : formatCurrency(totalUnrealized)}
        </span>
        <span className="text-xs text-slate-400 mt-1 block">Floating Equity Shift</span>
      </div>

      {/* Realized Daily PnL */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
        <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">Realized Daily PnL</span>
        <span className={`text-2xl font-bold font-mono mt-2 block ${totalRealizedDaily >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
          {totalRealizedDaily >= 0 ? `+${formatCurrency(totalRealizedDaily)}` : formatCurrency(totalRealizedDaily)}
        </span>
        <span className="text-xs text-slate-400 mt-1 block">Closed Executed Fills</span>
      </div>

      {/* Open Positions Count */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
        <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">Open Positions</span>
        <span className="text-2xl font-bold font-mono text-slate-900 mt-2 block">
          {openPositionsCount} Active
        </span>
        <span className="text-xs text-slate-400 mt-1 block">Notional Exposure</span>
      </div>

      {/* Margin Utilization */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
        <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">Margin Utilization</span>
        <span className="text-2xl font-bold font-mono text-slate-900 mt-2 block">
          18.5%
        </span>
        <span className="text-xs text-slate-400 mt-1 block">Leverage: 3.5x Cap</span>
      </div>

      {/* Risk Shield Status */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
        <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">Circuit Breaker</span>
        <span className="text-2xl font-bold font-mono text-emerald-700 mt-2 block">
          Nominal
        </span>
        <span className="text-xs text-slate-400 mt-1 block">Daily DD: 0.8% / {maxDailyDrawdown}%</span>
      </div>
    </div>
  );
}
