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
  const cHeight = 140;
  const pLeft = 45;
  const pRight = 20;
  const pTop = 15;
  const pBottom = 25;
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
    <div className="p-6 bg-white border border-black space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-black">
        <div>
          <h3 className="text-sm font-bold text-black uppercase flex items-center gap-2">
            <span>Genetic Algorithm Optimization Convergence</span>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-black text-white font-bold">
              INTERACTIVE
            </span>
          </h3>
          <p className="text-xs text-black font-mono mt-0.5">
            Best and average fitness evolution across {genList.length} generations. Click any generation to inspect candidates.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-black inline-block" />
            <span className="text-black font-bold">Best Fitness</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-zinc-600 inline-block border-t border-dashed border-zinc-600" />
            <span className="text-zinc-600 font-bold">Avg Fitness</span>
          </div>
        </div>
      </div>

      {/* Convergence Curve SVG */}
      <div className="bg-black p-4 border border-black overflow-hidden">
        <svg viewBox={`0 0 ${cWidth} ${cHeight}`} className="w-full h-36 overflow-visible select-none">
          {/* Horizontal grid lines */}
          {[0, 0.5, 1].map((pct, i) => {
            const y = pTop + plotH * (1 - pct);
            const val = minFit + pct * fitSpan;
            return (
              <g key={i}>
                <line x1={pLeft} y1={y} x2={pLeft + plotW} y2={y} stroke="#333333" strokeDasharray="3 3" />
                <text x={pLeft - 6} y={y + 3} textAnchor="end" className="text-[10px] font-mono fill-zinc-400">
                  {val.toFixed(3)}
                </text>
              </g>
            );
          })}

          {/* Avg Fitness Path */}
          {avgPath && (
            <path d={avgPath} fill="none" stroke="#71717a" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.9" />
          )}

          {/* Best Fitness Path */}
          {bestPath && (
            <path d={bestPath} fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
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
                      ? 'fill-white stroke-black stroke-2'
                      : 'fill-zinc-300 hover:fill-white stroke-black stroke-1'
                  }`}
                />
              </g>
            );
          })}

          {/* X Axis generation markers */}
          {bestPoints.map((pt, i) => {
            if (genList.length > 10 && i % Math.ceil(genList.length / 10) !== 0 && i !== genList.length - 1) return null;
            return (
              <text key={`lbl-${i}`} x={pt.x} y={cHeight - 6} textAnchor="middle" className="text-[9px] font-mono fill-zinc-400">
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
              className={`p-3.5 border border-black text-left font-mono text-xs cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className={`font-bold ${isSelected ? 'text-white' : 'text-black'}`}>
                  Generation #{g.generation}
                </span>
                <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-zinc-600'}`}>
                  [INSPECT]
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className={`text-[10px] ${isSelected ? 'text-zinc-400' : 'text-zinc-600'}`}>Best:</span>
                  <span className={`font-bold ${isSelected ? 'text-white' : 'text-black'}`}>
                    {g.bestFitness.toFixed(4)}
                  </span>
                </div>
                {g.averageFitness != null && (
                  <div className="flex items-baseline justify-between text-[11px]">
                    <span className={`text-[10px] ${isSelected ? 'text-zinc-400' : 'text-zinc-600'}`}>Avg:</span>
                    <span className={`font-bold ${isSelected ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      {g.averageFitness.toFixed(4)}
                    </span>
                  </div>
                )}
                {(g.populationDiversity ?? g.diversity) != null && (
                  <div className="flex items-baseline justify-between text-[11px]">
                    <span className={`font-bold ${isSelected ? 'text-zinc-300' : 'text-black'}`}>
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
