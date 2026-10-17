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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold font-mono text-white">
              Dynamic Risk Limits (1107)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-zinc-400 mb-1">Max Daily Drawdown (%)</label>
            <input
              type="number"
              step="0.1"
              value={maxDailyDrawdown}
              onChange={(e) => setMaxDailyDrawdown(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              required
            />
            <span className="text-[10px] text-zinc-500">Halts orders if daily peak-to-trough exceeds this %.</span>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">Max Concurrent Open Positions</label>
            <input
              type="number"
              value={maxPositions}
              onChange={(e) => setMaxPositions(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              required
            />
            <span className="text-[10px] text-zinc-500">Upper bound on simultaneous exposure tickets.</span>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">Per-Trade Loss Cap ($)</label>
            <input
              type="number"
              value={perTradeLossCap}
              onChange={(e) => setPerTradeLossCap(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              required
            />
            <span className="text-[10px] text-zinc-500">Hard stop loss liquidation dollar threshold.</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDispatching}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold text-xs font-mono"
            >
              {isDispatching ? 'Applying...' : 'Apply Risk Controls'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
