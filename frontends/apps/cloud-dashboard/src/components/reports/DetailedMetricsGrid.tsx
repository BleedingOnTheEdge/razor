'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '@razor/ui-kit';
import type { DetailedMetricsPayload } from '@/lib/api-client';

export interface DetailedMetricsGridProps {
  detailedMetrics: DetailedMetricsPayload;
}

export function DetailedMetricsGrid({ detailedMetrics }: DetailedMetricsGridProps) {
  const recoveryFactor = (detailedMetrics as any).recoveryFactor ?? (
    detailedMetrics.grossProfit && detailedMetrics.largestLoss
      ? (detailedMetrics.grossProfit / Math.abs(detailedMetrics.largestLoss))
      : null
  );

  return (
    <div className="p-5 bg-[#171717] border border-[#262626] rounded-xl space-y-4 font-sans text-xs text-zinc-100">
      <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-zinc-100" />
          <span>Institutional Analytics & Risk Dimensions</span>
        </h3>
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#262626] bg-[#141414] text-zinc-300">
          Multi-Factor Audited
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
        {/* ROW 1: 7 Dimensions */}
        <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg">
          <span className="text-[11px] font-bold text-zinc-100 uppercase tracking-wider block">Profit Factor</span>
          <span className={`text-base font-bold mt-1.5 block font-mono ${(detailedMetrics.profitFactor ?? 0) >= 1.5 ? 'text-[#3ECF8E]' : 'text-zinc-100'}`}>
            {detailedMetrics.profitFactor != null ? detailedMetrics.profitFactor.toFixed(2) : '—'}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block font-sans">Gross W / Gross L</span>
        </div>

        <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg">
          <span className="text-[11px] font-bold text-zinc-100 uppercase tracking-wider block">Win Rate</span>
          <span className="text-base font-bold mt-1.5 block font-mono text-zinc-100">
            {(() => {
              const wr = detailedMetrics.winRate;
              if (wr == null) return '—';
              const pct = wr > 1 ? wr : wr * 100;
              return `${pct.toFixed(1)}%`;
            })()}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block font-sans">Winning Fills</span>
        </div>

        <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg">
          <span className="text-[11px] font-bold text-zinc-100 uppercase tracking-wider block">Sortino Ratio</span>
          <span className="text-base font-bold mt-1.5 block font-mono text-zinc-100">
            {detailedMetrics.sortinoRatio != null ? detailedMetrics.sortinoRatio.toFixed(2) : '—'}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block font-sans">Downside Adjusted</span>
        </div>

        <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg">
          <span className="text-[11px] font-bold text-zinc-100 uppercase tracking-wider block">Calmar Ratio</span>
          <span className="text-base font-bold mt-1.5 block font-mono text-zinc-100">
            {detailedMetrics.calmarRatio != null ? detailedMetrics.calmarRatio.toFixed(2) : '—'}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block font-sans">Return / MaxDD</span>
        </div>

        <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg">
          <span className="text-[11px] font-bold text-zinc-100 uppercase tracking-wider block">Expectancy</span>
          <span className={`text-base font-bold mt-1.5 block font-mono ${(detailedMetrics.expectancy ?? 0) >= 0 ? 'text-[#3ECF8E]' : 'text-rose-400'}`}>
            {detailedMetrics.expectancy != null ? formatCurrency(detailedMetrics.expectancy) : '—'}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block font-sans">Per Executed Trade</span>
        </div>

        <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg">
          <span className="text-[11px] font-bold text-zinc-100 uppercase tracking-wider block">Payoff Ratio</span>
          <span className="text-base font-bold mt-1.5 block font-mono text-zinc-100">
            {(() => {
              const payoff = detailedMetrics.payoffRatio ?? detailedMetrics.winLossRatio;
              return payoff != null ? payoff.toFixed(2) : '—';
            })()}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block font-sans">Avg Win / Avg Loss</span>
        </div>

        <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg">
          <span className="text-[11px] font-bold text-zinc-100 uppercase tracking-wider block">Max Streak</span>
          <span className="text-base font-bold mt-1.5 block font-mono text-zinc-100">
            {detailedMetrics.maxConsecutiveWins ?? 0}W / {detailedMetrics.maxConsecutiveLosses ?? 0}L
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block font-sans">Win / Loss Runs</span>
        </div>

        {/* ROW 2: 7 Dimensions (Completed 7th Card) */}
        <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg">
          <span className="text-[11px] font-bold text-zinc-100 uppercase tracking-wider block">Average Win</span>
          <span className="text-base font-bold mt-1.5 block font-mono text-[#3ECF8E]">
            {detailedMetrics.averageWin != null ? formatCurrency(detailedMetrics.averageWin) : '—'}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block font-sans">Realized Profit</span>
        </div>

        <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg">
          <span className="text-[11px] font-bold text-zinc-100 uppercase tracking-wider block">Average Loss</span>
          <span className="text-base font-bold mt-1.5 block font-mono text-rose-400">
            {detailedMetrics.averageLoss != null ? formatCurrency(detailedMetrics.averageLoss) : '—'}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block font-sans">Realized Deficit</span>
        </div>

        <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg">
          <span className="text-[11px] font-bold text-zinc-100 uppercase tracking-wider block">Largest Win</span>
          <span className="text-base font-bold mt-1.5 block font-mono text-[#3ECF8E]">
            {detailedMetrics.largestWin != null ? formatCurrency(detailedMetrics.largestWin) : '—'}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block font-sans">Peak Single Trade</span>
        </div>

        <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg">
          <span className="text-[11px] font-bold text-zinc-100 uppercase tracking-wider block">Largest Loss</span>
          <span className="text-base font-bold mt-1.5 block font-mono text-rose-400">
            {detailedMetrics.largestLoss != null ? formatCurrency(detailedMetrics.largestLoss) : '—'}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block font-sans">Deepest Drawdown Fill</span>
        </div>

        <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg">
          <span className="text-[11px] font-bold text-zinc-100 uppercase tracking-wider block">Gross Profit</span>
          <span className="text-base font-bold mt-1.5 block font-mono text-[#3ECF8E]">
            {detailedMetrics.grossProfit != null ? formatCurrency(detailedMetrics.grossProfit) : '—'}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block font-sans">Cumulative Gains</span>
        </div>

        <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg">
          <span className="text-[11px] font-bold text-zinc-100 uppercase tracking-wider block">Gross Loss</span>
          <span className="text-base font-bold mt-1.5 block font-mono text-rose-400">
            {detailedMetrics.grossLoss != null ? formatCurrency(detailedMetrics.grossLoss) : '—'}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block font-sans">Cumulative Losses</span>
        </div>

        {/* 14th Metric: Recovery Factor */}
        <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg">
          <span className="text-[11px] font-bold text-zinc-100 uppercase tracking-wider block">Recovery Factor</span>
          <span className={`text-base font-bold mt-1.5 block font-mono ${(recoveryFactor ?? 0) >= 1.5 ? 'text-[#3ECF8E]' : 'text-zinc-100'}`}>
            {recoveryFactor != null ? Number(recoveryFactor).toFixed(2) : '—'}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block font-sans">Profit / Max Loss</span>
        </div>
      </div>
    </div>
  );
}
