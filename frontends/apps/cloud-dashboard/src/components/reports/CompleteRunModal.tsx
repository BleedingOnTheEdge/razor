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
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 font-mono text-xs"
    >
      <div className="bg-white border border-black max-w-lg w-full p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-black">
          <h3 id="complete-modal-title" className="text-base font-bold text-black uppercase">
            <span>Submit Final Run Metrics</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white text-black font-bold transition-colors"
          >
            ✕ Cancel
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs font-mono">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-black mb-1 font-bold">Net Profit ($)</label>
              <input
                type="number"
                step="0.01"
                value={netProfit}
                onChange={(e) => setNetProfit(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-black text-black font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-black mb-1 font-bold">Total Return (Ratio)</label>
              <input
                type="number"
                step="0.0001"
                value={totalReturn}
                onChange={(e) => setTotalReturn(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-black text-black font-mono focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-black mb-1 font-bold">Sharpe Ratio</label>
              <input
                type="number"
                step="0.01"
                value={sharpeRatio}
                onChange={(e) => setSharpeRatio(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-black text-black font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-black mb-1 font-bold">Max Drawdown (Ratio)</label>
              <input
                type="number"
                step="0.001"
                value={maxDrawdown}
                onChange={(e) => setMaxDrawdown(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-black text-black font-mono focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-black mb-1 font-bold">Trade Count</label>
              <input
                type="number"
                value={tradeCount}
                onChange={(e) => setTradeCount(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-black text-black font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-black mb-1 font-bold">Best Fitness</label>
              <input
                type="number"
                step="0.001"
                value={bestFitness}
                onChange={(e) => setBestFitness(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-black text-black font-mono focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-black">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-black bg-white hover:bg-black hover:text-white text-black font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingComplete}
              className="px-4 py-2 border border-black bg-black text-white hover:bg-white hover:text-black font-bold transition-colors disabled:opacity-50"
            >
              <span>{submittingComplete ? '[COMPLETING...]' : '[CONFIRM & COMPLETE RUN]'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
