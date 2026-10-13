'use client';

import React from 'react';
import { Play } from 'lucide-react';

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
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 id="resume-modal-title" className="text-base font-bold text-white font-mono flex items-center gap-2">
            <Play className="w-4 h-4 text-emerald-400" />
            <span>Resume / Spliced Run</span>
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 text-xs font-mono"
          >
            ✕ Cancel
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-zinc-400 mb-1">Target Run ID</label>
            <input
              type="text"
              readOnly
              value={targetResumeRunId}
              className="w-full px-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-lg text-zinc-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-zinc-300 mb-1 font-semibold">Resume Step Index</label>
            <input
              type="number"
              value={stepIndex}
              onChange={(e) => setStepIndex(Number(e.target.value))}
              required
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-zinc-300 mb-1 font-semibold">Actor</label>
            <input
              type="text"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-zinc-300 mb-1 font-semibold">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingResume}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
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
