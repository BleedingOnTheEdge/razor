'use client';

import React from 'react';
import { ShieldCheck, X } from 'lucide-react';

export interface LiveRiskConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  maxDailyDrawdown: string;
  setMaxDailyDrawdown: (val: string) => void;
  maxPositions: string;
  setMaxPositions: (val: string) => void;
  perTradeLossCap: string;
  setPerTradeLossCap: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isDispatching: boolean;
}

export function LiveRiskConfigModal({
  isOpen,
  onClose,
  maxDailyDrawdown,
  setMaxDailyDrawdown,
  maxPositions,
  setMaxPositions,
  perTradeLossCap,
  setPerTradeLossCap,
  onSubmit,
  isDispatching,
}: LiveRiskConfigModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans text-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#171717] border border-[#262626] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 text-zinc-100 animate-in fade-in-0 zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#3ECF8E]" />
              <span>Dynamic Risk Limits (1107)</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Circuit breaker loss ceilings and position caps
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg border border-[#262626] text-zinc-400 hover:text-zinc-100 hover:bg-[#1f1f1f] transition-colors"
            title="Cancel"
            aria-label="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-zinc-300 font-medium text-xs mb-1.5">Max Daily Drawdown (%)</label>
            <input
              type="number"
              step="0.1"
              value={maxDailyDrawdown}
              onChange={(e) => setMaxDailyDrawdown(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#262626] rounded-md text-zinc-100 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#3ECF8E]/30 focus:border-[#3ECF8E]"
              required
            />
            <span className="text-xs text-zinc-500 mt-1 block">Halts orders if daily peak-to-trough exceeds this %.</span>
          </div>

          <div>
            <label className="block text-zinc-300 font-medium text-xs mb-1.5">Max Concurrent Open Positions</label>
            <input
              type="number"
              value={maxPositions}
              onChange={(e) => setMaxPositions(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#262626] rounded-md text-zinc-100 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#3ECF8E]/30 focus:border-[#3ECF8E]"
              required
            />
            <span className="text-xs text-zinc-500 mt-1 block">Upper bound on simultaneous exposure tickets.</span>
          </div>

          <div>
            <label className="block text-zinc-300 font-medium text-xs mb-1.5">Per-Trade Loss Cap ($)</label>
            <input
              type="number"
              value={perTradeLossCap}
              onChange={(e) => setPerTradeLossCap(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#262626] rounded-md text-zinc-100 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#3ECF8E]/30 focus:border-[#3ECF8E]"
              required
            />
            <span className="text-xs text-zinc-500 mt-1 block">Hard stop loss liquidation dollar threshold.</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#262626] rounded-full bg-[#171717] hover:bg-[#222222] text-zinc-300 font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDispatching}
              className="px-5 py-2 bg-[#3ECF8E] hover:bg-[#34b27b] text-[#0f0f0f] rounded-full font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {isDispatching ? 'Applying Limits...' : 'Apply Risk Controls'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
