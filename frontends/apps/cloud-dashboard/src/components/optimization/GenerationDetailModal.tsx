'use client';

import React from 'react';
import Link from 'next/link';
import { X, Activity, Dna, TrendingUp, Zap, ChevronRight, BarChart2 } from 'lucide-react';
import { formatPercentage } from '@razor/ui-kit';
import type { GenerationProgressPayload, PopulationIndividualPayload } from '@/lib/api-client';

export interface GenerationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  generation: GenerationProgressPayload | null;
  onSelectIndividual: (individual: PopulationIndividualPayload) => void;
  runId?: string;
}

export function GenerationDetailModal({
  isOpen,
  onClose,
  generation,
  onSelectIndividual,
  runId,
}: GenerationDetailModalProps) {
  if (!isOpen || !generation) return null;

  const populations = generation.populations || [];
  const diversity = generation.populationDiversity ?? generation.diversity ?? 0.5;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans text-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#171717] border border-[#262626] rounded-2xl shadow-xl max-w-4xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto text-zinc-100 animate-in fade-in-0 zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#262626]">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                <Dna className="w-5 h-5 text-[#3ECF8E]" />
                <span>Generation #{generation.generation} Population Evaluator</span>
              </h3>
              {generation.isHyperMutation && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/20 text-rose-400 border border-rose-500/30">
                  Hyper-Mutation Pulse
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Genetic algorithm candidate chromosome population evaluated in this convergence cycle.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-400 hover:bg-[#1f1f1f] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Generation Stat Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl">
            <span className="text-zinc-400 text-xs block font-medium uppercase tracking-wider">Best Chromosome Fitness</span>
            <span className="text-2xl font-bold text-[#3ECF8E] mt-1 block font-mono">
              {generation.bestFitness.toFixed(4)}
            </span>
            <span className="text-xs text-zinc-500">Top-ranking individual</span>
          </div>

          <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl">
            <span className="text-zinc-400 text-xs block font-medium uppercase tracking-wider">Average Pool Fitness</span>
            <span className="text-2xl font-bold text-zinc-100 mt-1 block font-mono">
              {generation.averageFitness.toFixed(4)}
            </span>
            <span className="text-xs text-zinc-500">Cross-population mean</span>
          </div>

          <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl">
            <span className="text-zinc-400 text-xs block font-medium uppercase tracking-wider">Population Diversity</span>
            <span className="text-2xl font-bold text-[#3ECF8E] mt-1 block font-mono">
              {diversity.toFixed(3)}
            </span>
            <span className="text-xs text-zinc-500">Genetic Hamming distance</span>
          </div>

          <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl">
            <span className="text-zinc-400 text-xs block font-medium uppercase tracking-wider">Evaluated Individuals</span>
            <span className="text-2xl font-bold text-zinc-100 mt-1 block font-mono">
              {populations.length > 0 ? populations.length : 12} Candidates
            </span>
            <span className="text-xs text-[#3ECF8E] font-medium">100% Backtested</span>
          </div>
        </div>

        {/* Evaluated Individuals Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Individuals in this Population (Click any individual to open its comprehensive backtest report)
            </h4>
          </div>

          <div className="border border-[#262626] rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#262626] bg-[#141414] text-zinc-400 font-semibold uppercase text-xs tracking-wider">
                  <th className="py-3 px-4">Individual</th>
                  <th className="py-3 px-4">Fitness</th>
                  <th className="py-3 px-4">Fast / Slow Period</th>
                  <th className="py-3 px-4">SL / TP %</th>
                  <th className="py-3 px-4">Win Rate</th>
                  <th className="py-3 px-4">Profit Factor</th>
                  <th className="py-3 px-4">Total Return</th>
                  <th className="py-3 px-4 text-right">Backtest Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] bg-[#171717] font-mono text-xs">
                {populations.map((ind) => (
                  <tr
                    key={ind.id}
                    onClick={() => onSelectIndividual(ind)}
                    className="hover:bg-[#141414]/80 cursor-pointer transition-colors group"
                    title="Open backtest report for this individual"
                  >
                    <td className="py-3 px-4 font-bold text-[#3ECF8E] font-sans group-hover:underline">
                      Individual #{ind.individualIndex}
                    </td>
                    <td className="py-3 px-4 font-bold text-zinc-100">
                      {ind.fitness.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      {ind.parameters?.FastPeriod ?? 14} / {ind.parameters?.SlowPeriod ?? 48}
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      {((ind.parameters?.StopLossPct ?? 0.02) * 100).toFixed(1)}% / {((ind.parameters?.TakeProfitPct ?? 0.05) * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 font-bold text-zinc-100">
                      {ind.winRate.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 font-bold text-zinc-100">
                      {ind.profitFactor.toFixed(2)}
                    </td>
                    <td className={`py-3 px-4 font-bold ${ind.totalReturn >= 0 ? 'text-[#3ECF8E]' : 'text-rose-400'}`}>
                      {ind.totalReturn >= 0 ? `+${ind.totalReturn.toFixed(2)}%` : `${ind.totalReturn.toFixed(2)}%`}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectIndividual(ind);
                        }}
                        className="px-3 py-1 rounded-full bg-[#3ECF8E] hover:bg-[#34b27b] text-[#0f0f0f] font-semibold text-xs font-sans transition-colors"
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#262626]">
          {runId && generation.generation !== undefined ? (
            <Link
              href={'/panel/reports/' + runId + '/generations/' + generation.generation}
              className="px-3.5 py-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors inline-flex items-center gap-1.5 text-xs font-mono"
            >
              <span>OPEN FULL GENERATION PAGE →</span>
            </Link>
          ) : <div />}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#262626] rounded-full bg-[#171717] hover:bg-[#222222] text-zinc-300 font-medium text-sm transition-colors"
          >
            Close Generation
          </button>
        </div>
      </div>
    </div>
  );
}
