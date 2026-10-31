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
  Check,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Edit3,
  Phone,
  Cloud,
  Send,
  Lock,
} from 'lucide-react';
import type { UserProfilePayload } from '@razor/api-client';

const COUNTRY_DIALING_CODES = [
  { code: '+1', country: 'United States / Canada', iso: 'US' },
  { code: '+44', country: 'United Kingdom', iso: 'GB' },
  { code: '+49', country: 'Germany', iso: 'DE' },
  { code: '+33', country: 'France', iso: 'FR' },
  { code: '+41', country: 'Switzerland', iso: 'CH' },
  { code: '+81', country: 'Japan', iso: 'JP' },
  { code: '+65', country: 'Singapore', iso: 'SG' },
  { code: '+852', country: 'Hong Kong', iso: 'HK' },
  { code: '+971', country: 'United Arab Emirates', iso: 'AE' },
  { code: '+966', country: 'Saudi Arabia', iso: 'SA' },
  { code: '+98', country: 'Iran', iso: 'IR' },
  { code: '+90', country: 'Turkey', iso: 'TR' },
  { code: '+61', country: 'Australia', iso: 'AU' },
  { code: '+31', country: 'Netherlands', iso: 'NL' },
  { code: '+46', country: 'Sweden', iso: 'SE' },
  { code: '+47', country: 'Norway', iso: 'NO' },
  { code: '+39', country: 'Italy', iso: 'IT' },
  { code: '+34', country: 'Spain', iso: 'ES' },
  { code: '+82', country: 'South Korea', iso: 'KR' },
  { code: '+91', country: 'India', iso: 'IN' },
  { code: '+55', country: 'Brazil', iso: 'BR' },
  { code: '+52', country: 'Mexico', iso: 'MX' },
  { code: '+27', country: 'South Africa', iso: 'ZA' },
  { code: '+351', country: 'Portugal', iso: 'PT' },
  { code: '+48', country: 'Poland', iso: 'PL' },
  { code: '+43', country: 'Austria', iso: 'AT' },
  { code: '+32', country: 'Belgium', iso: 'BE' },
  { code: '+353', country: 'Ireland', iso: 'IE' },
  { code: '+64', country: 'New Zealand', iso: 'NZ' },
];

