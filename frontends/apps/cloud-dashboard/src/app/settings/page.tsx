'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  ShieldAlert,
  Save,
  RotateCcw,
  Check,
  ArrowLeft,
  Radio,
  Volume2,
  Lock,
  Shield,
  Server,
  Activity,
  Sliders,
  User,
  MessageSquare,
  PhoneCall,
  CreditCard,
  Layers,
  Database,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/components/ui/toast';
import { getApiClient } from '@/lib/api-client';
import type { ClusterSettingsPayload } from '@razor/api-client';

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const { success, error: toastError } = useToast();

  const isAdmin = user?.canAdministerCluster || user?.role === 'SuperAdmin' || user?.role === 'Admin';
  const isOperator = user?.canManageFleet || user?.role === 'Operator';
  const isAuthorized = isAdmin || isOperator;

  // Operational Local Client Settings
  const [streamAudioAlerts, setStreamAudioAlerts] = useState(true);
  const [autoScrollLogs, setAutoScrollLogs] = useState(true);

  // Cluster Platform Settings
  const [settings, setSettings] = useState<ClusterSettingsPayload>({
    heartbeatIntervalSeconds: 5,
    heartbeatTimeoutSeconds: 30,
    maxFleetSizePerAccount: 50,
    commandQueueExpirySeconds: 300,
    autoDrainGracePeriodSeconds: 60,
    enforceStrictKeyRotationDays: 90,
    requireMfaForLiveTrading: false,
    allowSelfRegistration: true,
    allowedIpRanges: '*',
    sessionTimeoutMinutes: 120,
    requireCurationApproval: true,
    platformFeePercent: 2.5,
    allowUnverifiedAuthors: false,
    metricsRetentionDays: 30,
    auditLogRetentionDays: 365,
    detailedBehaviorLogging: true,
    telegramBotToken: '',
    telegramDefaultChannel: '',
    discordWebhookUrl: '',
    slackWebhookUrl: '',
    enableMessengerAlerts: true,
    smsProvider: 'Twilio',
    smsApiKey: '',
    smsSenderNumber: '',
    enableSmsAlerts: false,
    paymentProvider: 'Stripe',
    paymentPublicKey: '',
    paymentSecretKey: '',
    paymentWebhookSecret: '',
    paymentCurrency: 'USD',
    subscriptionTiersJson: `[
  {"tier":"Free","priceMonthly":0,"maxInstances":1,"allowLiveTrading":false,"allowOptimization":true,"storageDays":7},
  {"tier":"Pro","priceMonthly":49,"maxInstances":5,"allowLiveTrading":true,"allowOptimization":true,"storageDays":90},
  {"tier":"Enterprise","priceMonthly":299,"maxInstances":50,"allowLiveTrading":true,"allowOptimization":true,"storageDays":365}
]`,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Hydrate local preferences
    const storedAudio = localStorage.getItem('razor_setting_audio');
    if (storedAudio !== null) setStreamAudioAlerts(storedAudio === 'true');

    const storedScroll = localStorage.getItem('razor_setting_autoscroll');
    if (storedScroll !== null) setAutoScrollLogs(storedScroll === 'true');

    // Load backend cluster settings if authorized
    if (isAuthorized) {
      loadClusterSettings();
    }
  }, [isAuthorized]);

  const loadClusterSettings = async () => {
    setLoading(true);
    try {
      const client = getApiClient();
      const res = await client.GET('/api/admin/settings');
      if (res.data) {
        setSettings((prev) => ({
          ...prev,
          ...res.data,
        }));
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      toastError('Access Denied', 'Operator or Administrator permissions required.');
      return;
    }

    setSaving(true);
    try {
      // Save operational preferences
      localStorage.setItem('razor_setting_audio', String(streamAudioAlerts));
      localStorage.setItem('razor_setting_autoscroll', String(autoScrollLogs));
      localStorage.setItem('razor_setting_fee', String(settings.platformFeePercent));

      if (isAdmin) {
        const client = getApiClient();
        const res = await client.PUT('/api/admin/settings', {
          body: settings,
        });
        if (res.data) {
          setSettings((prev) => ({ ...prev, ...res.data }));
        }
      }

      success(
        'Platform Settings Persisted',
        isAdmin
          ? 'Platform configurations, integration webhooks, and fleet policies updated.'
          : 'Local operational fleet preferences recorded.'
      );
    } catch {
      toastError('Save Error', 'Failed to update platform settings on control plane.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm('Reset all platform settings and policies to factory defaults?')) return;
    setSaving(true);
    try {
      localStorage.removeItem('razor_setting_audio');
      localStorage.removeItem('razor_setting_autoscroll');
      setStreamAudioAlerts(true);
      setAutoScrollLogs(true);

      if (isAdmin) {
        const client = getApiClient();
        const res = await client.POST('/api/admin/settings/reset');
        if (res.data) {
          setSettings((prev) => ({ ...prev, ...res.data }));
        }
      }

      success('Defaults Restored', 'All platform policies reset to factory defaults.');
    } catch {
      toastError('Reset Error', 'Failed to reset settings.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated || !isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="p-8 border border-[#262626] bg-[#171717] text-center space-y-6 rounded-2xl">
          <div className="w-12 h-12 border border-[#262626] bg-[#171717] text-zinc-100 rounded-xl mx-auto flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-100">
              Restricted Access • Administrator & Operator Only
            </h1>
            <p className="text-xs text-zinc-100 font-mono max-w-md mx-auto leading-relaxed">
              Platform integrations, messenger webhooks, payment credentials, and cluster policies are strictly reserved for Operators and Cluster Administrators.
            </p>
          </div>
          {user && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#262626] bg-[#171717] text-xs font-mono text-zinc-100 rounded-full">
              <span>Your Assigned Role:</span>
              <span className="font-bold uppercase">{user.role}</span>
            </div>
          )}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/panel/profile"
              className="px-4 py-2 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium font-mono text-xs font-bold uppercase"
            >
              Manage Personal Profile
            </Link>
            <Link
              href="/panel"
              className="px-4 py-2 border border-[#262626] bg-[#171717] text-zinc-100 rounded-xl hover:bg-[#1f1f1f] font-mono text-xs font-bold uppercase"
            >
              Return to Overview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-mono">
      {/* Header */}
      <div className="border-b border-[#262626] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-zinc-100" />
                <span>PLATFORM INFRASTRUCTURE & SETTINGS</span>
              </span>
            </div>
            <h1 className="text-2xl font-bold uppercase tracking-tight text-zinc-100">
              Cluster Settings & Integrations Hub
            </h1>
            <p className="text-xs text-zinc-100 mt-1">
              {isAdmin
                ? 'Comprehensive configuration hub for Messengers, SMS Gateways, Payment Providers, Dynamic Subscription Tiers, and Fleet Policies.'
                : 'Operational telemetry preferences and fleet supervision policies.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <>
                <span className="px-3 py-1 border border-[#262626] bg-[#1f1f1f] text-zinc-100 text-xs font-bold uppercase rounded-full">
                  SuperAdmin Full Control
                </span>
                <span className="px-3 py-1 border border-[#262626] bg-[#171717] text-zinc-100 rounded-xl text-xs font-bold uppercase">
                  Admin Unlocked
                </span>
                <Link
                  href="/panel/admin"
                  className="px-3.5 py-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full text-xs font-bold uppercase transition-colors"
                >
                  Open Cluster Governance
                </Link>
              </>
            ) : (
              <>
                <span className="px-3 py-1 border border-[#262626] bg-[#1f1f1f] text-zinc-100 text-xs font-bold uppercase rounded-full">
                  Operator Fleet View
                </span>
                <span className="px-3 py-1 border border-[#262626] bg-[#171717] text-zinc-100 rounded-xl text-xs font-bold uppercase">
                  Locked • Admin Role Required
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Operational Client Controls */}
        <div className="p-6 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#262626]">
            <Radio className="w-4 h-4 text-zinc-100" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-100">
              Local Operational Telemetry & Chimes
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-center justify-between p-3 border border-[#262626] bg-[#171717] rounded-lg">
              <div>
                <p className="font-bold text-zinc-100 uppercase">Tactile Audio Chimes</p>
                <p className="text-[11px] text-zinc-100">Play audio cues on disconnects or risk violations.</p>
              </div>
              <input
                type="checkbox"
                checked={streamAudioAlerts}
                onChange={(e) => setStreamAudioAlerts(e.target.checked)}
                className="w-4 h-4 border border-[#262626] rounded accent-[#3ECF8E] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 border border-[#262626] bg-[#171717] rounded-lg">
              <div>
                <p className="font-bold text-zinc-100 uppercase">Log Stream Auto-Scroll</p>
                <p className="text-[11px] text-zinc-100">Automatically lock to tail on new incoming live stream events.</p>
              </div>
              <input
                type="checkbox"
                checked={autoScrollLogs}
                onChange={(e) => setAutoScrollLogs(e.target.checked)}
                className="w-4 h-4 border border-[#262626] rounded accent-[#3ECF8E] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 2. Fleet & Engine Execution Policies */}
        <div className="p-6 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#262626]">
            <Server className="w-4 h-4 text-zinc-100" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-100">
              Fleet & Engine Execution Policies
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="text-zinc-100 block mb-1 font-bold uppercase text-[11px]">Heartbeat Interval (sec)</label>
              <input
                type="number"
                disabled={!isAdmin}
                value={settings.heartbeatIntervalSeconds}
                onChange={(e) => setSettings({ ...settings, heartbeatIntervalSeconds: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-zinc-100 block mb-1 font-bold uppercase text-[11px]">Heartbeat Timeout (sec)</label>
              <input
                type="number"
                disabled={!isAdmin}
                value={settings.heartbeatTimeoutSeconds}
                onChange={(e) => setSettings({ ...settings, heartbeatTimeoutSeconds: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-zinc-100 block mb-1 font-bold uppercase text-[11px]">Max Fleet Size / Account</label>
              <input
                type="number"
                disabled={!isAdmin}
                value={settings.maxFleetSizePerAccount}
                onChange={(e) => setSettings({ ...settings, maxFleetSizePerAccount: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-zinc-100 block mb-1 font-bold uppercase text-[11px]">Command Queue Expiry (sec)</label>
              <input
                type="number"
                disabled={!isAdmin}
                value={settings.commandQueueExpirySeconds}
                onChange={(e) => setSettings({ ...settings, commandQueueExpirySeconds: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* 3. Messengers & Notification Integrations */}
        <div className="p-6 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-zinc-100" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-100">
                Messengers & Notification Integrations
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableMessengerAlerts"
                disabled={!isAdmin}
                checked={settings.enableMessengerAlerts ?? true}
                onChange={(e) => setSettings({ ...settings, enableMessengerAlerts: e.target.checked })}
                className="w-4 h-4 border border-[#262626] rounded accent-[#3ECF8E] cursor-pointer"
              />
              <label htmlFor="enableMessengerAlerts" className="text-zinc-100 font-bold uppercase text-[11px] cursor-pointer">
                Active Alerts
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-zinc-100 block mb-1 font-bold uppercase text-[11px]">Telegram Bot API Token</label>
              <input
                type="password"
                disabled={!isAdmin}
                placeholder="bot123456789:ABCdefGHIjkl..."
                value={settings.telegramBotToken ?? ''}
                onChange={(e) => setSettings({ ...settings, telegramBotToken: e.target.value })}
                className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-zinc-100 block mb-1 font-bold uppercase text-[11px]">Telegram Channel ID / Chat Target</label>
              <input
                type="text"
                disabled={!isAdmin}
                placeholder="@razor_desk_alerts or -100123456789"
                value={settings.telegramDefaultChannel ?? ''}
                onChange={(e) => setSettings({ ...settings, telegramDefaultChannel: e.target.value })}
                className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-zinc-100 block mb-1 font-bold uppercase text-[11px]">Discord Incident Webhook URL</label>
              <input
                type="url"
                disabled={!isAdmin}
                placeholder="https://discord.com/api/webhooks/..."
                value={settings.discordWebhookUrl ?? ''}
                onChange={(e) => setSettings({ ...settings, discordWebhookUrl: e.target.value })}
                className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-zinc-100 block mb-1 font-bold uppercase text-[11px]">Slack Alerts Webhook URL</label>
              <input
                type="url"
                disabled={!isAdmin}
                placeholder="https://hooks.slack.com/services/..."
                value={settings.slackWebhookUrl ?? ''}
                onChange={(e) => setSettings({ ...settings, slackWebhookUrl: e.target.value })}
                className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* 4. SMS Gateway Providers */}
        <div className="p-6 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-zinc-100" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-100">
                SMS Gateway Providers & OTP Delivery
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableSmsAlerts"
                disabled={!isAdmin}
                checked={settings.enableSmsAlerts ?? false}
                onChange={(e) => setSettings({ ...settings, enableSmsAlerts: e.target.checked })}
                className="w-4 h-4 border border-[#262626] rounded accent-[#3ECF8E] cursor-pointer"
              />
              <label htmlFor="enableSmsAlerts" className="text-zinc-100 font-bold uppercase text-[11px] cursor-pointer">
                Enable SMS Delivery
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-zinc-100 block mb-1 font-bold uppercase text-[11px]">Provider</label>
              <select
                disabled={!isAdmin}
                value={settings.smsProvider ?? 'Twilio'}
                onChange={(e) => setSettings({ ...settings, smsProvider: e.target.value })}
                className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md disabled:opacity-50"
              >
                <option value="Twilio">Twilio</option>
                <option value="AwsSns">AWS SNS</option>
                <option value="Vonage">Vonage</option>
                <option value="Infobip">Infobip</option>
                <option value="KavehNegar">KavehNegar</option>
              </select>
            </div>
            <div>
              <label className="text-zinc-100 block mb-1 font-bold uppercase text-[11px]">API Key / Secret Token</label>
              <input
                type="password"
                disabled={!isAdmin}
                placeholder="API Key..."
                value={settings.smsApiKey ?? ''}
                onChange={(e) => setSettings({ ...settings, smsApiKey: e.target.value })}
                className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-zinc-100 block mb-1 font-bold uppercase text-[11px]">Sender ID / Phone Number</label>
              <input
                type="text"
                disabled={!isAdmin}
                placeholder="+12025550192 or RAZOR"
                value={settings.smsSenderNumber ?? ''}
                onChange={(e) => setSettings({ ...settings, smsSenderNumber: e.target.value })}
                className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* 5. Payment Gateways */}
        <div className="p-6 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#262626]">
            <CreditCard className="w-4 h-4 text-zinc-100" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-100">
              Payment Gateways & Subscriptions Billing
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-zinc-100 block mb-1 font-bold uppercase text-[11px]">Processor</label>
              <select
                disabled={!isAdmin}
                value={settings.paymentProvider ?? 'Stripe'}
                onChange={(e) => setSettings({ ...settings, paymentProvider: e.target.value })}
                className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md disabled:opacity-50"
              >
                <option value="Stripe">Stripe Connect</option>
                <option value="LemonSqueezy">Lemon Squeezy</option>
                <option value="Paddle">Paddle</option>
                <option value="PayPal">PayPal Commerce</option>
              </select>
            </div>
            <div>
              <label className="text-zinc-100 block mb-1 font-bold uppercase text-[11px]">Currency</label>
              <select
                disabled={!isAdmin}
                value={settings.paymentCurrency ?? 'USD'}
                onChange={(e) => setSettings({ ...settings, paymentCurrency: e.target.value })}
                className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md disabled:opacity-50"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div>
              <label className="text-zinc-100 block mb-1 font-bold uppercase text-[11px]">Publishable Key</label>
              <input
                type="text"
                disabled={!isAdmin}
                placeholder="pk_live_..."
                value={settings.paymentPublicKey ?? ''}
                onChange={(e) => setSettings({ ...settings, paymentPublicKey: e.target.value })}
                className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-zinc-100 block mb-1 font-bold uppercase text-[11px]">Secret Key</label>
              <input
                type="password"
                disabled={!isAdmin}
                placeholder="sk_live_..."
                value={settings.paymentSecretKey ?? ''}
                onChange={(e) => setSettings({ ...settings, paymentSecretKey: e.target.value })}
                className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md disabled:opacity-50"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-zinc-100 block mb-1 font-bold uppercase text-[11px]">Webhook Endpoint Secret</label>
              <input
                type="password"
                disabled={!isAdmin}
                placeholder="whsec_..."
                value={settings.paymentWebhookSecret ?? ''}
                onChange={(e) => setSettings({ ...settings, paymentWebhookSecret: e.target.value })}
                className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* 6. Dynamic Subscription Tiers */}
        <div className="p-6 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#262626]">
            <Layers className="w-4 h-4 text-zinc-100" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-100">
              Dynamic Subscription Tiers Configuration Matrix
            </h2>
          </div>
          <textarea
            rows={5}
            disabled={!isAdmin}
            value={settings.subscriptionTiersJson ?? ''}
            onChange={(e) => setSettings({ ...settings, subscriptionTiersJson: e.target.value })}
            className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md disabled:opacity-50"
          />
        </div>

        {/* 7. Security, Marketplace, and Retention */}
        <div className="p-6 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#262626]">
            <Shield className="w-4 h-4 text-zinc-100" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-100">
              Security, Retention & Marketplace Bounds
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-zinc-100 block mb-1 font-bold uppercase text-[11px]">Key Rotation (Days)</label>
              <input
                type="number"
                disabled={!isAdmin}
                value={settings.enforceStrictKeyRotationDays}
                onChange={(e) => setSettings({ ...settings, enforceStrictKeyRotationDays: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-zinc-100 block mb-1 font-bold uppercase text-[11px]">Marketplace Fee (%)</label>
              <input
                type="number"
                step="0.1"
                disabled={!isAdmin}
                value={settings.platformFeePercent}
                onChange={(e) => setSettings({ ...settings, platformFeePercent: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-zinc-100 block mb-1 font-bold uppercase text-[11px]">Audit Retention (Days)</label>
              <input
                type="number"
                disabled={!isAdmin}
                value={settings.auditLogRetentionDays ?? 365}
                onChange={(e) => setSettings({ ...settings, auditLogRetentionDays: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={saving || !isAdmin}
            className="flex items-center gap-2 px-5 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium text-xs font-bold uppercase transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium text-xs font-bold uppercase transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : isAdmin ? 'Save All Preferences' : 'Save Fleet Preferences'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
