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
    <div className="p-6 bg-white border border-black space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-black">
        <h3 className="text-sm font-bold text-black uppercase">
          Institutional Analytics & Risk Dimensions
        </h3>
        <span className="text-xs font-mono text-black font-bold">[MULTI-FACTOR AUDITED]</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 text-xs font-mono">
        <div className="p-3 bg-white border border-black">
          <span className="text-[11px] text-zinc-600 block">Profit Factor</span>
          <span className={`text-base font-bold mt-1 block ${(detailedMetrics.profitFactor ?? 0) >= 1.5 ? 'text-green-600' : 'text-black'}`}>
            {detailedMetrics.profitFactor != null ? detailedMetrics.profitFactor.toFixed(2) : '—'}
          </span>
          <span className="text-[10px] text-zinc-600">Gross W / Gross L</span>
        </div>

        <div className="p-3 bg-white border border-black">
          <span className="text-[11px] text-zinc-600 block">Win Rate</span>
          <span className="text-base font-bold mt-1 block text-black">
            {(() => {
              const wr = detailedMetrics.winRate;
              if (wr == null) return '—';
              const pct = wr > 1 ? wr : wr * 100;
              return `${pct.toFixed(1)}%`;
            })()}
          </span>
          <span className="text-[10px] text-zinc-600">Winning Fills</span>
        </div>

        <div className="p-3 bg-white border border-black">
          <span className="text-[11px] text-zinc-600 block">Sortino Ratio</span>
          <span className="text-base font-bold mt-1 block text-black">
            {detailedMetrics.sortinoRatio != null ? detailedMetrics.sortinoRatio.toFixed(2) : '—'}
          </span>
          <span className="text-[10px] text-zinc-600">Downside Adjusted</span>
        </div>

        <div className="p-3 bg-white border border-black">
          <span className="text-[11px] text-zinc-600 block">Calmar Ratio</span>
          <span className="text-base font-bold mt-1 block text-black">
            {detailedMetrics.calmarRatio != null ? detailedMetrics.calmarRatio.toFixed(2) : '—'}
          </span>
          <span className="text-[10px] text-zinc-600">Return / MaxDD</span>
        </div>

        <div className="p-3 bg-white border border-black">
          <span className="text-[11px] text-zinc-600 block">Expectancy</span>
          <span className={`text-base font-bold mt-1 block ${(detailedMetrics.expectancy ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {detailedMetrics.expectancy != null ? formatCurrency(detailedMetrics.expectancy) : '—'}
          </span>
          <span className="text-[10px] text-zinc-600">Per Executed Trade</span>
        </div>

        <div className="p-3 bg-white border border-black">
          <span className="text-[11px] text-zinc-600 block">Payoff Ratio</span>
          <span className="text-base font-bold mt-1 block text-black">
            {(() => {
              const payoff = detailedMetrics.payoffRatio ?? detailedMetrics.winLossRatio;
              return payoff != null ? payoff.toFixed(2) : '—';
            })()}
          </span>
          <span className="text-[10px] text-zinc-600">Avg Win / Avg Loss</span>
        </div>

        <div className="p-3 bg-white border border-black">
          <span className="text-[11px] text-zinc-600 block">Max Streak</span>
          <span className="text-base font-bold mt-1 block text-black">
            {detailedMetrics.maxConsecutiveWins ?? 0}W / {detailedMetrics.maxConsecutiveLosses ?? 0}L
          </span>
          <span className="text-[10px] text-zinc-600">Win / Loss Runs</span>
        </div>

        <div className="p-3 bg-white border border-black">
          <span className="text-[11px] text-zinc-600 block">Average Win</span>
          <span className="text-base font-bold mt-1 block text-green-600">
            {detailedMetrics.averageWin != null ? formatCurrency(detailedMetrics.averageWin) : '—'}
          </span>
          <span className="text-[10px] text-zinc-600">Realized Profit</span>
        </div>

        <div className="p-3 bg-white border border-black">
          <span className="text-[11px] text-zinc-600 block">Average Loss</span>
          <span className="text-base font-bold mt-1 block text-red-600">
            {detailedMetrics.averageLoss != null ? formatCurrency(detailedMetrics.averageLoss) : '—'}
          </span>
          <span className="text-[10px] text-zinc-600">Realized Deficit</span>
        </div>

        <div className="p-3 bg-white border border-black">
          <span className="text-[11px] text-zinc-600 block">Largest Win</span>
          <span className="text-base font-bold mt-1 block text-green-600">
            {detailedMetrics.largestWin != null ? formatCurrency(detailedMetrics.largestWin) : '—'}
          </span>
          <span className="text-[10px] text-zinc-600">Peak Single Trade</span>
        </div>

        <div className="p-3 bg-white border border-black">
          <span className="text-[11px] text-zinc-600 block">Largest Loss</span>
          <span className="text-base font-bold mt-1 block text-red-600">
            {detailedMetrics.largestLoss != null ? formatCurrency(detailedMetrics.largestLoss) : '—'}
          </span>
          <span className="text-[10px] text-zinc-600">Deepest Drawdown Fill</span>
        </div>

        <div className="p-3 bg-white border border-black">
          <span className="text-[11px] text-zinc-600 block">Gross Profit</span>
          <span className="text-base font-bold mt-1 block text-green-600">
            {detailedMetrics.grossProfit != null ? formatCurrency(detailedMetrics.grossProfit) : '—'}
          </span>
          <span className="text-[10px] text-zinc-600">Cumulative Gains</span>
        </div>

        <div className="p-3 bg-white border border-black">
          <span className="text-[11px] text-zinc-600 block">Gross Loss</span>
          <span className="text-base font-bold mt-1 block text-red-600">
            {detailedMetrics.grossLoss != null ? formatCurrency(detailedMetrics.grossLoss) : '—'}
          </span>
          <span className="text-[10px] text-zinc-600">Cumulative Losses</span>
        </div>
      </div>
    </div>
  );
}
