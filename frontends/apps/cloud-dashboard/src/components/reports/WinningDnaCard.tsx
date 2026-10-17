'use client';

import React from 'react';
import { Dna, Play, Zap, Check, Copy, Sliders } from 'lucide-react';
import type { WinningDnaPayload } from '@/lib/api-client';

export interface WinningDnaCardProps {
  winningDna: WinningDnaPayload;
  copiedDna: boolean;
  onCopyDna: () => void;
  onLaunchWithDna: (kind: 'Backtest' | 'Live') => void;
}

export function WinningDnaCard({
  winningDna,
  copiedDna,
  onCopyDna,
  onLaunchWithDna,
}: WinningDnaCardProps) {
  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50/70 via-white to-zinc-50 border border-purple-200 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-purple-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-sm">
            <Dna className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <span>Winning Strategy DNA Specification</span>
              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-mono font-semibold">
                Fitness: {winningDna.fitness != null ? winningDna.fitness.toFixed(4) : '—'}
              </span>
            </h3>
            <p className="text-xs text-zinc-500 font-sans mt-0.5">
              Deterministic decoded parameters, execution slots, and chromosome genes ready for reproduction or live deployment.
            </p>
          </div>
        </div>

        {/* 1-Click Action Buttons */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={() => onLaunchWithDna('Backtest')}
            className="px-3.5 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run as Backtest</span>
          </button>

          <button
            type="button"
            onClick={() => onLaunchWithDna('Live')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Deploy to Live</span>
          </button>

          <button
            type="button"
            onClick={onCopyDna}
            className="px-3 py-2 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 transition-colors flex items-center gap-1.5 font-medium shadow-xs"
          >
            {copiedDna ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
            <span>{copiedDna ? 'Copied JSON' : 'Copy DNA JSON'}</span>
          </button>
        </div>
      </div>

      {/* Slots & Decoded Parameters */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-zinc-500">Configured Slots:</span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-zinc-800 font-semibold">
            Strategy: {winningDna.slots?.strategy || 'TrendFollowing'}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-zinc-800 font-semibold">
            Broker: {winningDna.slots?.adapter || 'PaperBroker'}
          </span>
          {winningDna.execution?.symbols?.[0] && (
            <span className="px-2.5 py-1 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-800 font-semibold">
              Symbol: {winningDna.execution.symbols[0]}
            </span>
          )}
          {winningDna.execution?.timeframes?.[0] && (
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-semibold">
              Timeframe: {winningDna.execution.timeframes[0]}
            </span>
          )}
        </div>

        {/* Decoded Parameter Values Grid */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider font-mono text-zinc-600 mb-2 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-purple-600" />
            <span>Decoded Strategy Parameters</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {Object.entries(winningDna.parameters || {}).map(([paramName, paramVal]) => (
              <div key={paramName} className="p-2.5 rounded-xl bg-white border border-zinc-200/90 text-xs font-mono shadow-xs">
                <span className="text-[11px] text-zinc-400 block truncate" title={paramName}>
                  {paramName}
                </span>
                <span className="text-sm font-bold text-zinc-900 mt-0.5 block">
                  {typeof paramVal === 'number' ? (Number.isInteger(paramVal) ? paramVal : paramVal.toFixed(3)) : String(paramVal)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Raw Ordered Chromosome Genes */}
        {winningDna.genes && winningDna.genes.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                Chromosome Gene Sequence ({winningDna.genes.length} Genes)
              </span>
            </div>
            <div className="p-3 bg-zinc-900 rounded-xl font-mono text-xs text-zinc-200 overflow-x-auto flex flex-wrap gap-2">
              {winningDna.genes.map((g, idx) => (
                <span key={`gene-${idx}`} className="px-2 py-0.5 rounded bg-zinc-800 text-cyan-400 border border-zinc-700 text-[11px]">
                  <span className="text-zinc-500 mr-1">g{idx}:</span>
                  {typeof g === 'number' ? g.toFixed(4) : String(g)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
