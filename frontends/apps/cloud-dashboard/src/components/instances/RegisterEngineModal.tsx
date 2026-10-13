'use client';

import React from 'react';
import { Server, Plus } from 'lucide-react';

export interface RegisterEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  regAccountId: string;
  setRegAccountId: (val: string) => void;
  regLicenseId: string;
  setRegLicenseId: (val: string) => void;
  regEngineId: string;
  setRegEngineId: (val: string) => void;
  regName: string;
  setRegName: (val: string) => void;
  registering: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function RegisterEngineModal({
  isOpen,
  onClose,
  regAccountId,
  setRegAccountId,
  regLicenseId,
  setRegLicenseId,
  regEngineId,
  setRegEngineId,
  regName,
  setRegName,
  registering,
  onSubmit,
}: RegisterEngineModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-engine-title"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 id="register-engine-title" className="text-base font-bold text-white font-mono flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <span>Register Engine Instance</span>
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
            <label htmlFor="regAccountId" className="block text-zinc-300 mb-1 font-semibold">Account ID</label>
            <input
              id="regAccountId"
              type="text"
              value={regAccountId}
              onChange={(e) => setRegAccountId(e.target.value)}
              placeholder="e.g. acc-operator-default"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">Leave blank to use current signed-in account.</span>
          </div>

          <div>
            <label htmlFor="regLicenseId" className="block text-zinc-300 mb-1 font-semibold">License ID (Optional)</label>
            <input
              id="regLicenseId"
              type="text"
              value={regLicenseId}
              onChange={(e) => setRegLicenseId(e.target.value)}
              placeholder="Auto-provisioned active fleet license"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">Leave blank to use your account&apos;s fleet license automatically.</span>
          </div>

          <div>
            <label htmlFor="regEngineId" className="block text-zinc-300 mb-1 font-semibold">Engine ID (Hostname/Pod)</label>
            <input
              id="regEngineId"
              type="text"
              value={regEngineId}
              onChange={(e) => setRegEngineId(e.target.value)}
              placeholder="engine-prod-01"
              required
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label htmlFor="regName" className="block text-zinc-300 mb-1 font-semibold">Human-Readable Name</label>
            <input
              id="regName"
              type="text"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="Primary NY4 Execution Node"
              required
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
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
              disabled={registering}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-zinc-950 font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{registering ? 'Registering...' : 'Provision Engine'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
