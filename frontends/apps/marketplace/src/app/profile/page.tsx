'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiClient } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/components/ui/toast';
import { formatTimestamp, formatHash, formatCurrency } from '@razor/ui-kit';
import {
  User,
  Shield,
  Key,
  ShoppingBag,
  Zap,
  Mail,
  FileText,
  Save,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  Edit3,
} from 'lucide-react';
import type { UserProfilePayload } from '@razor/api-client';

interface MarketplaceAcquisition {
  id: string;
  itemId?: string;
  itemName?: string;
  licenseKey?: string;
  acquiredAt?: string;
}

export default function MarketplaceUserProfilePage() {
  const { success, error: toastError, info } = useToast();
  const { user: authUser, logout } = useAuth();

  const [profile, setProfile] = useState<UserProfilePayload | null>(null);
  const [acquisitions, setAcquisitions] = useState<MarketplaceAcquisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Edit profile form state
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const client = getApiClient();
      const [profileRes, acqRes] = await Promise.all([
        client.GET('/api/profile'),
        authUser?.accountId ? client.GET('/api/marketplace/acquisitions', {
          params: { query: { accountId: authUser.accountId } } as any,
        }) : Promise.resolve({ data: [] }),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        setDisplayName(profileRes.data.displayName || '');
        setEmail(profileRes.data.email || '');
        setAvatarUrl(profileRes.data.avatarUrl || '');
        setBio(profileRes.data.bio || '');
      }

      if (acqRes?.data) {
        setAcquisitions(acqRes.data);
      }
    } catch (e) {
      toastError('Network Error', e instanceof Error ? e.message : 'Error fetching user profile.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [authUser]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const client = getApiClient();
      const res = await client.PUT('/api/profile', {
        body: {
          userId: profile?.userId,
          displayName: displayName.trim() || undefined,
          email: email.trim() || undefined,
          avatarUrl: avatarUrl.trim() || undefined,
          bio: bio.trim() || undefined,
        },
      });

      if (res.data) {
        setProfile(res.data);
        setIsEditing(false);
        success('Profile Updated', 'Personal information and developer bio saved.');
        if (typeof window !== 'undefined') {
          localStorage.setItem('razor_auth_user', JSON.stringify(res.data));
        }
      } else {
        toastError('Update Failed', 'Could not save profile.');
      }
    } catch (e) {
      toastError('Save Error', e instanceof Error ? e.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    info('Copied', 'License key copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-4">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-zinc-950 text-2xl font-bold font-mono shadow-xl shadow-indigo-500/20">
            {profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : (profile?.userName || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {profile?.displayName || profile?.userName || 'Trading Account Profile'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                {profile?.role || 'Trader'}
              </span>
            </div>
            <p className="text-xs font-mono text-zinc-400 mt-1">
              @{profile?.userName || 'guest'} • Workspace: {profile?.accountName || 'Default'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-12 text-center text-sm font-mono text-zinc-400">
          Loading marketplace identity and acquired licenses...
        </div>
      )}

      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4 text-xs font-mono">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-400" />
                  <span>Update Developer & Trader Information</span>
                </h3>

                <div>
                  <label className="block text-zinc-300 mb-1 font-semibold">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Delta Quant Author"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1 font-semibold">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="trader@domain.com"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1 font-semibold">Biography / Additive Portfolio</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell other traders about your strategies, models, and execution expertise..."
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Profile'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
                <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-400" />
                  <span>Personal Details</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50">
                    <span className="text-zinc-500 block mb-1">Display Name</span>
                    <span className="text-white font-semibold block">{profile.displayName || 'None configured'}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50">
                    <span className="text-zinc-500 block mb-1">Email Address</span>
                    <span className="text-white font-semibold block">{profile.email || 'None configured'}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50 sm:col-span-2">
                    <span className="text-zinc-500 block mb-1">Bio / Portfolio</span>
                    <span className="text-zinc-300 font-sans block leading-relaxed">
                      {profile.bio || 'No public author notes provided.'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Acquired Additive Licenses */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Key className="w-4 h-4 text-cyan-400" />
                  <span>Acquired Additive Licenses</span>
                </h3>
                <Link
                  href="/"
                  className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <span>Explore More</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {acquisitions.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-zinc-500">
                  No additive licenses acquired yet. Browse the marketplace catalogue to deploy strategies and indicators.
                </div>
              ) : (
                <div className="space-y-3">
                  {acquisitions.map((acq) => (
                    <div
                      key={acq.id}
                      className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono"
                    >
                      <div>
                        <span className="font-bold text-white block">{acq.itemName || 'Marketplace Extension'}</span>
                        <span className="text-[11px] text-zinc-400 block mt-0.5">
                          Acquired {formatTimestamp(acq.acquiredAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={acq.licenseKey}
                          className="px-2.5 py-1 bg-zinc-900 rounded border border-zinc-800 text-[11px] font-mono text-cyan-300 select-all"
                        />
                        <button
                          onClick={() => copyKey(acq.licenseKey || '')}
                          className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                          title="Copy license key"
                        >
                          {copiedKey === acq.licenseKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Account & Tier */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4 font-mono text-xs">
              <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Subscription Plan</span>
              </h3>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Current Plan</span>
                  <span className="font-bold text-amber-400">{profile.subscriptionTier}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Engine Instances</span>
                  <span className="font-bold text-white">{profile.maxInstances} Max Cap</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Publish to Market</span>
                  <span className={`font-bold ${profile.canPublishMarketplace ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {profile.canPublishMarketplace ? 'Authorized' : 'Requires Dev'}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href="http://localhost:3002"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors flex items-center justify-between"
                >
                  <span>Open Operator Control Plane</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                </a>
              </div>

              <button
                onClick={logout}
                className="w-full py-2 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors text-left"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
