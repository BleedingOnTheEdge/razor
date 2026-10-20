'use client';

import React from 'react';
import { RotateCcw, Save, Server, Shield, ShoppingBag, Database, MessageSquare, PhoneCall, CreditCard, Layers } from 'lucide-react';
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
      {/* 1. Fleet Policies */}
      <div className="p-6 border border-black bg-white space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-black">
          <Server className="w-4 h-4 text-black" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-black">
            Fleet & Engine Execution Policies
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">Heartbeat Interval (sec)</label>
            <input
              type="number"
              value={settings.heartbeatIntervalSeconds}
              onChange={(e) => setSettings({ ...settings, heartbeatIntervalSeconds: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            />
          </div>
          <div>
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">Heartbeat Timeout (sec)</label>
            <input
              type="number"
              value={settings.heartbeatTimeoutSeconds}
              onChange={(e) => setSettings({ ...settings, heartbeatTimeoutSeconds: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            />
          </div>
          <div>
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">Max Fleet Size / Account</label>
            <input
              type="number"
              value={settings.maxFleetSizePerAccount}
              onChange={(e) => setSettings({ ...settings, maxFleetSizePerAccount: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            />
          </div>
          <div>
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">Command Queue Expiry (sec)</label>
            <input
              type="number"
              value={settings.commandQueueExpirySeconds}
              onChange={(e) => setSettings({ ...settings, commandQueueExpirySeconds: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            />
          </div>
        </div>
      </div>

      {/* 2. Security & Access */}
      <div className="p-6 border border-black bg-white space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-black">
          <Shield className="w-4 h-4 text-black" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-black">
            Security & Access Control
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">Key Rotation Cadence (days)</label>
            <input
              type="number"
              value={settings.enforceStrictKeyRotationDays}
              onChange={(e) => setSettings({ ...settings, enforceStrictKeyRotationDays: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            />
          </div>
          <div>
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">Allowed IP Range Whitelist</label>
            <input
              type="text"
              value={settings.allowedIpRanges}
              onChange={(e) => setSettings({ ...settings, allowedIpRanges: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            />
          </div>
          <div>
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">Session Timeout (minutes)</label>
            <input
              type="number"
              value={settings.sessionTimeoutMinutes ?? 120}
              onChange={(e) => setSettings({ ...settings, sessionTimeoutMinutes: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="selfReg"
              checked={settings.allowSelfRegistration}
              onChange={(e) => setSettings({ ...settings, allowSelfRegistration: e.target.checked })}
              className="w-4 h-4 border border-black rounded-none text-black cursor-pointer accent-black"
            />
            <label htmlFor="selfReg" className="text-black font-semibold uppercase text-[11px] cursor-pointer">Allow Public Self-Registration</label>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="mfa"
              checked={settings.requireMfaForLiveTrading}
              onChange={(e) => setSettings({ ...settings, requireMfaForLiveTrading: e.target.checked })}
              className="w-4 h-4 border border-black rounded-none text-black cursor-pointer accent-black"
            />
            <label htmlFor="mfa" className="text-black font-semibold uppercase text-[11px] cursor-pointer">Require 2FA For Live Execution</label>
          </div>
        </div>
      </div>

      {/* 3. Marketplace & Additives */}
      <div className="p-6 border border-black bg-white space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-black">
          <ShoppingBag className="w-4 h-4 text-black" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-black">
            Marketplace & Strategy Additive Policies
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">Platform Royalty / Protocol Fee (%)</label>
            <input
              type="number"
              step="0.1"
              value={settings.platformFeePercent}
              onChange={(e) => setSettings({ ...settings, platformFeePercent: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="curation"
              checked={settings.requireCurationApproval}
              onChange={(e) => setSettings({ ...settings, requireCurationApproval: e.target.checked })}
              className="w-4 h-4 border border-black rounded-none text-black cursor-pointer accent-black"
            />
            <label htmlFor="curation" className="text-black font-semibold uppercase text-[11px] cursor-pointer">Require Staff Curation Before Public Listing</label>
          </div>
        </div>
      </div>

      {/* 4. Telemetry & Retention */}
      <div className="p-6 border border-black bg-white space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-black">
          <Database className="w-4 h-4 text-black" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-black">
            Telemetry Storage & Audit Ledger Retention
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">Metrics Retention (Days)</label>
            <input
              type="number"
              value={settings.metricsRetentionDays ?? 30}
              onChange={(e) => setSettings({ ...settings, metricsRetentionDays: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            />
          </div>
          <div>
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">Audit Log Retention (Days)</label>
            <input
              type="number"
              value={settings.auditLogRetentionDays ?? 365}
              onChange={(e) => setSettings({ ...settings, auditLogRetentionDays: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="detailedLog"
              checked={settings.detailedBehaviorLogging ?? true}
              onChange={(e) => setSettings({ ...settings, detailedBehaviorLogging: e.target.checked })}
              className="w-4 h-4 border border-black rounded-none text-black cursor-pointer accent-black"
            />
            <label htmlFor="detailedLog" className="text-black font-semibold uppercase text-[11px] cursor-pointer">Record Granular Execution Telemetry</label>
          </div>
        </div>
      </div>

      {/* 5. Messengers & Notification Integrations */}
      <div className="p-6 border border-black bg-white space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-black">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-black" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-black">
              Messengers & Notification Bots
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="msgAlerts"
              checked={settings.enableMessengerAlerts ?? true}
              onChange={(e) => setSettings({ ...settings, enableMessengerAlerts: e.target.checked })}
              className="w-4 h-4 border border-black rounded-none text-black cursor-pointer accent-black"
            />
            <label htmlFor="msgAlerts" className="text-black font-mono font-bold uppercase text-[11px] cursor-pointer">
              Active Dispatch
            </label>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">Telegram Bot API Token</label>
            <input
              type="password"
              placeholder="bot123456789:ABCdefGHIjkl..."
              value={settings.telegramBotToken ?? ''}
              onChange={(e) => setSettings({ ...settings, telegramBotToken: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            />
          </div>
          <div>
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">Telegram Broadcast Channel / Chat ID</label>
            <input
              type="text"
              placeholder="@razor_desk_alerts or -100123456789"
              value={settings.telegramDefaultChannel ?? ''}
              onChange={(e) => setSettings({ ...settings, telegramDefaultChannel: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            />
          </div>
          <div>
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">Discord Incident Webhook URL</label>
            <input
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={settings.discordWebhookUrl ?? ''}
              onChange={(e) => setSettings({ ...settings, discordWebhookUrl: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            />
          </div>
          <div>
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">Slack Alerts Webhook URL</label>
            <input
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={settings.slackWebhookUrl ?? ''}
              onChange={(e) => setSettings({ ...settings, slackWebhookUrl: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            />
          </div>
        </div>
      </div>

      {/* 6. SMS Gateways */}
      <div className="p-6 border border-black bg-white space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-black">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-black" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-black">
              SMS Gateway Providers & OTP Delivery
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="smsAlerts"
              checked={settings.enableSmsAlerts ?? false}
              onChange={(e) => setSettings({ ...settings, enableSmsAlerts: e.target.checked })}
              className="w-4 h-4 border border-black rounded-none text-black cursor-pointer accent-black"
            />
            <label htmlFor="smsAlerts" className="text-black font-mono font-bold uppercase text-[11px] cursor-pointer">
              Enable SMS Delivery
            </label>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">SMS Gateway Provider</label>
            <select
              value={settings.smsProvider ?? 'Twilio'}
              onChange={(e) => setSettings({ ...settings, smsProvider: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            >
              <option value="Twilio">Twilio Communications</option>
              <option value="AwsSns">AWS SNS Worldwide</option>
              <option value="Vonage">Vonage (Nexmo)</option>
              <option value="Infobip">Infobip Enterprise</option>
              <option value="KavehNegar">KavehNegar OTP</option>
            </select>
          </div>
          <div>
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">API Key / Secret Token</label>
            <input
              type="password"
              placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              value={settings.smsApiKey ?? ''}
              onChange={(e) => setSettings({ ...settings, smsApiKey: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            />
          </div>
          <div>
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">Sender ID / Origination Number</label>
            <input
              type="text"
              placeholder="+12025550192 or RAZOR_ALERT"
              value={settings.smsSenderNumber ?? ''}
              onChange={(e) => setSettings({ ...settings, smsSenderNumber: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            />
          </div>
        </div>
      </div>

      {/* 7. Payment Providers */}
      <div className="p-6 border border-black bg-white space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-black">
          <CreditCard className="w-4 h-4 text-black" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-black">
            Payment Gateways & Subscriptions Billing
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">Active Payment Processor</label>
            <select
              value={settings.paymentProvider ?? 'Stripe'}
              onChange={(e) => setSettings({ ...settings, paymentProvider: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            >
              <option value="Stripe">Stripe Connect</option>
              <option value="LemonSqueezy">Lemon Squeezy</option>
              <option value="Paddle">Paddle Merchant of Record</option>
              <option value="PayPal">PayPal Commerce</option>
            </select>
          </div>
          <div>
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">Primary Settlement Currency</label>
            <select
              value={settings.paymentCurrency ?? 'USD'}
              onChange={(e) => setSettings({ ...settings, paymentCurrency: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="AED">AED (د.إ)</option>
            </select>
          </div>
          <div>
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">Public / Publishable API Key</label>
            <input
              type="text"
              placeholder="pk_live_..."
              value={settings.paymentPublicKey ?? ''}
              onChange={(e) => setSettings({ ...settings, paymentPublicKey: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            />
          </div>
          <div>
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">Restricted Secret Key</label>
            <input
              type="password"
              placeholder="sk_live_..."
              value={settings.paymentSecretKey ?? ''}
              onChange={(e) => setSettings({ ...settings, paymentSecretKey: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-black block mb-1 font-semibold uppercase text-[11px]">Webhook Endpoint Secret</label>
            <input
              type="password"
              placeholder="whsec_..."
              value={settings.paymentWebhookSecret ?? ''}
              onChange={(e) => setSettings({ ...settings, paymentWebhookSecret: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none"
            />
          </div>
        </div>
      </div>

      {/* 8. Dynamic Subscription Tiers */}
      <div className="p-6 border border-black bg-white space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-black">
          <Layers className="w-4 h-4 text-black" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-black">
            Dynamic Subscription Tiers JSON Matrix
          </h2>
        </div>
        <p className="text-xs font-mono text-black">
          Define dynamic tier pricing, live trading permissions, node quotas, and storage bounds:
        </p>
        <textarea
          rows={6}
          value={settings.subscriptionTiersJson ?? ''}
          onChange={(e) => setSettings({ ...settings, subscriptionTiersJson: e.target.value })}
          className="w-full px-3 py-2 bg-white border border-black text-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black rounded-none leading-relaxed"
          placeholder='[{"tier":"Free","priceMonthly":0,"maxInstances":1,"allowLiveTrading":false,"allowOptimization":true,"storageDays":7}, ...]'
        />
      </div>

      {/* Form Controls */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onReset}
          disabled={savingSettings}
          className="flex items-center gap-2 px-4 py-2 border border-black bg-white hover:bg-black hover:text-white text-black font-mono text-xs font-bold uppercase rounded-none transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Factory Defaults</span>
        </button>
        <button
          type="submit"
          disabled={savingSettings}
          className="flex items-center gap-2 px-6 py-2 border border-black bg-black text-white hover:bg-zinc-800 font-mono text-xs font-bold uppercase rounded-none transition-colors disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{savingSettings ? 'Saving...' : 'Save Platform Policies'}</span>
        </button>
      </div>
    </form>
  );
}
