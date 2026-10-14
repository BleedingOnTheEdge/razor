'use client';

import React from 'react';
import type { EngineInstanceDetailPayload } from '@razor/api-client';
import { SlidersHorizontal, CheckCircle2 } from 'lucide-react';

type ManifestExtension = EngineInstanceDetailPayload['manifest'][number];

export interface SlotAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSlotKind: 'Adapter' | 'Strategy' | 'NeuralNetwork' | 'HookPlugin';
  setSelectedSlotKind: (kind: 'Adapter' | 'Strategy' | 'NeuralNetwork' | 'HookPlugin') => void;
  selectedExtensionName: string;
  setSelectedExtensionName: (name: string) => void;
  isSlotActive: boolean;
  setIsSlotActive: (active: boolean) => void;
  updatingSlot: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  manifest?: ManifestExtension[];
}

export function SlotAssignmentModal({
  isOpen,
  onClose,
  selectedSlotKind,
  setSelectedSlotKind,
  selectedExtensionName,
  setSelectedExtensionName,
  isSlotActive,
  setIsSlotActive,
  updatingSlot,
  onSubmit,
  manifest,
}: SlotAssignmentModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="slot-modal-title"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 id="slot-modal-title" className="text-base font-bold text-white font-mono flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <span>Configure Extension Slot</span>
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
            <label className="block text-zinc-300 mb-1 font-semibold">Slot Kind</label>
            <select
              value={selectedSlotKind}
              onChange={(e) => setSelectedSlotKind(e.target.value as any)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="Adapter">Adapter (Feed / Broker)</option>
              <option value="Strategy">Strategy (Order Logic)</option>
              <option value="NeuralNetwork">Neural Network (ONNX Model)</option>
              <option value="HookPlugin">Hook Plugin</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-300 mb-1 font-semibold">Extension Name</label>
            <input
              type="text"
              value={selectedExtensionName}
              onChange={(e) => setSelectedExtensionName(e.target.value)}
              placeholder="e.g. BinanceFuturesAdapter, TrendFollower"
              required
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />

            {manifest && manifest.length > 0 && (
              <div className="mt-2 space-y-1">
                <span className="text-[11px] text-zinc-500">From Manifest:</span>
                <div className="flex flex-wrap gap-1">
                  {manifest
                    .filter((m: ManifestExtension) => m.kind === selectedSlotKind || selectedSlotKind === 'HookPlugin')
                    .map((m: ManifestExtension, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedExtensionName(m.name)}
                        className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] transition-colors"
                      >
                        {m.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={isSlotActive}
              onChange={(e) => setIsSlotActive(e.target.checked)}
              className="rounded border-zinc-800 bg-zinc-950 text-cyan-600 focus:ring-0"
            />
            <label htmlFor="isActiveCheck" className="text-zinc-300 font-sans cursor-pointer">
              Activate slot immediately on engine
            </label>
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
              disabled={updatingSlot}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-zinc-950 font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{updatingSlot ? 'Saving...' : 'Apply Slot Selection'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
