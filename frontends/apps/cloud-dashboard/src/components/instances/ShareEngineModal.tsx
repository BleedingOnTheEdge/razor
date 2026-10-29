'use client';

import React, { useState, useEffect } from 'react';
import { getApiBaseUrl, getAuthHeaders } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { formatTimestamp, formatHash } from '@razor/ui-kit';

export interface EngineShareItem {
  id: string;
  engineInstanceId: string;
  ownerAccountId: string;
  sharedWithUserId?: string | null;
  sharedWithEmail: string;
  createdAt: string;
  expiresAtUtc: string;
  canRead: boolean;
  canControl: boolean;
  canRunFlows: boolean;
  isExpired: boolean;
}

export interface ShareEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string;
  instanceName: string;
}

export function ShareEngineModal({
  isOpen,
  onClose,
  instanceId,
  instanceName,
}: ShareEngineModalProps) {
  const toast = useToast();
  const [shares, setShares] = useState<EngineShareItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [recipientEmail, setRecipientEmail] = useState('');
  const [durationHours, setDurationHours] = useState('24');
  const [canRead, setCanRead] = useState(true);
  const [canControl, setCanControl] = useState(true);
  const [canRunFlows, setCanRunFlows] = useState(true);

  async function loadShares() {
    if (!instanceId) return;
    setLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();
      const res = await fetch(`${baseUrl}/api/instances/${instanceId}/shares`, { headers });
      if (res.ok) {
        const data = await res.json();
        setShares(data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen && instanceId) {
      loadShares();
    }
  }, [isOpen, instanceId]);

  async function handleCreateShare(e: React.FormEvent) {
    e.preventDefault();
    if (!recipientEmail.trim()) {
      toast.error('Email Required', 'Provide the developer or trader email to share this engine with.');
      return;
    }

    setSubmitting(true);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
      const hours = Math.max(1, parseInt(durationHours, 10) || 24);
      const expiresAtUtc = new Date(Date.now() + hours * 3600 * 1000).toISOString();

      const res = await fetch(`${baseUrl}/api/instances/${instanceId}/shares`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sharedWithEmail: recipientEmail.trim(),
          expiresAtUtc,
          canRead,
          canControl,
          canRunFlows,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned ${res.status}`);
      }

      toast.success('Engine Shared', `Temporary access granted to ${recipientEmail} for ${hours} hours.`);
      setRecipientEmail('');
      await loadShares();
    } catch (err) {
      toast.error('Sharing Failed', err instanceof Error ? err.message : 'Unable to create engine share grant.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevokeShare(shareId: string) {
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();
      const res = await fetch(`${baseUrl}/api/instances/${instanceId}/shares/${shareId}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        toast.success('Share Revoked', 'Delegation grant was cancelled.');
        await loadShares();
      } else {
        toast.error('Revocation Error', 'Failed to revoke delegation.');
      }
    } catch (err) {
      toast.error('Revocation Error', err instanceof Error ? err.message : 'Error reaching Cloud API.');
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 font-mono text-xs">
      <div className="w-full max-w-2xl bg-[#171717] border border-[#262626] p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
          <div>
            <h2 className="text-base font-bold text-zinc-100 uppercase">
              Temporary Engine Sharing Delegation
            </h2>
            <p className="text-zinc-100 font-normal mt-1">
              Grant temporary control and strategy execution permissions on <strong>{instanceName}</strong> ({formatHash(instanceId, 8)}).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors"
          >
            [CLOSE]
          </button>
        </div>

        {/* Create Share Form */}
        <form onSubmit={handleCreateShare} className="space-y-4 p-4 border border-[#262626] bg-[#171717]">
          <h3 className="font-bold text-zinc-100 uppercase">Grant New Temporary Delegation</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-zinc-100 mb-1">Recipient User Email</label>
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="developer@quant-firm.com"
                className="w-full px-3 py-2 border border-[#262626] bg-[#171717] text-zinc-100 rounded-xl font-mono focus:outline-none focus:border-[#3ECF8E]"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-100 mb-1">Access Duration</label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className="w-full px-3 py-2 border border-[#262626] bg-[#171717] text-zinc-100 rounded-xl font-mono font-bold focus:outline-none focus:border-[#3ECF8E]"
              >
                <option value="1">1 Hour (Quick Debug)</option>
                <option value="6">6 Hours (Half Day)</option>
                <option value="24">24 Hours (1 Day)</option>
                <option value="72">72 Hours (3 Days)</option>
                <option value="168">7 Days (1 Week)</option>
                <option value="720">30 Days (1 Month)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={canRead}
                onChange={(e) => setCanRead(e.target.checked)}
                className="w-4 h-4 accent-black"
              />
              <span>View Telemetry & Status</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={canControl}
                onChange={(e) => setCanControl(e.target.checked)}
                className="w-4 h-4 accent-black"
              />
              <span>Operational Control (Pause/Resume/Config)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={canRunFlows}
                onChange={(e) => setCanRunFlows(e.target.checked)}
                className="w-4 h-4 accent-black"
              />
              <span>Launch Flow Runs (Backtest/Live)</span>
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium font-bold transition-colors disabled:opacity-50"
            >
              {submitting ? '[CREATING GRANT...]' : '[DELEGATE TEMPORARY ACCESS]'}
            </button>
          </div>
        </form>

        {/* Active Shares List */}
        <div className="space-y-3">
          <h3 className="font-bold text-zinc-100 uppercase">Active Temporary Delegations</h3>
          {loading ? (
            <div className="py-6 text-center text-zinc-100 font-bold border border-[#262626]">
              [FETCHING ACTIVE DELEGATIONS...]
            </div>
          ) : shares.length === 0 ? (
            <div className="py-6 text-center text-zinc-100 font-normal border border-[#262626]">
              No active delegations on this Engine instance. This engine is private to you.
            </div>
          ) : (
            <div className="border border-[#262626] overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#262626] bg-[#171717]">
                    <th className="p-2 font-bold text-zinc-100">Recipient</th>
                    <th className="p-2 font-bold text-zinc-100">Permissions</th>
                    <th className="p-2 font-bold text-zinc-100">Expires At</th>
                    <th className="p-2 font-bold text-zinc-100">Status</th>
                    <th className="p-2 font-bold text-zinc-100 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {shares.map((share) => (
                    <tr key={share.id} className="border-b border-[#262626] hover:bg-[#141414]">
                      <td className="p-2 font-bold text-zinc-100">{share.sharedWithEmail}</td>
                      <td className="p-2">
                        {[
                          share.canRead && 'Read',
                          share.canControl && 'Control',
                          share.canRunFlows && 'FlowRuns',
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </td>
                      <td className="p-2">{formatTimestamp(share.expiresAtUtc)}</td>
                      <td className="p-2">
                        {share.isExpired ? (
                          <span className="text-rose-400 font-bold">[EXPIRED]</span>
                        ) : (
                          <span className="text-[#3ECF8E] font-bold">[ACTIVE]</span>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRevokeShare(share.id)}
                          className="px-2 py-1 border border-[#262626] bg-[#171717] hover:bg-red-600 hover:text-white text-zinc-100 font-bold transition-colors"
                        >
                          [REVOKE]
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
    </div>
  );
}
