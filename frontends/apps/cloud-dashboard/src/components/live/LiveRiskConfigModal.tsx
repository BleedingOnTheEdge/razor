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
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 font-mono text-xs"
      onClick={onClose}
    >
      <div
        className="bg-white border border-black max-w-md w-full p-6 space-y-5 text-black"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-black">
          <div>
            <h3 className="text-base font-bold text-black uppercase">
              Dynamic Risk Limits (1107)
            </h3>
            <p className="text-xs text-zinc-600 mt-0.5">
              Circuit breaker loss ceilings and position caps
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white font-bold"
          >
            [CLOSE]
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-black font-bold mb-1">Max Daily Drawdown (%)</label>
            <input
              type="number"
              step="0.1"
              value={maxDailyDrawdown}
              onChange={(e) => setMaxDailyDrawdown(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono focus:outline-none"
              required
            />
            <span className="text-[10px] text-zinc-600">Halts orders if daily peak-to-trough exceeds this %.</span>
          </div>

          <div>
            <label className="block text-black font-bold mb-1">Max Concurrent Open Positions</label>
            <input
              type="number"
              value={maxPositions}
              onChange={(e) => setMaxPositions(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono focus:outline-none"
              required
            />
            <span className="text-[10px] text-zinc-600">Upper bound on simultaneous exposure tickets.</span>
          </div>

          <div>
            <label className="block text-black font-bold mb-1">Per-Trade Loss Cap ($)</label>
            <input
              type="number"
              value={perTradeLossCap}
              onChange={(e) => setPerTradeLossCap(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono focus:outline-none"
              required
            />
            <span className="text-[10px] text-zinc-600">Hard stop loss liquidation dollar threshold.</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-black">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-black bg-white hover:bg-black hover:text-white text-black font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDispatching}
              className="px-4 py-2 border border-black bg-black text-white hover:bg-white hover:text-black font-bold transition-colors disabled:opacity-50"
            >
              {isDispatching ? '[APPLYING...]' : 'Apply Risk Controls'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
