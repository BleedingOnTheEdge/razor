'use client';

import React, { useState } from 'react';
import { Camera, Dna, CheckCircle2, AlertTriangle, ShieldCheck, Plus, History } from 'lucide-react';
import type { BundleSnapshotPayload, BundleDnaPayload } from '@/types/bundle';

export interface BundleSnapshotPanelProps {
  snapshots: BundleSnapshotPayload[];
  onCreateSnapshot: (version: string, name: string) => void;
  onAttachDna?: (snapshotId: string, dna: Partial<BundleDnaPayload>) => void;
}

export function BundleSnapshotPanel({
  snapshots,
  onCreateSnapshot,
  onAttachDna,
}: BundleSnapshotPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newVersion, setNewVersion] = useState(`v1.${snapshots.length + 1}.0`);
  const [newName, setNewName] = useState('');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>(
    snapshots.length > 0 ? snapshots[0].id : ''
  );

  const activeSnapshot = snapshots.find((s) => s.id === selectedSnapshotId) || snapshots[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion.trim()) return;
    onCreateSnapshot(newVersion.trim(), newName.trim());
    setIsCreating(false);
    setNewName('');
    setNewVersion(`v1.${snapshots.length + 2}.0`);
  };

  const getStatusBadge = (status: BundleDnaPayload['backtestStatus']) => {
    switch (status) {
      case 'Backtested':
        return (
          <span className="px-2 py-0.5 border border-green-600 bg-green-50 text-green-700 font-bold text-[10px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-600" />
            <span>BACKTESTED</span>
          </span>
        );
      case 'Tested':
        return (
          <span className="px-2 py-0.5 border border-blue-600 bg-blue-50 text-blue-700 font-bold text-[10px] flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-blue-600" />
            <span>TESTED</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 border border-zinc-400 bg-zinc-100 text-zinc-600 font-bold text-[10px] flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-zinc-500" />
            <span>UNTESTED</span>
          </span>
        );
    }
  };

  return (
    <div className="border border-black bg-white p-5 font-mono space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-black" />
          <div>
            <span className="font-bold text-sm text-black uppercase tracking-wider block">
              Bundle Snapshots & Lineage DNAs
            </span>
            <span className="text-xs text-zinc-600 font-sans mt-0.5 block">
              Immutable state changes capturing slots, hooks, and verified chromosomes.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating(!isCreating)}
          className="px-3 py-1.5 border border-black bg-black text-white hover:bg-zinc-800 text-xs font-bold uppercase flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>{isCreating ? 'Cancel' : 'Capture Snapshot'}</span>
        </button>
      </div>

      {/* Snapshot Creator Form */}
      {isCreating && (
        <form onSubmit={handleCreate} className="p-4 border border-black bg-zinc-50 space-y-3">
          <span className="text-xs font-bold uppercase text-black block">
            Record New Snapshot
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase mb-1">Version Tag</label>
              <input
                type="text"
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                placeholder="v1.0.0"
                required
                className="w-full px-3 py-1.5 border border-black bg-white text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase mb-1">Snapshot Label</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="E.g. Pre-Deployment Baseline"
                className="w-full px-3 py-1.5 border border-black bg-white text-xs font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-1.5 border border-black bg-black text-white text-xs font-bold hover:bg-zinc-800"
            >
              SAVE SNAPSHOT
            </button>
          </div>
        </form>
      )}

      {/* Snapshot History Grid & Active Detail */}
      {snapshots.length === 0 ? (
        <div className="py-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-300">
          No snapshots recorded yet. Click &quot;Capture Snapshot&quot; to freeze the current configuration.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Version Chips */}
          <div className="flex flex-wrap gap-2">
            {snapshots.map((snap) => (
              <button
                key={snap.id}
                type="button"
                onClick={() => setSelectedSnapshotId(snap.id)}
                className={`px-3 py-1.5 border text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  activeSnapshot?.id === snap.id
                    ? 'border-black bg-black text-white'
                    : 'border-black bg-white hover:bg-zinc-100 text-black'
                }`}
              >
                <span>{snap.version}</span>
                {snap.name && <span className="opacity-70 font-normal">({snap.name})</span>}
              </button>
            ))}
          </div>

          {/* Active Snapshot Inspection */}
          {activeSnapshot && (
            <div className="border border-black p-4 space-y-3 bg-zinc-50">
              <div className="flex items-center justify-between pb-2 border-b border-black">
                <div>
                  <span className="font-bold text-xs uppercase block">
                    Snapshot {activeSnapshot.version} — {activeSnapshot.name || 'Unnamed State'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-sans">
                    Captured on {new Date(activeSnapshot.createdAt).toLocaleString()}
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 border border-black bg-white font-bold">
                  {activeSnapshot.dnas?.length || 0} ATTACHED DNAs
                </span>
              </div>

              {/* Attached DNAs */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-black uppercase flex items-center gap-1">
                  <Dna className="w-3.5 h-3.5 text-black" />
                  <span>Chromosomes & Backtest Reports</span>
                </span>

                {!activeSnapshot.dnas || activeSnapshot.dnas.length === 0 ? (
                  <div className="py-4 text-center text-xs text-zinc-500 border border-dashed border-zinc-300 bg-white">
                    No parameter DNAs attached to this snapshot.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeSnapshot.dnas.map((dna) => (
                      <div
                        key={dna.id}
                        className="p-3 border border-black bg-white space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-black truncate max-w-[150px]">
                            {dna.name || dna.dnaId}
                          </span>
                          {getStatusBadge(dna.backtestStatus)}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-zinc-100">
                          <div>
                            <span className="text-zinc-500 block text-[9px] uppercase">Fitness</span>
                            <span className="font-bold font-mono">
                              {dna.fitness !== null && dna.fitness !== undefined
                                ? dna.fitness.toFixed(3)
                                : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[9px] uppercase">Net Profit</span>
                            <span className="font-bold font-mono text-green-700">
                              {dna.netProfit !== null && dna.netProfit !== undefined
                                ? `$${dna.netProfit.toLocaleString()}`
                                : 'N/A'}
                            </span>
                          </div>
                        </div>

                        {dna.reportSummary && (
                          <p className="text-[10px] text-zinc-600 font-sans border-t border-zinc-100 pt-1 line-clamp-2">
                            {dna.reportSummary}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
