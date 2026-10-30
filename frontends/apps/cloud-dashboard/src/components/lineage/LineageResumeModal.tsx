'use client';

import React from 'react';
import { Play, X } from 'lucide-react';

export interface LineageResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetResumeRunId: string;
  stepIndex: number;
  setStepIndex: (val: number) => void;
  actor: string;
  setActor: (val: string) => void;
  reason: string;
  setReason: (val: string) => void;
  submittingResume: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function LineageResumeModal({
  isOpen,
  onClose,
  targetResumeRunId,
  stepIndex,
  setStepIndex,
  actor,
  setActor,
  reason,
  setReason,
  submittingResume,
  onSubmit,
}: LineageResumeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-modal-title"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-[#171717] border border-[#262626] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <h3 id="resume-modal-title" className="text-base font-bold text-zinc-100 font-mono flex items-center gap-2">
            <Play className="w-4 h-4 text-[#3ECF8E]" />
            <span>Resume / Spliced Run</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-300 hover:bg-[#1f1f1f] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">Target Run ID</label>
            <input
              type="text"
              readOnly
              value={targetResumeRunId}
              className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded-lg text-zinc-500 cursor-not-allowed font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-zinc-300 mb-1 font-semibold">Resume Step Index</label>
            <input
              type="number"
              value={stepIndex}
              onChange={(e) => setStepIndex(Number(e.target.value))}
              required
              className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded-lg text-zinc-100 focus:bg-[#171717] focus:outline-none focus:border-emerald-600 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-zinc-300 mb-1 font-semibold">Actor</label>
            <input
              type="text"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded-lg text-zinc-100 focus:bg-[#171717] focus:outline-none focus:border-emerald-600 text-xs font-sans"
            />
          </div>

          <div>
            <label className="block text-zinc-300 mb-1 font-semibold">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded-lg text-zinc-100 focus:bg-[#171717] focus:outline-none focus:border-emerald-600 text-xs font-sans"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1f1f1f] hover:bg-[#262626] text-zinc-300 font-medium rounded-lg text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingResume}
              className="px-4 py-2 bg-[#3ECF8E] hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-2 shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{submittingResume ? 'Resuming...' : 'Confirm Resume / Splice'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
