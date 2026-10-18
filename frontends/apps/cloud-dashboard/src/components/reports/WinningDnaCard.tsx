'use client';

import React from 'react';
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
  return (
    <div className="p-4 sm:p-6 border border-black bg-white space-y-4 font-mono text-xs">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-black">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-black uppercase">
              Winning Strategy DNA Specification
            </h3>
            <span className="px-2 py-0.5 border border-black bg-white text-green-600 font-bold">
              Fitness: {winningDna.fitness != null ? winningDna.fitness.toFixed(4) : '—'}
            </span>
          </div>
          <p className="text-black font-normal mt-1">
            Deterministic decoded parameters, configured execution slots, and chromosome genes ready for reproduction or live deployment.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCopyDna}
            className="px-3 py-1.5 border border-black bg-black text-white hover:bg-white hover:text-black font-bold transition-colors"
          >
            {copiedDna ? '[COPIED TO CLIPBOARD]' : '[COPY STRATEGY DNA]'}
          </button>

          <button
            type="button"
            onClick={() => onLaunchWithDna('Live')}
            className="px-3 py-1.5 border border-black bg-white hover:bg-green-600 hover:text-white text-black font-bold transition-colors"
          >
            [DEPLOY TO LIVE]
          </button>

          <ActionDropdown
            label="[MORE ACTIONS ▾]"
            items={[
              {
                label: '[RUN AS BACKTEST]',
                onClick: () => onLaunchWithDna('Backtest'),
              },
              {
                label: '[COPY FULL GENOME JSON]',
                onClick: onCopyDna,
              },
            ]}
          />
        </div>
      </div>

      {/* Slots & Decoded Parameters */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-black">Configured Slots:</span>
          <span className="px-2 py-0.5 border border-black bg-white text-black font-bold">
            Strategy: {winningDna.slots?.strategy || 'TrendFollowing'}
          </span>
          <span className="px-2 py-0.5 border border-black bg-white text-black font-bold">
            Broker: {winningDna.slots?.adapter || 'PaperBroker'}
          </span>
          {winningDna.execution?.symbols?.[0] && (
            <span className="px-2 py-0.5 border border-black bg-white text-black font-bold">
              Symbol: {winningDna.execution.symbols[0]}
            </span>
          )}
          {winningDna.execution?.timeframes?.[0] && (
            <span className="px-2 py-0.5 border border-black bg-white text-black font-bold">
              Timeframe: {winningDna.execution.timeframes[0]}
            </span>
          )}
        </div>

        {/* Decoded Parameter Values Grid */}
        <div>
          <h4 className="font-bold uppercase text-black mb-2">
            Decoded Strategy Parameters
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {Object.entries(winningDna.parameters || {}).map(([paramName, paramVal]) => (
              <div key={paramName} className="p-2 border border-black bg-white">
                <span className="block text-[10px] font-bold text-black uppercase">{paramName}</span>
                <span className="text-sm font-bold text-black mt-1 block">
                  {typeof paramVal === 'number' ? paramVal.toFixed(2) : String(paramVal)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Raw Genes Array */}
        {winningDna.genes && winningDna.genes.length > 0 && (
          <div className="pt-2">
            <h4 className="font-bold uppercase text-black mb-1">
              Normalized Genes Vector ({winningDna.genes.length})
            </h4>
            <div className="flex flex-wrap gap-1.5 p-2.5 border border-black bg-white">
              {winningDna.genes.map((gene, idx) => (
                <span key={idx} className="px-1.5 py-0.5 border border-black text-[11px] font-bold text-black">
                  g[{idx}]: {typeof gene === 'number' ? gene.toFixed(4) : gene}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
