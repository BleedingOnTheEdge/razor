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
      <Card className="p-6 border-zinc-200 bg-white shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-2">
          Fleet & Engine Execution Policies
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <label className="text-zinc-600 block mb-1 font-medium">Heartbeat Interval (sec)</label>
            <input
              type="number"
              value={settings.heartbeatIntervalSeconds}
              onChange={(e) => setSettings({ ...settings, heartbeatIntervalSeconds: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-zinc-600 block mb-1 font-medium">Heartbeat Timeout (sec)</label>
            <input
              type="number"
              value={settings.heartbeatTimeoutSeconds}
              onChange={(e) => setSettings({ ...settings, heartbeatTimeoutSeconds: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-zinc-600 block mb-1 font-medium">Max Fleet Size Per Account</label>
            <input
              type="number"
              value={settings.maxFleetSizePerAccount}
              onChange={(e) => setSettings({ ...settings, maxFleetSizePerAccount: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-zinc-600 block mb-1 font-medium">Command Queue Expiry (sec)</label>
            <input
              type="number"
              value={settings.commandQueueExpirySeconds}
              onChange={(e) => setSettings({ ...settings, commandQueueExpirySeconds: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </Card>

      {/* Security & Access */}
      <Card className="p-6 border-zinc-200 bg-white shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-2">
          Security & Access Control
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <label className="text-zinc-600 block mb-1 font-medium">Enforce Key Rotation (days)</label>
            <input
              type="number"
              value={settings.enforceStrictKeyRotationDays}
              onChange={(e) => setSettings({ ...settings, enforceStrictKeyRotationDays: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-zinc-600 block mb-1 font-medium">Allowed IP Ranges</label>
            <input
              type="text"
              value={settings.allowedIpRanges}
              onChange={(e) => setSettings({ ...settings, allowedIpRanges: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="selfReg"
              checked={settings.allowSelfRegistration}
              onChange={(e) => setSettings({ ...settings, allowSelfRegistration: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-300 text-cyan-600 cursor-pointer"
            />
            <label htmlFor="selfReg" className="text-zinc-700 cursor-pointer">Allow Public Self-Registration</label>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="mfa"
              checked={settings.requireMfaForLiveTrading}
              onChange={(e) => setSettings({ ...settings, requireMfaForLiveTrading: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-300 text-cyan-600 cursor-pointer"
            />
            <label htmlFor="mfa" className="text-zinc-700 cursor-pointer">Require MFA for Live Trading</label>
          </div>
        </div>
      </Card>

      {/* Marketplace & Additives */}
      <Card className="p-6 border-zinc-200 bg-white shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-2">
          Marketplace & Additive Policies
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <label className="text-zinc-600 block mb-1 font-medium">Platform Revenue Fee (%)</label>
            <input
              type="number"
              step="0.1"
              value={settings.platformFeePercent}
              onChange={(e) => setSettings({ ...settings, platformFeePercent: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="curation"
              checked={settings.requireCurationApproval}
              onChange={(e) => setSettings({ ...settings, requireCurationApproval: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-300 text-cyan-600 cursor-pointer"
            />
            <label htmlFor="curation" className="text-zinc-700 cursor-pointer">Require Curation Approval Before Listing</label>
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
          className="gap-2 font-mono text-zinc-600 hover:text-zinc-900 border-zinc-200"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Factory Defaults</span>
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={savingSettings}
          className="gap-2 font-mono bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Cluster Policies</span>
        </Button>
      </div>
    </form>
  );
}
