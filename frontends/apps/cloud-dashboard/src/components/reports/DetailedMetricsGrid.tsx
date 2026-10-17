'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '@razor/ui-kit';
import type { DetailedMetricsPayload } from '@/lib/api-client';

export interface DetailedMetricsGridProps {
  detailedMetrics: DetailedMetricsPayload;
}

export function DetailedMetricsGrid({ detailedMetrics }: DetailedMetricsGridProps) {
  return (
    <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
        <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-600" />
          <span>Institutional Analytics & Risk Dimensions</span>
        </h3>
        <span className="text-xs font-mono text-zinc-400">Multi-Factor Audited</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 text-xs font-mono">
        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
          <span className="text-[11px] text-zinc-500 block">Profit Factor</span>
          <span className={`text-base font-bold mt-1 block ${(detailedMetrics.profitFactor ?? 0) >= 1.5 ? 'text-emerald-700' : 'text-zinc-800'}`}>
            {detailedMetrics.profitFactor != null ? detailedMetrics.profitFactor.toFixed(2) : '—'}
          </span>
          <span className="text-[10px] text-zinc-400">Gross W / Gross L</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
          <span className="text-[11px] text-zinc-500 block">Win Rate</span>
          <span className="text-base font-bold mt-1 block text-zinc-900">
            {(() => {
              const wr = detailedMetrics.winRate;
              if (wr == null) return '—';
              const pct = wr > 1 ? wr : wr * 100;
              return `${pct.toFixed(1)}%`;
            })()}
          </span>
          <span className="text-[10px] text-zinc-400">Winning Fills</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
          <span className="text-[11px] text-zinc-500 block">Sortino Ratio</span>
          <span className="text-base font-bold mt-1 block text-cyan-800">
            {detailedMetrics.sortinoRatio != null ? detailedMetrics.sortinoRatio.toFixed(2) : '—'}
          </span>
          <span className="text-[10px] text-zinc-400">Downside Adjusted</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
          <span className="text-[11px] text-zinc-500 block">Calmar Ratio</span>
          <span className="text-base font-bold mt-1 block text-cyan-800">
            {detailedMetrics.calmarRatio != null ? detailedMetrics.calmarRatio.toFixed(2) : '—'}
          </span>
          <span className="text-[10px] text-zinc-400">Return / MaxDD</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
          <span className="text-[11px] text-zinc-500 block">Expectancy</span>
          <span className={`text-base font-bold mt-1 block ${(detailedMetrics.expectancy ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {detailedMetrics.expectancy != null ? formatCurrency(detailedMetrics.expectancy) : '—'}
          </span>
          <span className="text-[10px] text-zinc-400">Per Executed Trade</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
          <span className="text-[11px] text-zinc-500 block">Payoff Ratio</span>
          <span className="text-base font-bold mt-1 block text-zinc-900">
            {(() => {
              const payoff = detailedMetrics.payoffRatio ?? detailedMetrics.winLossRatio;
              return payoff != null ? payoff.toFixed(2) : '—';
            })()}
          </span>
          <span className="text-[10px] text-zinc-400">Avg Win / Avg Loss</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
          <span className="text-[11px] text-zinc-500 block">Max Streak</span>
          <span className="text-base font-bold mt-1 block text-purple-800">
            {detailedMetrics.maxConsecutiveWins ?? 0}W / {detailedMetrics.maxConsecutiveLosses ?? 0}L
          </span>
          <span className="text-[10px] text-zinc-400">Win / Loss Runs</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
          <span className="text-[11px] text-zinc-500 block">Average Win</span>
          <span className="text-base font-bold mt-1 block text-emerald-700">
            {detailedMetrics.averageWin != null ? formatCurrency(detailedMetrics.averageWin) : '—'}
          </span>
          <span className="text-[10px] text-zinc-400">Realized Profit</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
          <span className="text-[11px] text-zinc-500 block">Average Loss</span>
          <span className="text-base font-bold mt-1 block text-rose-700">
            {detailedMetrics.averageLoss != null ? formatCurrency(detailedMetrics.averageLoss) : '—'}
          </span>
          <span className="text-[10px] text-zinc-400">Realized Deficit</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
          <span className="text-[11px] text-zinc-500 block">Largest Win</span>
          <span className="text-base font-bold mt-1 block text-emerald-800 font-bold">
            {detailedMetrics.largestWin != null ? formatCurrency(detailedMetrics.largestWin) : '—'}
          </span>
          <span className="text-[10px] text-zinc-400">Peak Single Trade</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
          <span className="text-[11px] text-zinc-500 block">Largest Loss</span>
          <span className="text-base font-bold mt-1 block text-rose-800 font-bold">
            {detailedMetrics.largestLoss != null ? formatCurrency(detailedMetrics.largestLoss) : '—'}
          </span>
          <span className="text-[10px] text-zinc-400">Deepest Drawdown Fill</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
          <span className="text-[11px] text-zinc-500 block">Gross Profit</span>
          <span className="text-base font-bold mt-1 block text-emerald-700">
            {detailedMetrics.grossProfit != null ? formatCurrency(detailedMetrics.grossProfit) : '—'}
          </span>
          <span className="text-[10px] text-zinc-400">Cumulative Gains</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
          <span className="text-[11px] text-zinc-500 block">Gross Loss</span>
          <span className="text-base font-bold mt-1 block text-rose-700">
            {detailedMetrics.grossLoss != null ? formatCurrency(detailedMetrics.grossLoss) : '—'}
          </span>
          <span className="text-[10px] text-zinc-400">Cumulative Losses</span>
        </div>
      </div>
    </div>
  );
}
