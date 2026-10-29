'use client';

import React from 'react';
import { Layers } from 'lucide-react';

export interface NewRunWalkForwardSectionProps {
  inSamplePct: number;
  setInSamplePct: (val: number) => void;
  outOfSamplePct: number;
  setOutOfSamplePct: (val: number) => void;
  windowSplits: number;
  setWindowSplits: (val: number) => void;
}

export function NewRunWalkForwardSection({
  inSamplePct,
  setInSamplePct,
  outOfSamplePct,
  setOutOfSamplePct,
  windowSplits,
  setWindowSplits,
}: NewRunWalkForwardSectionProps) {
  return (
    <div className="p-5 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b border-[#262626] pb-2">
        <Layers className="w-4 h-4 text-zinc-100" />
        <span>5. Walk-Forward Window Partitioning</span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-zinc-100 font-bold uppercase mb-1">In-Sample Training %</label>
          <input
            type="number"
            value={inSamplePct}
            onChange={(e) => {
              const val = Number(e.target.value);
              setInSamplePct(val);
              if (val >= 1 && val <= 99) {
                setOutOfSamplePct(100 - val);
              }
            }}
            min={1}
            max={99}
            className="w-full px-3 py-2 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 font-mono focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
          />
        </div>

        <div>
          <label className="block text-zinc-100 font-bold uppercase mb-1">Out-of-Sample Test %</label>
          <input
            type="number"
            value={outOfSamplePct}
            onChange={(e) => {
              const val = Number(e.target.value);
              setOutOfSamplePct(val);
              if (val >= 1 && val <= 99) {
                setInSamplePct(100 - val);
              }
            }}
            min={1}
            max={99}
            className="w-full px-3 py-2 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 font-mono focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
          />
        </div>

        <div>
          <label className="block text-zinc-100 font-bold uppercase mb-1">Number of Splits</label>
          <input
            type="number"
            value={windowSplits}
            onChange={(e) => setWindowSplits(Number(e.target.value))}
            min={2}
            max={20}
            className="w-full px-3 py-2 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 font-mono focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
          />
        </div>
      </div>
    </div>
  );
}
