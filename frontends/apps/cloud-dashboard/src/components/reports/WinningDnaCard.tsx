'use client';

import React from 'react';
import { Dna, Copy, Check, Play } from 'lucide-react';
import { ActionDropdown } from '@/components/ui/ActionDropdown';
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
  const paramEntries = Object.entries(winningDna.parameters || {});

  // Chunk parameters into 3 balanced columns for wide viewports
  const chunkCount = 3;
  const chunkedParams: [string, any][][] = [[], [], []];
  paramEntries.forEach((entry, idx) => {
    chunkedParams[idx % chunkCount].push(entry);
  });

  return (
    <div className="p-5 bg-[#171717] border border-[#262626] space-y-4 font-sans text-xs text-zinc-100">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#262626]">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Dna className="w-4 h-4 text-zinc-100" />
              <span>Winning Strategy DNA Specification</span>
            </h3>
            <span className="px-2 py-0.5 border border-[#262626] bg-[#141414] font-bold text-xs">
              FITNESS: {winningDna.fitness != null ? winningDna.fitness.toFixed(4) : '—'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-sans mt-1">
            Deterministic decoded parameters, configured execution slots, and chromosome genes ready for reproduction or live deployment.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCopyDna}
            className="px-3 py-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors flex items-center gap-1.5 select-none"
          >
            {copiedDna ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#3ECF8E]" />
                <span>COPIED TO CLIPBOARD</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>COPY STRATEGY DNA</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onLaunchWithDna('Live')}
            className="px-3 py-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors flex items-center gap-1.5 select-none"
          >
            <Play className="w-3.5 h-3.5" />
            <span>DEPLOY TO LIVE</span>
          </button>

          <ActionDropdown
            label="ACTIONS ▾"
            items={[
              {
                label: 'Run as Backtest',
                onClick: () => onLaunchWithDna('Backtest'),
              },
              {
                label: 'Copy Full Genome JSON',
                onClick: onCopyDna,
              },
            ]}
          />
        </div>
      </div>

      {/* Configured Slots */}
      <div className="space-y-3">
        <div>
          <span className="font-bold uppercase text-zinc-100 block mb-1">Configured Slots</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 border border-[#262626] bg-[#141414] font-bold">
              Strategy: {winningDna.slots?.strategy || 'TrendFollowing'}
            </span>
            <span className="px-2.5 py-1 border border-[#262626] bg-[#141414] font-bold">
              Broker: {winningDna.slots?.adapter || 'PaperBroker'}
            </span>
            {winningDna.execution?.symbols?.[0] && (
              <span className="px-2.5 py-1 border border-[#262626] bg-[#141414] font-bold">
                Symbol: {winningDna.execution.symbols[0]}
              </span>
            )}
            {winningDna.execution?.timeframes?.[0] && (
              <span className="px-2.5 py-1 border border-[#262626] bg-[#141414] font-bold">
                Timeframe: {winningDna.execution.timeframes[0]}
              </span>
            )}
          </div>
        </div>

        {/* Decoded Parameter Values: Key-Value Table (2-col mobile, 4-col tablet, 6-col desktop) */}
        <div>
          <span className="font-bold uppercase text-zinc-100 block mb-2">
            Decoded Strategy Parameters ({paramEntries.length})
          </span>

          {paramEntries.length === 0 ? (
            <div className="p-4 border border-[#262626] bg-[#141414] text-center font-sans text-zinc-500">
              No decoded strategy parameters associated with this chromosome.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {chunkedParams.map((chunk, colIdx) => {
                if (chunk.length === 0) return null;
                return (
                  <div key={colIdx} className="border border-[#262626] overflow-hidden bg-[#171717]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#262626] bg-[#1f1f1f] font-bold uppercase text-[11px]">
                          <th className="py-2 px-3 text-left">Parameter Name</th>
                          <th className="py-2 px-3 text-right">Decoded Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#262626]">
                        {chunk.map(([name, val]) => (
                          <tr key={name} className="hover:bg-[#141414] transition-colors">
                            <td className="py-2 px-3 break-words whitespace-normal font-bold text-zinc-100 text-xs max-w-[160px]">
                              {name}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-zinc-100 text-xs">
                              {typeof val === 'number'
                                ? (val % 1 !== 0 ? val.toFixed(4) : val.toString())
                                : String(val)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Normalized Genes Vector */}
        {winningDna.genes && winningDna.genes.length > 0 && (
          <div className="pt-2 border-t border-[#262626]">
            <span className="font-bold uppercase text-zinc-100 block mb-2">
              Normalized Genes Vector ({winningDna.genes.length})
            </span>
            <div className="flex flex-wrap gap-1.5 p-3 border border-[#262626] bg-[#141414]">
              {winningDna.genes.map((gene, idx) => (
                <span key={idx} className="px-2 py-0.5 border border-[#262626] bg-[#171717] font-bold text-zinc-100">
                  g{idx}: {typeof gene === 'number' ? gene.toFixed(4) : gene}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
