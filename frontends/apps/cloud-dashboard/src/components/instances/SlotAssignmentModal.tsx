'use client';

import React from 'react';
import type { EngineInstanceDetailPayload } from '@razor/api-client';
import { SlidersHorizontal, CheckCircle2, ShoppingBag, ExternalLink } from 'lucide-react';
import { Badge, Button } from '@razor/ui-kit';

type ManifestExtension = EngineInstanceDetailPayload['manifest'][number];

export interface SlotAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId?: string;
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
  instanceId,
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

  const marketplaceUrl = `/marketplace/items?targetEngineId=${instanceId || ''}&slot=${selectedSlotKind}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="slot-modal-title"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="bg-white border border-zinc-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <h3 id="slot-modal-title" className="text-base font-bold text-zinc-900 font-mono flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-600" />
            <span>Configure Extension Slot</span>
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 text-xs font-mono p-1 rounded-lg hover:bg-zinc-100"
          >
            ✕ Cancel
          </button>
        </div>

        {/* Marketplace Banner */}
        <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-indigo-950 font-mono">
                Browse Marketplace Additives
              </p>
              <p className="text-[11px] text-indigo-700">
                Pick verified {selectedSlotKind} additives and assign directly with one click.
              </p>
            </div>
          </div>
          <a
            href={marketplaceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-mono font-medium shadow-sm transition-colors shrink-0"
          >
            <span>Marketplace</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-zinc-700 mb-1 font-semibold">Slot Kind</label>
            <select
              value={selectedSlotKind}
              onChange={(e) => setSelectedSlotKind(e.target.value as any)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:border-cyan-500"
            >
              <option value="Adapter">Adapter (Feed / Broker)</option>
              <option value="Strategy">Strategy (Order Logic)</option>
              <option value="NeuralNetwork">Neural Network (ONNX Model)</option>
              <option value="HookPlugin">Hook Plugin</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-700 mb-1 font-semibold">Extension Name</label>
            <input
              type="text"
              value={selectedExtensionName}
              onChange={(e) => setSelectedExtensionName(e.target.value)}
              placeholder="e.g. BinanceFuturesAdapter, TrendFollower"
              required
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:border-cyan-500 font-mono"
            />

            {manifest && manifest.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                <span className="text-[11px] text-zinc-500 font-medium">Discovered on Engine Node:</span>
                <div className="flex flex-wrap gap-1.5">
                  {manifest
                    .filter((m: ManifestExtension) => m.kind === selectedSlotKind || selectedSlotKind === 'HookPlugin')
                    .map((m: ManifestExtension, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedExtensionName(m.name)}
                        className={`px-2.5 py-1 rounded-md text-[11px] transition-all font-mono border ${
                          selectedExtensionName === m.name
                            ? 'bg-cyan-100 border-cyan-300 text-cyan-900 font-semibold'
                            : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-700'
                        }`}
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
              className="rounded border-zinc-300 text-cyan-600 focus:ring-0"
            />
            <label htmlFor="isActiveCheck" className="text-zinc-700 font-sans cursor-pointer">
              Activate slot immediately on engine
            </label>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 text-xs font-mono"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={updatingSlot || !selectedExtensionName.trim()}
              className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-mono px-4 py-2"
            >
              {updatingSlot ? 'Configuring Slot...' : 'Save Slot Assignment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
