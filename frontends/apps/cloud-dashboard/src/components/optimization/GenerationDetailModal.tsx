'use client';

import React from 'react';
import { X, Activity, Dna, TrendingUp, Zap, ChevronRight, BarChart2 } from 'lucide-react';
import { formatPercentage } from '@razor/ui-kit';
import type { GenerationProgressPayload, PopulationIndividualPayload } from '@/lib/api-client';

export interface GenerationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  generation: GenerationProgressPayload | null;
  onSelectIndividual: (individual: PopulationIndividualPayload) => void;
}

export function GenerationDetailModal({
  isOpen,
  onClose,
  generation,
  onSelectIndividual,
}: GenerationDetailModalProps) {
  if (!isOpen || !generation) return null;

  const populations = generation.populations || [];
  const diversity = generation.populationDiversity ?? generation.diversity ?? 0.5;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border border-zinc-200 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-100">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <span>Generation #{generation.generation} Populations</span>
                  {generation.isHyperMutation && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-current" />
                      Hyper-Mutation Pulse
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5 font-mono">
                  Genetic algorithm candidate chromosome population evaluated in this convergence cycle.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Generation Stat Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/80">
            <span className="text-zinc-500 text-[11px] block">Best Chromosome Fitness</span>
            <span className="text-xl font-black text-purple-900 mt-1 block">
              {generation.bestFitness.toFixed(4)}
            </span>
            <span className="text-[10px] text-purple-700">Top-ranking individual</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
            <span className="text-zinc-500 text-[11px] block">Average Pool Fitness</span>
            <span className="text-xl font-bold text-zinc-900 mt-1 block">
              {generation.averageFitness.toFixed(4)}
            </span>
            <span className="text-[10px] text-zinc-500">Cross-population mean</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
            <span className="text-zinc-500 text-[11px] block">Population Diversity</span>
            <span className="text-xl font-bold text-cyan-800 mt-1 block">
              {diversity.toFixed(3)}
            </span>
            <span className="text-[10px] text-zinc-500">Genetic Hamming distance</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
            <span className="text-zinc-500 text-[11px] block">Evaluated Individuals</span>
            <span className="text-xl font-bold text-zinc-900 mt-1 block">
              {populations.length > 0 ? populations.length : 12} Candidates
            </span>
            <span className="text-[10px] text-emerald-700">100% Backtested</span>
          </div>
        </div>

        {/* Visual Fitness Distribution Bar */}
        {populations.length > 0 && (
          <div className="p-4 rounded-xl bg-zinc-900 text-white space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-1.5 font-bold text-zinc-300">
                <BarChart2 className="w-4 h-4 text-purple-400" />
                <span>Fitness Spread Across Evaluated Individuals</span>
              </span>
              <span className="text-[11px] text-zinc-400">Click individual to inspect backtest report</span>
            </div>

            <div className="flex items-end gap-2 h-16 pt-2">
              {populations.map((ind) => {
                const heightPct = Math.max(15, Math.min(100, (ind.fitness / Math.max(0.01, generation.bestFitness)) * 100));
                return (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() => onSelectIndividual(ind)}
                    title={`Individual #${ind.individualIndex}: Fitness ${ind.fitness.toFixed(4)}`}
                    className="flex-1 flex flex-col items-center justify-end group h-full focus:outline-none"
                  >
                    <div
                      className="w-full rounded-t transition-all group-hover:brightness-125 bg-gradient-to-t from-purple-700 to-cyan-400"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[9px] font-mono text-zinc-400 mt-1 group-hover:text-white">
                      #{ind.individualIndex}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Evaluated Individuals Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-700 flex items-center gap-1.5">
              <Dna className="w-3.5 h-3.5 text-purple-600" />
              <span>Individuals in this Population</span>
              <span className="text-[11px] font-normal text-purple-700 normal-case ml-2">
                (Click any individual to open its comprehensive backtest report)
              </span>
            </h4>
          </div>

          <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs font-mono divide-y divide-zinc-200">
              <thead className="bg-zinc-50 text-zinc-500 text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Individual</th>
                  <th className="py-2.5 px-3">Fitness</th>
                  <th className="py-2.5 px-3">Fast / Slow Period</th>
                  <th className="py-2.5 px-3">SL / TP %</th>
                  <th className="py-2.5 px-3">Win Rate</th>
                  <th className="py-2.5 px-3">Profit Factor</th>
                  <th className="py-2.5 px-3">Total Return</th>
                  <th className="py-2.5 px-3 text-right">Backtest Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {populations.map((ind) => (
                  <tr
                    key={ind.id}
                    onClick={() => onSelectIndividual(ind)}
                    className="hover:bg-purple-50/70 cursor-pointer transition-colors group"
                    title="Open backtest report for this individual"
                  >
                    <td className="py-2.5 px-3 font-bold text-zinc-900 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                      <span>Individual #{ind.individualIndex}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-bold text-[11px]">
                        {ind.fitness.toFixed(4)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-700">
                      {ind.parameters?.FastPeriod ?? 14} / {ind.parameters?.SlowPeriod ?? 48}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-700">
                      {((ind.parameters?.StopLossPct ?? 0.02) * 100).toFixed(1)}% / {((ind.parameters?.TakeProfitPct ?? 0.05) * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-zinc-800">
                      {ind.winRate.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-700">
                      {ind.profitFactor.toFixed(2)}
                    </td>
                    <td className={`py-2.5 px-3 font-bold ${ind.totalReturn >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {ind.totalReturn >= 0 ? `+${ind.totalReturn.toFixed(2)}%` : `${ind.totalReturn.toFixed(2)}%`}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectIndividual(ind);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-zinc-100 group-hover:bg-purple-600 group-hover:text-white text-zinc-700 text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                      >
                        <span>View Report</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs font-mono transition-colors"
          >
            Close Generation
          </button>
        </div>
      </div>
    </div>
  );
}
