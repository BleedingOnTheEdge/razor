'use client';

import React from 'react';
import { SlidersHorizontal, Plus, Search } from 'lucide-react';
import { formatTimestamp, getExtensionKindBadge } from '@razor/ui-kit';
import type { EngineInstanceDetailPayload } from '@/lib/api-client';

export type ManifestExtension = EngineInstanceDetailPayload['manifest'][number];

export interface InstanceExtensionsTabProps {
  instance: EngineInstanceDetailPayload;
  manifestFilter: string;
  setManifestFilter: (val: string) => void;
  filteredManifest: ManifestExtension[];
  onOpenSlotModal: (kind: 'Adapter' | 'Strategy' | 'NeuralNetwork' | 'HookPlugin', extName?: string) => void;
}

export function InstanceExtensionsTab({
  instance,
  manifestFilter,
  setManifestFilter,
  filteredManifest,
  onOpenSlotModal,
}: InstanceExtensionsTabProps) {
  return (
    <div className="space-y-6">
      {/* Active Slots Card */}
      <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
              <span>Active Extension Profile Slots</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Zero-downtime hot-swappable slots currently occupied on this running engine.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenSlotModal('Strategy')}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold text-xs font-mono transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Configure Slot</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Adapter Slot */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400">Adapter Slot</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400">
                  Feed / Broker
                </span>
              </div>
              <span className="text-sm font-bold text-white mt-2 block font-mono">
                {instance.activeSelections?.adapter || 'None (Dormant)'}
              </span>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800/50 flex justify-end">
              <button
                type="button"
                onClick={() => onOpenSlotModal('Adapter', instance.activeSelections?.adapter || undefined)}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Hot-Swap Adapter →
              </button>
            </div>
          </div>

          {/* Strategy Slot */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400">Strategy Slot</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400">
                  Order Logic
                </span>
              </div>
              <span className="text-sm font-bold text-white mt-2 block font-mono">
                {instance.activeSelections?.strategy || 'None (Dormant)'}
              </span>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800/50 flex justify-end">
              <button
                type="button"
                onClick={() => onOpenSlotModal('Strategy', instance.activeSelections?.strategy || undefined)}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Hot-Swap Strategy →
              </button>
            </div>
          </div>

          {/* Neural Network Slot */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400">Neural Network Slot</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-400">
                  Inference
                </span>
              </div>
              <span className="text-sm font-bold text-white mt-2 block font-mono">
                {instance.activeSelections?.neuralNetwork || 'None'}
              </span>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800/50 flex justify-end">
              <button
                type="button"
                onClick={() => onOpenSlotModal('NeuralNetwork', instance.activeSelections?.neuralNetwork || undefined)}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Hot-Swap Model →
              </button>
            </div>
          </div>

          {/* Hook Plugins Slot */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400">Hook Plugins</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400">
                  Interceptors
                </span>
              </div>
              <span className="text-sm font-bold text-white mt-2 block font-mono">
                {instance.activeSelections?.hookPlugins?.length || 0} loaded
              </span>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800/50 flex justify-end">
              <button
                type="button"
                onClick={() => onOpenSlotModal('HookPlugin')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Add Hook Plugin →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Manifest Extensions Card */}
      <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono">
              Reported Extension Manifest
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              All binaries and scripts discovered and registered by the engine during bootstrap.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Filter manifest..."
                value={manifestFilter}
                onChange={(e) => setManifestFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <span className="text-xs text-zinc-400 font-mono whitespace-nowrap">
              {instance.manifest?.length || 0} registered
            </span>
          </div>
        </div>

        {!filteredManifest || filteredManifest.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-zinc-400">
            No extensions found matching your filter criteria.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {filteredManifest.map((ext: ManifestExtension, idx: number) => {
              const kindBadge = getExtensionKindBadge(ext.kind);
              return (
                <div
                  key={idx}
                  className="py-3 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${kindBadge.className}`}>
                      {kindBadge.label}
                    </span>
                    <span className="text-zinc-200 font-semibold">{ext.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-zinc-400">{formatTimestamp(ext.reportedAt)}</span>
                    <button
                      type="button"
                      onClick={() => onOpenSlotModal(ext.kind as 'Adapter' | 'Strategy' | 'NeuralNetwork' | 'HookPlugin', ext.name)}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-400 text-[11px] transition-colors"
                    >
                      Assign Slot
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
