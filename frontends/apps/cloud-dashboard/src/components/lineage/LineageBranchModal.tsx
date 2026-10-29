'use client';

import React from 'react';
import { GitBranch, X } from 'lucide-react';

export interface LineageBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetBranchRunId: string;
  stepIndex: number;
  setStepIndex: (val: number) => void;
  childSeed: number;
  setChildSeed: (val: number) => void;
  actor: string;
  setActor: (val: string) => void;
  reason: string;
  setReason: (val: string) => void;
  modSummary: string;
  setModSummary: (val: string) => void;
  prevFingerprint: string;
  setPrevFingerprint: (val: string) => void;
  newFingerprint: string;
  setNewFingerprint: (val: string) => void;
  submittingBranch: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function LineageBranchModal({
  isOpen,
  onClose,
  targetBranchRunId,
  stepIndex,
  setStepIndex,
  childSeed,
  setChildSeed,
  actor,
  setActor,
  reason,
  setReason,
  modSummary,
  setModSummary,
  prevFingerprint,
  setPrevFingerprint,
  newFingerprint,
  setNewFingerprint,
  submittingBranch,
  onSubmit,
}: LineageBranchModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="branch-modal-title"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white border border-zinc-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <h3 id="branch-modal-title" className="text-base font-bold text-zinc-900 font-mono flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-purple-600" />
            <span>Branch Run at Checkpoint</span>
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
          <div>
            <label className="block text-zinc-600 mb-1 font-semibold">Target Parent Run ID</label>
            <input
              type="text"
              readOnly
              value={targetBranchRunId}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-500 cursor-not-allowed font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-700 mb-1 font-semibold">Fork Point Step Index</label>
              <input
                type="number"
                value={stepIndex}
                onChange={(e) => setStepIndex(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-purple-600 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-700 mb-1 font-semibold">Child Seed</label>
              <input
                type="number"
                value={childSeed}
                onChange={(e) => setChildSeed(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-purple-600 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-700 mb-1 font-semibold">Intervention Actor</label>
            <input
              type="text"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-purple-600 text-xs font-sans"
            />
          </div>

          <div>
            <label className="block text-zinc-700 mb-1 font-semibold">Intervention Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-purple-600 text-xs font-sans"
            />
          </div>

          <div>
            <label className="block text-zinc-700 mb-1 font-semibold">Modifications Summary</label>
            <textarea
              rows={2}
              value={modSummary}
              onChange={(e) => setModSummary(e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-purple-600 text-xs font-sans"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-700 mb-1 font-semibold">Previous Hash</label>
              <input
                type="text"
                value={prevFingerprint}
                onChange={(e) => setPrevFingerprint(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-purple-600 text-[10px] font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-700 mb-1 font-semibold">New Hash</label>
              <input
                type="text"
                value={newFingerprint}
                onChange={(e) => setNewFingerprint(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-purple-600 text-[10px] font-mono"
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
              disabled={submittingBranch}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-2 shadow-sm"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>{submittingBranch ? 'Spawning Branch...' : 'Create Branched Run'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
