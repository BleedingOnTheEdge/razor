'use client';

import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

export interface CompleteRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  netProfit: string;
  setNetProfit: (val: string) => void;
  totalReturn: string;
  setTotalReturn: (val: string) => void;
  sharpeRatio: string;
  setSharpeRatio: (val: string) => void;
  maxDrawdown: string;
  setMaxDrawdown: (val: string) => void;
  tradeCount: string;
  setTradeCount: (val: string) => void;
  bestFitness: string;
  setBestFitness: (val: string) => void;
  submittingComplete: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function CompleteRunModal({
  isOpen,
  onClose,
  netProfit,
  setNetProfit,
  totalReturn,
  setTotalReturn,
  sharpeRatio,
  setSharpeRatio,
  maxDrawdown,
  setMaxDrawdown,
  tradeCount,
  setTradeCount,
  bestFitness,
  setBestFitness,
  submittingComplete,
  onSubmit,
}: CompleteRunModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="complete-modal-title"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white border border-zinc-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <h3 id="complete-modal-title" className="text-base font-bold text-zinc-900 font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Submit Final Run Metrics</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 text-xs font-mono"
          >
            ✕ Cancel
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs font-mono">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-700 mb-1 font-semibold">Net Profit ($)</label>
              <input
                type="number"
                step="0.01"
                value={netProfit}
                onChange={(e) => setNetProfit(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-zinc-700 mb-1 font-semibold">Total Return (Ratio)</label>
              <input
                type="number"
                step="0.0001"
                value={totalReturn}
                onChange={(e) => setTotalReturn(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-700 mb-1 font-semibold">Sharpe Ratio</label>
              <input
                type="number"
                step="0.01"
                value={sharpeRatio}
                onChange={(e) => setSharpeRatio(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-zinc-700 mb-1 font-semibold">Max Drawdown (Ratio)</label>
              <input
                type="number"
                step="0.001"
                value={maxDrawdown}
                onChange={(e) => setMaxDrawdown(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-700 mb-1 font-semibold">Trade Count</label>
              <input
                type="number"
                value={tradeCount}
                onChange={(e) => setTradeCount(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-zinc-700 mb-1 font-semibold">Best Fitness</label>
              <input
                type="number"
                step="0.001"
                value={bestFitness}
                onChange={(e) => setBestFitness(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-lg text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingComplete}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-2 shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{submittingComplete ? 'Completing...' : 'Confirm & Complete Run'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
