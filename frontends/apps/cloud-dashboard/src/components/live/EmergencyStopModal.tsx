'use client';

import React from 'react';
import { AlertOctagon, X, AlertTriangle } from 'lucide-react';

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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans text-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#171717] border border-[#262626] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 text-zinc-100 animate-in fade-in-0 zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <div>
            <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-rose-400" />
              <span>CONFIRM EMERGENCY STOP</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Command 2001 Immediate Kill Switch Dispatch
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

        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs space-y-2 text-rose-300">
          <p className="font-bold flex items-center gap-1.5 text-rose-400">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>WARNING: This action is instantaneous and irreversible.</span>
          </p>
          <ul className="list-disc list-inside space-y-1 text-zinc-300">
            <li>All active order submission loops are terminated immediately.</li>
            <li>All open market positions are liquidated / flattened on exchange book.</li>
            <li>All pending stop and limit orders are cancelled.</li>
            <li>Engine status transitions to <strong className="text-rose-400">EmergencyHalt</strong>.</li>
          </ul>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262626]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-300 rounded-full font-medium text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDispatching}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-full font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {isDispatching ? 'Executing...' : 'EXECUTE EMERGENCY STOP'}
          </button>
        </div>
      </div>
    </div>
  );
}
