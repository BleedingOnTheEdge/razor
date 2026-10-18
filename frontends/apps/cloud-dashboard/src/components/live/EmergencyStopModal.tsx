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
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 font-mono text-xs"
      onClick={onClose}
    >
      <div
        className="bg-white border border-black max-w-md w-full p-6 space-y-5 text-black"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-black">
          <div>
            <h3 className="text-base font-bold text-red-600 uppercase">
              CONFIRM EMERGENCY STOP
            </h3>
            <p className="text-xs text-black mt-0.5 font-bold">
              Command 2001 Immediate Kill Switch Dispatch
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

        <div className="p-4 border border-black bg-white text-xs space-y-2">
          <p className="font-bold text-red-600 uppercase">
            WARNING: This action is instantaneous and irreversible.
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-black">
            <li>All active order submission loops are terminated immediately.</li>
            <li>All open market positions are liquidated / flattened on exchange book.</li>
            <li>All pending stop and limit orders are cancelled.</li>
            <li>Engine status changes to <span className="text-red-600 font-bold">EmergencyHalt</span>.</li>
          </ul>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-black">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-black bg-white hover:bg-black hover:text-white font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDispatching}
            className="px-4 py-2 border border-black bg-red-600 hover:bg-black text-white font-bold transition-colors disabled:opacity-50"
          >
            {isDispatching ? '[EXECUTING...]' : 'EXECUTE EMERGENCY STOP'}
          </button>
        </div>
      </div>
    </div>
  );
}
