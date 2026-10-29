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
      <div className="p-5 border border-[#262626] bg-[#171717] space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-zinc-100" />
              <span>Active Extension Profile Slots</span>
            </h3>
            <p className="text-xs text-zinc-100 font-normal mt-0.5 font-sans">
              Zero-downtime hot-swappable slots currently occupied on this running engine.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenSlotModal('Strategy')}
            className="px-3 py-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold text-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Configure Slot</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Adapter Slot */}
          <div className="p-4 border border-[#262626] bg-[#141414] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-100 uppercase">Adapter Slot</span>
                <span className="text-[10px] font-bold border border-[#262626] px-1.5 py-0.5 bg-[#171717] text-zinc-100 rounded-xl">
                  Feed / Broker
                </span>
              </div>
              <span className="text-sm font-bold text-zinc-100 mt-2 block">
                {instance.activeSelections?.adapter || 'None (Dormant)'}
              </span>
            </div>
            <div className="mt-4 pt-2 border-t border-[#262626] flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-100">
                {instance.activeSelections?.adapter ? '[ACTIVE]' : '[UNASSIGNED]'}
              </span>
              <button
                type="button"
                onClick={() => onOpenSlotModal('Adapter', instance.activeSelections?.adapter || undefined)}
                className="font-bold text-zinc-100 hover:underline"
              >
                [REASSIGN]
              </button>
            </div>
          </div>

          {/* Strategy Slot */}
          <div className="p-4 border border-[#262626] bg-[#141414] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-100 uppercase">Strategy Slot</span>
                <span className="text-[10px] font-bold border border-[#262626] px-1.5 py-0.5 bg-[#171717] text-zinc-100 rounded-xl">
                  Signals / Orders
                </span>
              </div>
              <span className="text-sm font-bold text-zinc-100 mt-2 block">
                {instance.activeSelections?.strategy || 'None (Dormant)'}
              </span>
            </div>
            <div className="mt-4 pt-2 border-t border-[#262626] flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-100">
                {instance.activeSelections?.strategy ? '[ACTIVE]' : '[UNASSIGNED]'}
              </span>
              <button
                type="button"
                onClick={() => onOpenSlotModal('Strategy', instance.activeSelections?.strategy || undefined)}
                className="font-bold text-zinc-100 hover:underline"
              >
                [REASSIGN]
              </button>
            </div>
          </div>

          {/* Neural Network Slot */}
          <div className="p-4 border border-[#262626] bg-[#141414] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-100 uppercase">Neural Network Slot</span>
                <span className="text-[10px] font-bold border border-[#262626] px-1.5 py-0.5 bg-[#171717] text-zinc-100 rounded-xl">
                  Weights / Inference
                </span>
              </div>
              <span className="text-sm font-bold text-zinc-100 mt-2 block">
                {instance.activeSelections?.neuralNetwork || 'None (Bypassed)'}
              </span>
            </div>
            <div className="mt-4 pt-2 border-t border-[#262626] flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-100">
                {instance.activeSelections?.neuralNetwork ? '[ACTIVE]' : '[UNASSIGNED]'}
              </span>
              <button
                type="button"
                onClick={() => onOpenSlotModal('NeuralNetwork', instance.activeSelections?.neuralNetwork || undefined)}
                className="font-bold text-zinc-100 hover:underline"
              >
                [REASSIGN]
              </button>
            </div>
          </div>

          {/* Hook Interceptors Slot */}
          <div className="p-4 border border-[#262626] bg-[#141414] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-100 uppercase">Hook Interceptors</span>
                <span className="text-[10px] font-bold border border-[#262626] px-1.5 py-0.5 bg-[#171717] text-zinc-100 rounded-xl">
                  Filters / Logging
                </span>
              </div>
              <div className="mt-2 space-y-1">
                {(instance.activeSelections?.hookPlugins || []).length === 0 ? (
                  <span className="text-sm font-bold text-zinc-100 block">None Configured</span>
                ) : (
                  (instance.activeSelections?.hookPlugins || []).map((h) => (
                    <span key={h} className="text-xs font-bold text-zinc-100 block">
                      • {h}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-[#262626] flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-100">
                {(instance.activeSelections?.hookPlugins || []).length} Active
              </span>
              <button
                type="button"
                onClick={() => onOpenSlotModal('HookPlugin')}
                className="font-bold text-zinc-100 hover:underline"
              >
                [MANAGE HOOKS]
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Manifest Inventory */}
      <div className="p-5 border border-[#262626] bg-[#171717] space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
              Reported Extension Manifest ({instance.manifest?.length || 0})
            </h3>
            <p className="text-xs text-zinc-100 font-normal mt-0.5 font-sans">
              Compiled modules reported during node initialization handshake.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={manifestFilter}
              onChange={(e) => setManifestFilter(e.target.value)}
              placeholder="Search extensions..."
              className="w-full px-3 py-1.5 border border-[#262626] bg-[#171717] text-xs font-mono text-zinc-100 focus:outline-none focus:border-[#3ECF8E]"
            />
          </div>
        </div>

        {filteredManifest.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-zinc-100 border border-[#262626]">
            [NO EXTENSIONS MATCHING QUERY]
          </div>
        ) : (
          <div className="border border-[#262626] overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#262626] bg-[#141414] font-bold text-zinc-100 uppercase">
                  <th className="p-2.5">Extension Name</th>
                  <th className="p-2.5">Kind</th>
                  <th className="p-2.5">Version</th>
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {filteredManifest.map((ext) => (
                  <tr key={ext.name} className="hover:bg-[#141414] transition-colors">
                    <td className="p-2.5 font-bold text-zinc-100">{ext.name}</td>
                    <td className="p-2.5 font-bold text-zinc-100 uppercase">[{ext.kind}]</td>
                    <td className="p-2.5 text-zinc-100">{(ext as any).version || '1.0.0'}</td>
                    <td className="p-2.5 text-zinc-100 max-w-xs truncate">{(ext as any).description || 'Standard module'}</td>
                    <td className="p-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenSlotModal(ext.kind as any, ext.name)}
                        className="px-2 py-1 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold text-[11px] transition-colors"
                      >
                        [ASSIGN TO SLOT]
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
