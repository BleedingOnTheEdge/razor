'use client';

import React from 'react';
import { Play } from 'lucide-react';
import { formatHash } from '@razor/ui-kit';
import type { EngineInstancePayload } from '@/lib/api-client';

export interface LaunchRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  instances: EngineInstancePayload[];
  launchInstanceId: string;
  setLaunchInstanceId: (id: string) => void;
  launchKind: 'Backtest' | 'Optimization' | 'WalkForward';
  setLaunchKind: (kind: 'Backtest' | 'Optimization' | 'WalkForward') => void;
  launchSeed: number;
  setLaunchSeed: (seed: number) => void;
  launching: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function LaunchRunModal({
  isOpen,
  onClose,
  instances,
  launchInstanceId,
  setLaunchInstanceId,
  launchKind,
  setLaunchKind,
  launchSeed,
  setLaunchSeed,
  launching,
  onSubmit,
}: LaunchRunModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="launch-modal-title"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 id="launch-modal-title" className="text-base font-bold text-white font-mono flex items-center gap-2">
            <Play className="w-4 h-4 text-cyan-400" />
            <span>Launch New Flow Run</span>
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
            <label className="block text-zinc-300 mb-1 font-semibold">Target Engine Instance</label>
            <select
              value={launchInstanceId}
              onChange={(e) => setLaunchInstanceId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            >
              {instances.map((inst) => (
                <option key={inst.instanceId} value={inst.instanceId}>
                  {inst.name || inst.engineId} ({formatHash(inst.instanceId, 6)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-zinc-300 mb-1 font-semibold">Run Kind</label>
            <select
              value={launchKind}
              onChange={(e) => setLaunchKind(e.target.value as any)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="Backtest">Backtest (Historical Simulation)</option>
              <option value="Optimization">Optimization (Parameter Search)</option>
              <option value="WalkForward">Walk-Forward (Out-of-sample Window)</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-300 mb-1 font-semibold">Base PRNG Seed</label>
            <input
              type="number"
              value={launchSeed}
              onChange={(e) => setLaunchSeed(Number(e.target.value))}
              required
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
            <span className="text-[11px] text-zinc-500 mt-1 block">
              Seed used to initialize deterministic pseudo-random number generator.
            </span>
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
              disabled={launching}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-zinc-950 font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{launching ? 'Launching...' : 'Start Execution'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
