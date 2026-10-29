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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans text-sm"
    >
      <div className="bg-[#171717] border border-[#262626] rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 text-zinc-100 animate-in fade-in-0 zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <h3 id="complete-modal-title" className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#3ECF8E]" />
            <span>Submit Final Run Metrics</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg border border-[#262626] text-zinc-400 hover:text-zinc-100 hover:bg-[#1f1f1f] transition-colors"
            title="Close"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-zinc-300 mb-1.5 font-medium text-xs">Net Profit ($)</label>
              <input
                type="number"
                step="0.01"
                value={netProfit}
                onChange={(e) => setNetProfit(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#262626] rounded-md text-zinc-100 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#3ECF8E]/30 focus:border-[#3ECF8E]"
              />
            </div>
            <div>
              <label className="block text-zinc-300 mb-1.5 font-medium text-xs">Total Return (Ratio)</label>
              <input
                type="number"
                step="0.0001"
                value={totalReturn}
                onChange={(e) => setTotalReturn(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#262626] rounded-md text-zinc-100 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#3ECF8E]/30 focus:border-[#3ECF8E]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-zinc-300 mb-1.5 font-medium text-xs">Sharpe Ratio</label>
              <input
                type="number"
                step="0.01"
                value={sharpeRatio}
                onChange={(e) => setSharpeRatio(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#262626] rounded-md text-zinc-100 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#3ECF8E]/30 focus:border-[#3ECF8E]"
              />
            </div>
            <div>
              <label className="block text-zinc-300 mb-1.5 font-medium text-xs">Max Drawdown (Ratio)</label>
              <input
                type="number"
                step="0.001"
                value={maxDrawdown}
                onChange={(e) => setMaxDrawdown(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#262626] rounded-md text-zinc-100 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#3ECF8E]/30 focus:border-[#3ECF8E]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-zinc-300 mb-1.5 font-medium text-xs">Trade Count</label>
              <input
                type="number"
                value={tradeCount}
                onChange={(e) => setTradeCount(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#262626] rounded-md text-zinc-100 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#3ECF8E]/30 focus:border-[#3ECF8E]"
              />
            </div>
            <div>
              <label className="block text-zinc-300 mb-1.5 font-medium text-xs">Best Fitness</label>
              <input
                type="number"
                step="0.001"
                value={bestFitness}
                onChange={(e) => setBestFitness(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#262626] rounded-md text-zinc-100 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#3ECF8E]/30 focus:border-[#3ECF8E]"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#262626] rounded-full bg-[#171717] hover:bg-[#222222] text-zinc-300 font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingComplete}
              className="px-5 py-2 bg-[#3ECF8E] hover:bg-[#34b27b] text-[#0f0f0f] rounded-full font-semibold text-sm transition-colors disabled:opacity-50"
            >
              <span>{submittingComplete ? 'Completing...' : 'Confirm & Complete Run'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
