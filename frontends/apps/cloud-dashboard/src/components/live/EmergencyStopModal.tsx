'use client';

import React from 'react';
import { AlertOctagon } from 'lucide-react';

export interface EmergencyStopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDispatching: boolean;
}

export function EmergencyStopModal({
  isOpen,
  onClose,
  onConfirm,
  isDispatching,
}: EmergencyStopModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 border border-rose-600/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-mono text-rose-400">
              CONFIRM EMERGENCY STOP
            </h3>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">
              Command 2001 Immediate Kill Switch Dispatch
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/20 text-xs font-mono text-zinc-300 space-y-2">
          <p className="font-semibold text-rose-300">
            WARNING: This action is instantaneous and irreversible.
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-400">
            <li>All active order submission loops are terminated immediately.</li>
            <li>All open market positions are liquidated / flattened on exchange book.</li>
            <li>All pending stop and limit orders are cancelled.</li>
            <li>Engine status changes to <span className="text-rose-400 font-bold">EmergencyHalt</span>.</li>
          </ul>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-medium text-zinc-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDispatching}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs shadow-lg transition-all"
          >
            {isDispatching ? 'Executing...' : 'EXECUTE EMERGENCY STOP'}
          </button>
        </div>
      </div>
    </div>
  );
}