export default function UserProfilePage() {
  const toast = useToast();
  const { user: authUser, logout } = useAuth();

  const [profile, setProfile] = useState<UserProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit profile form state
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [secondaryEmail, setSecondaryEmail] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [telegramHandle, setTelegramHandle] = useState('');
  const [googleDriveLinked, setGoogleDriveLinked] = useState(false);
  const [oneDriveLinked, setOneDriveLinked] = useState(false);
  const [smsOtpEnabled, setSmsOtpEnabled] = useState(false);
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
        populateFields(res.data);
      } else {
        toast.error('Load Failed', 'Failed to fetch user profile.');
      }
    } catch (e) {
      toast.error('Network Error', e instanceof Error ? e.message : 'Error communicating with Cloud API.');
    } finally {
      setLoading(false);
    }
  }

  function populateFields(data: UserProfilePayload) {
    setDisplayName(data.displayName || '');
    setEmail(data.email || '');
    setSecondaryEmail(data.secondaryEmail || '');
    setPhoneCountryCode(data.phoneCountryCode || '+1');
    setPhoneNumber(data.phoneNumber || '');
    setTwoFactorEnabled(data.twoFactorEnabled ?? false);
    setTelegramHandle(data.telegramHandle || '');
    setGoogleDriveLinked(data.googleDriveLinked ?? false);
    setOneDriveLinked(data.oneDriveLinked ?? false);
    setSmsOtpEnabled(data.smsOtpEnabled ?? false);
    setAvatarUrl(data.avatarUrl || '');
    setBio(data.bio || '');
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
          secondaryEmail: secondaryEmail.trim() || undefined,
          phoneCountryCode: phoneCountryCode || '+1',
          phoneNumber: phoneNumber.trim() || undefined,
          twoFactorEnabled,
          telegramHandle: telegramHandle.trim() || undefined,
          googleDriveLinked,
          oneDriveLinked,
          smsOtpEnabled,
          avatarUrl: avatarUrl.trim() || undefined,
          bio: bio.trim() || undefined,
        },
      });

      if (res.data) {
        setProfile(res.data);
        populateFields(res.data);
        setIsEditing(false);
        toast.success('Profile Saved', 'Personal details, recovery contact, and cloud connectors updated.');
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-mono text-zinc-100">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#262626]">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 border border-[#262626] bg-[#171717] flex items-center justify-center text-zinc-100 text-2xl font-bold uppercase rounded-full">
            {profile?.displayName
              ? profile.displayName.charAt(0).toUpperCase()
              : (profile?.userName || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-100 uppercase">
                {profile?.displayName || profile?.userName || 'User Profile'}
              </h1>
              <span className="px-2.5 py-0.5 border border-[#262626] bg-[#171717] text-zinc-100 rounded-xl text-xs font-bold uppercase">
                {profile?.role === 'Developer' ? 'Trader' : profile?.role || 'Trader'}
              </span>
              <span className="px-2.5 py-0.5 border border-[#262626] bg-[#1f1f1f] text-zinc-100 text-xs font-bold uppercase rounded-full">
                {profile?.subscriptionTier || 'Free'} Plan
              </span>
            </div>
            <p className="text-xs text-zinc-100 mt-1">
              @{profile?.userName || 'anonymous'} • Member since {profile?.createdAt ? formatTimestamp(profile.createdAt) : '—'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => {
              if (isEditing && profile) populateFields(profile);
              setIsEditing(!isEditing);
            }}
            className="px-4 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold uppercase transition-colors flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-12 text-center text-xs font-mono text-zinc-100">
          Loading personal profile & telemetry permissions...
        </div>
      )}

      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Details & Edit Form */}
          <div className="md:col-span-2 space-y-6">
            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="p-6 border border-[#262626] bg-[#171717] rounded-xl space-y-4 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-[#262626] pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-zinc-100" />
                    <span>Modify Personal Details & Cloud Integrations</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-100 mb-1 font-bold uppercase text-[11px]">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Senior Quant Lead"
                      className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-100 mb-1 font-bold uppercase text-[11px]">Primary Contact Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="trader@fund.com"
                      className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-100 mb-1 font-bold uppercase text-[11px]">Secondary Recovery Email</label>
                    <input
                      type="email"
                      value={secondaryEmail}
                      onChange={(e) => setSecondaryEmail(e.target.value)}
                      placeholder="backup@fund.com"
                      className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-100 mb-1 font-bold uppercase text-[11px]">Telegram Handle</label>
                    <div className="flex items-center">
                      <span className="px-3 py-2 border border-r-0 border-[#262626] bg-[#1f1f1f] text-zinc-200 text-xs font-bold">@</span>
                      <input
                        type="text"
                        value={telegramHandle}
                        onChange={(e) => setTelegramHandle(e.target.value.replace(/^@/, ''))}
                        placeholder="quant_lead"
                        className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md"
                      />
                    </div>
                  </div>
                </div>

                {/* International Phone Number with Country Code */}
                <div className="border border-[#262626] p-4 bg-[#171717] rounded-lg space-y-2">
                  <label className="block text-zinc-100 font-bold uppercase text-[11px]">
                    International Contact Phone (With Dialing Code)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={phoneCountryCode}
                      onChange={(e) => setPhoneCountryCode(e.target.value)}
                      className="px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md"
                    >
                      {COUNTRY_DIALING_CODES.map((c) => (
                        <option key={c.code + c.iso} value={c.code}>
                          {c.code} ({c.iso}) - {c.country}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="9123456789"
                      className="sm:col-span-2 px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md"
                    />
                  </div>
                </div>

                {/* Security & OTP Toggles */}
                <div className="border border-[#262626] p-4 bg-[#171717] rounded-lg space-y-3">
                  <div className="text-xs font-bold uppercase text-zinc-100 pb-1 border-b border-[#262626]">
                    Authentication & Alert Protocols
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={twoFactorEnabled}
                        onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                        className="w-4 h-4 border border-[#262626] rounded accent-[#3ECF8E] cursor-pointer"
                      />
                      <span className="font-bold uppercase text-[11px]">Enforce Two-Factor Authentication (2FA)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={smsOtpEnabled}
                        onChange={(e) => setSmsOtpEnabled(e.target.checked)}
                        className="w-4 h-4 border border-[#262626] rounded accent-[#3ECF8E] cursor-pointer"
                      />
                      <span className="font-bold uppercase text-[11px]">Enable SMS & Telegram OTP Login</span>
                    </label>
                  </div>
                </div>

                {/* Cloud Drive Sync */}
                <div className="border border-[#262626] p-4 bg-[#171717] rounded-lg space-y-3">
                  <div className="text-xs font-bold uppercase text-zinc-100 pb-1 border-b border-[#262626]">
                    Automated Cloud Storage Sync (Exports & Reports Direct Delivery)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={googleDriveLinked}
                        onChange={(e) => setGoogleDriveLinked(e.target.checked)}
                        className="w-4 h-4 border border-[#262626] rounded accent-[#3ECF8E] cursor-pointer"
                      />
                      <span className="font-bold uppercase text-[11px]">Link Google Drive (Auto-Upload XLSX Runs)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={oneDriveLinked}
                        onChange={(e) => setOneDriveLinked(e.target.checked)}
                        className="w-4 h-4 border border-[#262626] rounded accent-[#3ECF8E] cursor-pointer"
                      />
                      <span className="font-bold uppercase text-[11px]">Link Microsoft OneDrive (Auto-Archive)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-100 mb-1 font-bold uppercase text-[11px]">Desk Notes / Biography</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Describe your quantitative strategies, active assets, or trading desk responsibilities..."
                    className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262626]">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium font-bold uppercase disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Profile'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 border border-[#262626] bg-[#171717] rounded-xl space-y-6">
                <div className="flex items-center justify-between border-b border-[#262626] pb-2">
                  <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-100" />
                    <span>Profile & Contact Overview</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-4 border border-[#262626] bg-[#171717] rounded-lg">
                    <span className="text-zinc-100 uppercase text-[10px] font-bold block mb-1">Display Name</span>
                    <span className="text-zinc-100 font-bold block">{profile.displayName || 'None configured'}</span>
                  </div>

                  <div className="p-4 border border-[#262626] bg-[#171717] rounded-lg">
                    <span className="text-zinc-100 uppercase text-[10px] font-bold block mb-1">Primary Email</span>
                    <span className="text-zinc-100 font-bold block">{profile.email || 'None configured'}</span>
                  </div>

                  <div className="p-4 border border-[#262626] bg-[#171717] rounded-lg">
                    <span className="text-zinc-100 uppercase text-[10px] font-bold block mb-1">Secondary Recovery Email</span>
                    <span className="text-zinc-100 font-bold block">{profile.secondaryEmail || 'None configured'}</span>
                  </div>

                  <div className="p-4 border border-[#262626] bg-[#171717] rounded-lg">
                    <span className="text-zinc-100 uppercase text-[10px] font-bold block mb-1">Contact Phone Number</span>
                    <span className="text-zinc-100 font-bold block">
                      {profile.phoneNumber ? `${profile.phoneCountryCode || '+1'} ${profile.phoneNumber}` : 'None configured'}
                    </span>
                  </div>

                  <div className="p-4 border border-[#262626] bg-[#171717] rounded-lg">
                    <span className="text-zinc-100 uppercase text-[10px] font-bold block mb-1">Telegram Messenger</span>
                    <span className="text-zinc-100 font-bold block">
                      {profile.telegramHandle ? `@${profile.telegramHandle}` : 'None connected'}
                    </span>
                  </div>

                  <div className="p-4 border border-[#262626] bg-[#171717] rounded-lg">
                    <span className="text-zinc-100 uppercase text-[10px] font-bold block mb-1">Two-Factor Authentication</span>
                    <span className={`font-bold block uppercase ${profile.twoFactorEnabled ? 'text-zinc-100' : 'text-rose-400'}`}>
                      {profile.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <div className="p-4 border border-[#262626] bg-[#171717] rounded-lg">
                    <span className="text-zinc-100 uppercase text-[10px] font-bold block mb-1">Google Drive Sync</span>
                    <span className="text-zinc-100 font-bold block uppercase">
                      {profile.googleDriveLinked ? 'Connected (Auto-Upload)' : 'Disconnected'}
                    </span>
                  </div>

                  <div className="p-4 border border-[#262626] bg-[#171717] rounded-lg">
                    <span className="text-zinc-100 uppercase text-[10px] font-bold block mb-1">Microsoft OneDrive Sync</span>
                    <span className="text-zinc-100 font-bold block uppercase">
                      {profile.oneDriveLinked ? 'Connected (Auto-Archive)' : 'Disconnected'}
                    </span>
                  </div>

                  <div className="p-4 border border-[#262626] bg-[#171717] rounded-lg sm:col-span-2">
                    <span className="text-zinc-100 uppercase text-[10px] font-bold block mb-1">Desk Notes & Biography</span>
                    <span className="text-zinc-100 block leading-relaxed">
                      {profile.bio || 'No personal biography or notes provided.'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Account Workspace & Quota */}
            <div className="p-6 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
              <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#262626]">
                <Server className="w-4 h-4 text-zinc-100" />
                <span>Account Workspace & Execution Quota</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-4 border border-[#262626] bg-[#171717] rounded-lg">
                  <span className="text-zinc-100 uppercase text-[10px] font-bold block mb-1">Workspace</span>
                  <span className="text-zinc-100 font-bold block uppercase">{profile.accountName}</span>
                  <span className="text-[10px] text-zinc-100 block mt-1">ID: {formatHash(profile.accountId, 6)}</span>
                </div>

                <div className="p-4 border border-[#262626] bg-[#171717] rounded-lg">
                  <span className="text-zinc-100 uppercase text-[10px] font-bold block mb-1">Subscription Tier</span>
                  <span className="text-zinc-100 font-bold block uppercase">{profile.subscriptionTier} Plan</span>
                  <span className="text-[10px] text-zinc-100 block mt-1">Institutional Flow Quota</span>
                </div>

                <div className="p-4 border border-[#262626] bg-[#171717] rounded-lg">
                  <span className="text-zinc-100 uppercase text-[10px] font-bold block mb-1">Node Quota Cap</span>
                  <span className="text-zinc-100 font-bold block uppercase">{profile.maxInstances} Engine Nodes</span>
                  <span className="text-[10px] text-zinc-100 block mt-1">Concurrent live instances</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Permissions & Actions */}
          <div className="space-y-6">
            <div className="p-6 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
              <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#262626]">
                <Shield className="w-4 h-4 text-zinc-100" />
                <span>Account Privileges & Entitlements</span>
              </h3>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-3 border border-[#262626] bg-[#171717] rounded-lg">
                  <span className="text-zinc-100 uppercase text-[11px] font-semibold">Manage Engine Fleet</span>
                  {profile.canManageFleet ? (
                    <span className="font-bold uppercase text-zinc-100">[AUTHORIZED]</span>
                  ) : (
                    <span className="font-bold uppercase text-rose-400">[RESTRICTED]</span>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 border border-[#262626] bg-[#171717] rounded-lg">
                  <span className="text-zinc-100 uppercase text-[11px] font-semibold">Deploy Live Trading</span>
                  {profile.canExecuteLive ? (
                    <span className="font-bold uppercase text-zinc-100">[AUTHORIZED]</span>
                  ) : (
                    <span className="font-bold uppercase text-rose-400">[RESTRICTED]</span>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 border border-[#262626] bg-[#171717] rounded-lg">
                  <span className="text-zinc-100 uppercase text-[11px] font-semibold">Publish Marketplace Additives</span>
                  {profile.canPublishMarketplace ? (
                    <span className="font-bold uppercase text-zinc-100">[AUTHORIZED]</span>
                  ) : (
                    <span className="font-bold uppercase text-rose-400">[RESTRICTED]</span>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 border border-[#262626] bg-[#171717] rounded-lg">
                  <span className="text-zinc-100 uppercase text-[11px] font-semibold">Cluster Governance Access</span>
                  {profile.canAdministerCluster || profile.role === 'SuperAdmin' || profile.role === 'Admin' ? (
                    <span className="font-bold uppercase text-zinc-100">[SUPERADMIN]</span>
                  ) : (
                    <span className="font-bold uppercase text-rose-400">[RESTRICTED]</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-6 border border-[#262626] bg-[#171717] rounded-xl space-y-3 font-mono text-xs">
              <span className="text-xs text-zinc-100 font-bold uppercase tracking-wider block mb-2 pb-1 border-b border-[#262626]">
                Account Actions
              </span>

              {(profile.role === 'SuperAdmin' || profile.role === 'Admin') && (
                <Link
                  href="/panel/admin"
                  className="w-full py-2 px-3 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold uppercase transition-colors flex items-center justify-between"
                >
                  <span>Admin Control Plane</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}

              <Link
                href="/panel/instances"
                className="w-full py-2 px-3 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold uppercase transition-colors flex items-center justify-between"
              >
                <span>View Engine Fleet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <button
                onClick={logout}
                className="w-full py-2 px-4 border border-[#262626] bg-[#171717] hover:bg-rose-950/40 hover:border-rose-500/50 hover:text-rose-400 text-zinc-100 font-bold uppercase transition-colors text-left rounded-lg"
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
