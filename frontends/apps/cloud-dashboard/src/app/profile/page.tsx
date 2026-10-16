'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiClient } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/components/ui/toast';
import { formatTimestamp, formatHash } from '@razor/ui-kit';
import {
  User,
  Shield,
  Key,
  Server,
  Zap,
  Mail,
  FileText,
  Save,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Edit3,
} from 'lucide-react';
import type { UserProfilePayload } from '@razor/api-client';

export default function UserProfilePage() {
  const toast = useToast();
  const { user: authUser, logout } = useAuth();

  const [profile, setProfile] = useState<UserProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Edit profile form state
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadProfile() {
    setLoading(true);
    try {
      const client = getApiClient();
      const res = await client.GET('/api/profile');
      if (res.data) {
        setProfile(res.data);
        setDisplayName(res.data.displayName || '');
        setEmail(res.data.email || '');
        setAvatarUrl(res.data.avatarUrl || '');
        setBio(res.data.bio || '');
      } else {
        toast.error('Load Failed', 'Failed to fetch user profile.');
      }
    } catch (e) {
      toast.error('Network Error', e instanceof Error ? e.message : 'Error communicating with Cloud API.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

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
        toast.success('Profile Saved', 'Personal details and preferences updated.');
        // Update local session
        if (typeof window !== 'undefined') {
          localStorage.setItem('razor_auth_user', JSON.stringify(res.data));
        }
      } else {
        toast.error('Save Failed', 'Could not update profile information.');
      }
    } catch (e) {
      toast.error('Save Error', e instanceof Error ? e.message : 'Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    toast.info('Copied', `${label} copied to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold font-mono shadow-xl shadow-cyan-500/10">
            {profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : (profile?.userName || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {profile?.displayName || profile?.userName || 'User Profile'}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border ${
                  profile?.role === 'SuperAdmin'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                    : profile?.role === 'Admin'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : profile?.role === 'Operator'
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {profile?.role || 'Operator'}
              </span>
            </div>
            <p className="text-xs font-mono text-zinc-400 mt-1">
              @{profile?.userName || 'anonymous'} • Member since {profile?.createdAt ? formatTimestamp(profile.createdAt) : '—'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isEditing ? 'Cancel Editing' : 'Edit Profile'}</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-12 text-center text-sm font-mono text-zinc-400">
          Loading personal profile & telemetry permissions...
        </div>
      )}

      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Personal details & Edit Form */}
          <div className="md:col-span-2 space-y-6">
            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4 text-xs font-mono">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-cyan-400" />
                  <span>Modify Personal Information</span>
                </h3>

                <div>
                  <label className="block text-zinc-300 mb-1 font-semibold">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Senior Quant Lead"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1 font-semibold">Contact Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@firm.io"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1 font-semibold">Avatar Image URL</label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1 font-semibold">Biography / Desk Notes</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Describe your role, strategies, or trading desk responsibilities..."
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
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
                    className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold transition-all shadow-md shadow-cyan-600/20 flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
                <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-400" />
                  <span>Profile Overview</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50">
                    <span className="text-zinc-500 block mb-1">Display Name</span>
                    <span className="text-white font-semibold block">{profile.displayName || 'None configured'}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50">
                    <span className="text-zinc-500 block mb-1">Contact Email</span>
                    <span className="text-white font-semibold block">{profile.email || 'None configured'}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50 sm:col-span-2">
                    <span className="text-zinc-500 block mb-1">Biography</span>
                    <span className="text-zinc-300 font-sans block leading-relaxed">
                      {profile.bio || 'No personal biography or notes provided.'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Account Workspace & Quota */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-400" />
                <span>Account Workspace & Quota Cap</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50">
                  <span className="text-zinc-500 block mb-1">Workspace</span>
                  <span className="text-white font-bold block">{profile.accountName}</span>
                  <span className="text-[10px] text-zinc-500 block mt-1">ID: {formatHash(profile.accountId, 6)}</span>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50">
                  <span className="text-zinc-500 block mb-1">Subscription Tier</span>
                  <span className="text-amber-400 font-bold block">{profile.subscriptionTier} Plan</span>
                  <span className="text-[10px] text-zinc-500 block mt-1">High-frequency execution</span>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50">
                  <span className="text-zinc-500 block mb-1">Engine Quota Cap</span>
                  <span className="text-cyan-400 font-bold block">{profile.maxInstances} Nodes</span>
                  <span className="text-[10px] text-zinc-500 block mt-1">Simultaneous instances</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Roles & Privileges */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Security Permissions</span>
              </h3>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/50">
                  <span className="text-zinc-300">Manage Engine Fleet</span>
                  {profile.canManageFleet ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-zinc-600" />
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/50">
                  <span className="text-zinc-300">Execute Live Trading</span>
                  {profile.canExecuteLive ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-zinc-600" />
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/50">
                  <span className="text-zinc-300">Publish to Marketplace</span>
                  {profile.canPublishMarketplace ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-zinc-600" />
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/50">
                  <span className="text-zinc-300">User Governance</span>
                  {profile.canAdministerCluster || profile.role === 'SuperAdmin' || profile.role === 'Admin' ? (
                    <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-zinc-600" />
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/50">
                  <span className="text-zinc-300">Cluster Settings Control</span>
                  {profile.role === 'SuperAdmin' ? (
                    <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-zinc-600" />
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3 font-mono text-xs">
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block mb-2">
                Account Actions
              </span>

              {(profile.role === 'SuperAdmin' || profile.role === 'Admin') && (
                <Link
                  href="/admin"
                  className="w-full py-2 px-3 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition-all flex items-center justify-between"
                >
                  <span>Open Admin Control Plane</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}

              <Link
                href="/instances"
                className="w-full py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors flex items-center justify-between"
              >
                <span>View My Engine Fleet</span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              </Link>

              <button
                onClick={logout}
                className="w-full py-2 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors text-left"
              >
                Sign Out of Control Plane
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
