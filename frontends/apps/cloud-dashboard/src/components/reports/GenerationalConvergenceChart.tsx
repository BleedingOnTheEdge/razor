'use client';

import React from 'react';
import { Activity, ChevronRight, Dna } from 'lucide-react';
import type { GenerationProgressPayload } from '@/lib/api-client';

export interface GenerationalConvergenceChartProps {
  generationProgress: GenerationProgressPayload[];
  selectedGeneration: GenerationProgressPayload | null;
  onSelectGeneration: (generation: GenerationProgressPayload) => void;
}

export function GenerationalConvergenceChart({
  generationProgress,
  selectedGeneration,
  onSelectGeneration,
}: GenerationalConvergenceChartProps) {
  if (!generationProgress || generationProgress.length === 0) return null;

  const genList = generationProgress;
  const allFit = genList.flatMap((g) => [g.bestFitness, g.averageFitness].filter((v): v is number => typeof v === 'number' && Number.isFinite(v)));
  const minFit = allFit.length > 0 ? Math.min(...allFit) : 0;
  const maxFit = allFit.length > 0 ? Math.max(...allFit) : 1;
  const fitSpan = Math.max(0.0001, maxFit - minFit);

  const cWidth = 800;
  const cHeight = 160;
  const pLeft = 55;
  const pRight = 25;
  const pTop = 20;
  const pBottom = 30;
  const plotW = cWidth - pLeft - pRight;
  const plotH = cHeight - pTop - pBottom;

  const bestPoints = genList.map((g, idx) => {
    const x = pLeft + (idx / Math.max(1, genList.length - 1)) * plotW;
    const y = pTop + plotH - ((g.bestFitness - minFit) / fitSpan) * plotH;
    return { x, y, g };
  });

  const avgPoints = genList
    .map((g, idx) => {
      if (g.averageFitness == null || !Number.isFinite(g.averageFitness)) return null;
      const x = pLeft + (idx / Math.max(1, genList.length - 1)) * plotW;
      const y = pTop + plotH - ((g.averageFitness - minFit) / fitSpan) * plotH;
      return { x, y, g };
    })
    .filter((p): p is { x: number; y: number; g: GenerationProgressPayload } => p !== null);

  const bestPath = bestPoints.length > 1
    ? bestPoints.reduce((acc, curr, i) => i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`, '')
    : '';

  const avgPath = avgPoints.length > 1
    ? avgPoints.reduce((acc, curr, i) => i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`, '')
    : '';

  return (
    <div className="p-6 bg-[#171717] border border-[#262626] rounded-xl shadow-sm space-y-5 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#262626]">
        <div>
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <span>Genetic Algorithm Optimization Convergence</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Interactive
            </span>
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            Best and average fitness evolution across {genList.length} generations. Click any generation below to inspect individual chromosomes.
          </p>
        </div>
        <div className="flex items-center gap-5 text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 bg-[#3ECF8E] rounded-full inline-block" />
            <span className="text-zinc-200 font-semibold">Best Fitness</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-zinc-500 inline-block border-t border-dashed border-[#262626]" />
            <span className="text-zinc-400">Avg Fitness</span>
          </div>
        </div>
      </div>

      {/* Convergence Curve SVG Canvas */}
      <div className="bg-[#141414] p-4 rounded-xl border border-[#262626] overflow-hidden select-none">
        <svg viewBox={`0 0 ${cWidth} ${cHeight}`} className="w-full h-44 overflow-visible select-none">
          {/* Horizontal grid lines */}
          {[0, 0.5, 1].map((pct, i) => {
            const y = pTop + plotH * (1 - pct);
            const val = minFit + pct * fitSpan;
            return (
              <g key={i}>
                <line x1={pLeft} y1={y} x2={pLeft + plotW} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" />
                <text x={pLeft - 8} y={y + 4} textAnchor="end" className="text-[11px] font-mono fill-slate-500">
                  {val.toFixed(3)}
                </text>
              </g>
            );
          })}

          {/* Avg Fitness Path */}
          {avgPath && (
            <path d={avgPath} fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="5 5" opacity="0.85" />
          )}

          {/* Best Fitness Path */}
          {bestPath && (
            <path d={bestPath} fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
          )}

          {/* Interactive Points */}
          {bestPoints.map((pt) => {
            const isSelected = selectedGeneration?.generation === pt.g.generation;
            return (
              <g
                key={`pt-${pt.g.generation}`}
                className="cursor-pointer group"
                onClick={() => onSelectGeneration(pt.g)}
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 6 : 4}
                  className={`transition-all ${
                    isSelected
                      ? 'fill-indigo-600 stroke-white stroke-2'
                      : 'fill-slate-900 group-hover:fill-indigo-600 stroke-white stroke-1.5'
                  }`}
                />
              </g>
            );
          })}

          {/* X Axis generation markers */}
          {bestPoints.map((pt, i) => {
            if (genList.length > 12 && i % Math.ceil(genList.length / 10) !== 0 && i !== genList.length - 1) return null;
            return (
              <text key={`lbl-${i}`} x={pt.x} y={cHeight - 8} textAnchor="middle" className="text-[11px] font-mono fill-slate-500">
                G{pt.g.generation}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Clickable Generation Progression Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {genList.map((g) => {
          const isSelected = selectedGeneration?.generation === g.generation;
          return (
            <button
              type="button"
              key={g.generation}
              onClick={() => onSelectGeneration(g)}
              className={`p-3.5 rounded-xl border text-left font-sans text-xs cursor-pointer transition-all ${
                isSelected
                  ? 'bg-[#3ECF8E] text-[#0f0f0f] border-[#3ECF8E] shadow-md ring-2 ring-[#3ECF8E]/30'
                  : 'bg-[#171717] text-zinc-200 border-[#262626] hover:border-[#262626] hover:bg-[#141414] shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className={isSelected ? 'text-white' : 'text-zinc-100'}>
                  Generation #{g.generation}
                </span>
                <span className={`text-[11px] font-medium font-mono px-1.5 py-0.5 rounded ${isSelected ? 'bg-[#141414] text-zinc-200' : 'bg-[#1f1f1f] text-zinc-400'}`}>
                  Inspect
                </span>
              </div>
              <div className="space-y-1 font-mono text-xs">
                <div className="flex items-baseline justify-between">
                  <span className={isSelected ? 'text-zinc-500' : 'text-zinc-400'}>Best:</span>
                  <span className={`font-bold ${isSelected ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    {g.bestFitness.toFixed(4)}
                  </span>
                </div>
                {g.averageFitness != null && (
                  <div className="flex items-baseline justify-between">
                    <span className={isSelected ? 'text-zinc-500' : 'text-zinc-400'}>Avg:</span>
                    <span className={isSelected ? 'text-zinc-300' : 'text-zinc-300'}>
                      {g.averageFitness.toFixed(4)}
                    </span>
                  </div>
                )}
                {(g.populationDiversity ?? g.diversity) != null && (
                  <div className="flex items-baseline justify-between pt-1 border-t border-[#262626]">
                    <span className={`font-medium ${isSelected ? 'text-zinc-200' : 'text-zinc-300'}`}>
                      Diversity: {(g.populationDiversity ?? g.diversity)?.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
