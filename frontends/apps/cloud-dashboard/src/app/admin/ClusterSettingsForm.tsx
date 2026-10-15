'use client';

import React from 'react';
import { Card, Button } from '@razor/ui-kit';
import { RotateCcw, Save } from 'lucide-react';
import type { ClusterSettingsPayload } from '@razor/api-client';

interface ClusterSettingsFormProps {
  settings: ClusterSettingsPayload;
  setSettings: React.Dispatch<React.SetStateAction<ClusterSettingsPayload | null>>;
  savingSettings: boolean;
  onSave: (e: React.FormEvent) => void;
  onReset: () => void;
}

export function ClusterSettingsForm({
  settings,
  setSettings,
  savingSettings,
  onSave,
  onReset,
}: ClusterSettingsFormProps) {
  return (
    <form onSubmit={onSave} className="space-y-6">
      {/* Fleet Policies */}
      <Card className="p-6 border-zinc-800 bg-zinc-900/40 space-y-4">
        <h2 className="text-sm font-semibold text-white border-b border-zinc-800 pb-2">
          Fleet & Engine Execution Policies
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <label className="text-zinc-400 block mb-1">Heartbeat Interval (sec)</label>
            <input
              type="number"
              value={settings.heartbeatIntervalSeconds}
              onChange={(e) => setSettings({ ...settings, heartbeatIntervalSeconds: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="text-zinc-400 block mb-1">Heartbeat Timeout (sec)</label>
            <input
              type="number"
              value={settings.heartbeatTimeoutSeconds}
              onChange={(e) => setSettings({ ...settings, heartbeatTimeoutSeconds: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="text-zinc-400 block mb-1">Max Fleet Size Per Account</label>
            <input
              type="number"
              value={settings.maxFleetSizePerAccount}
              onChange={(e) => setSettings({ ...settings, maxFleetSizePerAccount: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="text-zinc-400 block mb-1">Command Queue Expiry (sec)</label>
            <input
              type="number"
              value={settings.commandQueueExpirySeconds}
              onChange={(e) => setSettings({ ...settings, commandQueueExpirySeconds: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
            />
          </div>
        </div>
      </Card>

      {/* Security & Access */}
      <Card className="p-6 border-zinc-800 bg-zinc-900/40 space-y-4">
        <h2 className="text-sm font-semibold text-white border-b border-zinc-800 pb-2">
          Security & Access Control
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <label className="text-zinc-400 block mb-1">Enforce Key Rotation (days)</label>
            <input
              type="number"
              value={settings.enforceStrictKeyRotationDays}
              onChange={(e) => setSettings({ ...settings, enforceStrictKeyRotationDays: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="text-zinc-400 block mb-1">Allowed IP Ranges</label>
            <input
              type="text"
              value={settings.allowedIpRanges}
              onChange={(e) => setSettings({ ...settings, allowedIpRanges: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="selfReg"
              checked={settings.allowSelfRegistration}
              onChange={(e) => setSettings({ ...settings, allowSelfRegistration: e.target.checked })}
              className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-cyan-500 cursor-pointer"
            />
            <label htmlFor="selfReg" className="text-zinc-300 cursor-pointer">Allow Public Self-Registration</label>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="mfa"
              checked={settings.requireMfaForLiveTrading}
              onChange={(e) => setSettings({ ...settings, requireMfaForLiveTrading: e.target.checked })}
              className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-cyan-500 cursor-pointer"
            />
            <label htmlFor="mfa" className="text-zinc-300 cursor-pointer">Require MFA for Live Trading</label>
          </div>
        </div>
      </Card>

      {/* Marketplace & Additives */}
      <Card className="p-6 border-zinc-800 bg-zinc-900/40 space-y-4">
        <h2 className="text-sm font-semibold text-white border-b border-zinc-800 pb-2">
          Marketplace & Additive Policies
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <label className="text-zinc-400 block mb-1">Platform Revenue Fee (%)</label>
            <input
              type="number"
              step="0.1"
              value={settings.platformFeePercent}
              onChange={(e) => setSettings({ ...settings, platformFeePercent: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
            />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="curation"
              checked={settings.requireCurationApproval}
              onChange={(e) => setSettings({ ...settings, requireCurationApproval: e.target.checked })}
              className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-cyan-500 cursor-pointer"
            />
            <label htmlFor="curation" className="text-zinc-300 cursor-pointer">Require Curation Approval Before Listing</label>
          </div>
        </div>
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-between pt-4">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onReset}
          disabled={savingSettings}
          className="gap-2 font-mono text-zinc-400 hover:text-white"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Factory Defaults</span>
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={savingSettings}
          className="gap-2 font-mono shadow-md shadow-cyan-500/20"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Cluster Policies</span>
        </Button>
      </div>
    </form>
  );
}
