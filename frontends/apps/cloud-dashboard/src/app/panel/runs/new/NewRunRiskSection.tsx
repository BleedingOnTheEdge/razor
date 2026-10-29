'use client';

import React from 'react';
import { Shield } from 'lucide-react';

export interface NewRunRiskSectionProps {
  maxDrawdownPct: number;
  setMaxDrawdownPct: (val: number) => void;
  maxPositionPct: number;
  setMaxPositionPct: (val: number) => void;
  orderRateLimit: number;
  setOrderRateLimit: (val: number) => void;
}

export function NewRunRiskSection({
  maxDrawdownPct,
  setMaxDrawdownPct,
  maxPositionPct,
  setMaxPositionPct,
  orderRateLimit,
  setOrderRateLimit,
}: NewRunRiskSectionProps) {
  return (
    <div className="p-5 border border-[#262626] bg-[#171717] space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b border-[#262626] pb-2">
        <Shield className="w-4 h-4 text-zinc-100" />
        <span>6. Risk Guardrails & Circuit Breakers</span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-zinc-100 font-bold uppercase mb-1">Max Drawdown Breach %</label>
          <input
            type="number"
            step="0.5"
            value={maxDrawdownPct}
            onChange={(e) => setMaxDrawdownPct(Number(e.target.value))}
            min={1}
            max={50}
            className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 font-mono focus:outline-none focus:border-[#3ECF8E]"
          />
        </div>

        <div>
          <label className="block text-zinc-100 font-bold uppercase mb-1">Max Position Size %</label>
          <input
            type="number"
            step="1"
            value={maxPositionPct}
            onChange={(e) => setMaxPositionPct(Number(e.target.value))}
            min={1}
            max={100}
            className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 font-mono focus:outline-none focus:border-[#3ECF8E]"
          />
        </div>

        <div>
          <label className="block text-zinc-100 font-bold uppercase mb-1">Order Rate Limit / Min</label>
          <input
            type="number"
            value={orderRateLimit}
            onChange={(e) => setOrderRateLimit(Number(e.target.value))}
            min={1}
            max={1000}
            className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 font-mono focus:outline-none focus:border-[#3ECF8E]"
          />
        </div>
      </div>
    </div>
  );
}
