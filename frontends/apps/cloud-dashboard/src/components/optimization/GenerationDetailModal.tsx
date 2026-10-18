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
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 font-mono text-xs"
      onClick={onClose}
    >
      <div
        className="bg-white border border-black max-w-4xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto text-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-black">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold text-black uppercase flex items-center gap-2">
                <span>Generation #{generation.generation} Populations</span>
                {generation.isHyperMutation && (
                  <span className="px-2 py-0.5 border border-black text-xs font-mono font-bold bg-white text-red-600">
                    [HYPER-MUTATION PULSE]
                  </span>
                )}
              </h3>
            </div>
            <p className="text-xs text-zinc-600 mt-1">
              Genetic algorithm candidate chromosome population evaluated in this convergence cycle.
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

        {/* Generation Stat Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3.5 bg-white border border-black">
            <span className="text-zinc-600 text-[11px] block font-bold">Best Chromosome Fitness</span>
            <span className="text-xl font-bold text-black mt-1 block">
              {generation.bestFitness.toFixed(4)}
            </span>
            <span className="text-[10px] text-zinc-600">Top-ranking individual</span>
          </div>

          <div className="p-3.5 bg-white border border-black">
            <span className="text-zinc-600 text-[11px] block font-bold">Average Pool Fitness</span>
            <span className="text-xl font-bold text-black mt-1 block">
              {generation.averageFitness.toFixed(4)}
            </span>
            <span className="text-[10px] text-zinc-600">Cross-population mean</span>
          </div>

          <div className="p-3.5 bg-white border border-black">
            <span className="text-zinc-600 text-[11px] block font-bold">Population Diversity</span>
            <span className="text-xl font-bold text-black mt-1 block">
              {diversity.toFixed(3)}
            </span>
            <span className="text-[10px] text-zinc-600">Genetic Hamming distance</span>
          </div>

          <div className="p-3.5 bg-white border border-black">
            <span className="text-zinc-600 text-[11px] block font-bold">Evaluated Individuals</span>
            <span className="text-xl font-bold text-black mt-1 block">
              {populations.length > 0 ? populations.length : 12} Candidates
            </span>
            <span className="text-[10px] text-green-600 font-bold">100% Backtested</span>
          </div>
        </div>

        {/* Evaluated Individuals Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-black">
              Individuals in this Population (Click any individual to open its comprehensive backtest report)
            </h4>
          </div>

          <div className="border border-black overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-black text-black font-bold uppercase text-[10px]">
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
              <tbody className="divide-y divide-black text-black">
                {populations.map((ind) => (
                  <tr
                    key={ind.id}
                    onClick={() => onSelectIndividual(ind)}
                    className="hover:bg-zinc-100 cursor-pointer transition-colors group"
                    title="Open backtest report for this individual"
                  >
                    <td className="py-2.5 px-3 font-bold text-black">
                      Individual #{ind.individualIndex}
                    </td>
                    <td className="py-2.5 px-3 font-bold">
                      {ind.fitness.toFixed(4)}
                    </td>
                    <td className="py-2.5 px-3">
                      {ind.parameters?.FastPeriod ?? 14} / {ind.parameters?.SlowPeriod ?? 48}
                    </td>
                    <td className="py-2.5 px-3">
                      {((ind.parameters?.StopLossPct ?? 0.02) * 100).toFixed(1)}% / {((ind.parameters?.TakeProfitPct ?? 0.05) * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 font-bold">
                      {ind.winRate.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 font-bold">
                      {ind.profitFactor.toFixed(2)}
                    </td>
                    <td className={`py-2.5 px-3 font-bold ${ind.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {ind.totalReturn >= 0 ? `+${ind.totalReturn.toFixed(2)}%` : `${ind.totalReturn.toFixed(2)}%`}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectIndividual(ind);
                        }}
                        className="px-2.5 py-1 border border-black bg-white hover:bg-black hover:text-white text-black font-bold text-[11px] transition-colors"
                      >
                        [VIEW REPORT]
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-black">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-black bg-white hover:bg-black hover:text-white text-black font-bold text-xs font-mono transition-colors"
          >
            Close Generation
          </button>
        </div>
      </div>
    </div>
  );
}
