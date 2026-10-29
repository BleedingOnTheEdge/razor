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
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 font-sans text-sm"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 text-slate-900 animate-in fade-in-0 zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-rose-600 flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-rose-600" />
              <span>CONFIRM EMERGENCY STOP</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Command 2001 Immediate Kill Switch Dispatch
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-2 text-rose-900">
          <p className="font-bold flex items-center gap-1.5 text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>WARNING: This action is instantaneous and irreversible.</span>
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-700">
            <li>All active order submission loops are terminated immediately.</li>
            <li>All open market positions are liquidated / flattened on exchange book.</li>
            <li>All pending stop and limit orders are cancelled.</li>
            <li>Engine status transitions to <strong className="text-rose-700">EmergencyHalt</strong>.</li>
          </ul>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDispatching}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 shadow-sm"
          >
            {isDispatching ? 'Executing...' : 'EXECUTE EMERGENCY STOP'}
          </button>
        </div>
      </div>
    </div>
  );
}
