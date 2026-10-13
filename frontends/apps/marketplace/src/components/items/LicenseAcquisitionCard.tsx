'use client';

import React from 'react';
import { CheckCircle2, KeyRound, Copy, Check, ExternalLink } from 'lucide-react';
import { formatCurrency } from '@razor/ui-kit';
import type { MarketplaceItemPayload, EngineInstancePayload } from '@razor/api-client';

export interface LicenseAcquisitionCardProps {
  item: MarketplaceItemPayload;
  acquiredLicense: string | null;
  copiedKey: boolean;
  onCopyLicense: () => void;
  targetInstanceId: string;
  setTargetInstanceId: (id: string) => void;
  accountId: string;
  setAccountId: (id: string) => void;
  fleetInstances: EngineInstancePayload[];
  acquiring: boolean;
  onAcquire: (e: React.FormEvent) => Promise<void>;
}

export function LicenseAcquisitionCard({
  item,
  acquiredLicense,
  copiedKey,
  onCopyLicense,
  targetInstanceId,
  setTargetInstanceId,
  accountId,
  setAccountId,
  fleetInstances,
  acquiring,
  onAcquire,
}: LicenseAcquisitionCardProps) {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-6 sticky top-24">
        <div>
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block">License Price</span>
          <span className="text-3xl font-bold text-white mt-1 block font-mono">
            {item.price === 0 ? 'Free' : formatCurrency(item.price)}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-1">Perpetual enterprise deployment license</span>
        </div>

        {acquiredLicense ? (
          <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono">
              <CheckCircle2 className="w-4 h-4" />
              <span>License Acquired Successfully!</span>
            </div>

            <div>
              <label className="text-[11px] font-mono text-zinc-400 block mb-1">Assigned License Key</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={acquiredLicense}
                  className="w-full px-2.5 py-1.5 bg-zinc-950 rounded border border-zinc-800 text-xs font-mono text-zinc-200 select-all"
                />
                <button
                  onClick={onCopyLicense}
                  aria-label="Copy license key"
                  className="p-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors shrink-0"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {targetInstanceId && (
              <div className="p-2.5 rounded bg-zinc-950/80 border border-zinc-800/50 text-[11px] font-mono text-zinc-400 space-y-1">
                <span className="text-zinc-500 block">Deploying to Engine:</span>
                <span className="text-indigo-400 font-semibold block">{targetInstanceId}</span>
              </div>
            )}

            <a
              href="http://localhost:3002/instances"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-indigo-400 hover:text-indigo-300 pt-1"
            >
              <span>View in Operator Dashboard</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <form onSubmit={onAcquire} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">
                Trading Account ID <span className="text-rose-400">*</span>
              </label>
              <input
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                type="text"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">
                Deploy to Engine Instance
              </label>
              {fleetInstances.length > 0 ? (
                <select
                  value={targetInstanceId}
                  onChange={(e) => setTargetInstanceId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">No immediate deployment</option>
                  {fleetInstances.map((inst) => (
                    <option key={inst.instanceId} value={inst.instanceId}>
                      {inst.name || inst.instanceId} ({inst.status})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={targetInstanceId}
                  onChange={(e) => setTargetInstanceId(e.target.value)}
                  type="text"
                  placeholder="e.g. inst-12345"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              )}
            </div>

            <button
              type="submit"
              disabled={acquiring}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs font-mono transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <KeyRound className="w-4 h-4" />
              <span>{acquiring ? 'Generating License...' : 'Acquire License & Deploy'}</span>
            </button>

            <p className="text-[11px] text-zinc-500 leading-relaxed font-mono">
              Generating a license issues a cryptographic key tied to your account. The target engine will load the manifest automatically via profile slots.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
