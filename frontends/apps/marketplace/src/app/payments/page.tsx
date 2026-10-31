'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  DollarSign,
  ShieldCheck,
  Zap,
  Globe,
  Lock,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Card, Badge, Button } from '@razor/ui-kit';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/auth-context';

export interface PaymentProviderConfig {
  currency: 'USDT' | 'IRT' | 'USD';
  providerName: 'NowPayments' | 'Paymento' | 'ZarinPal' | 'Stripe';
  isEnabled: boolean;
  apiKey: string;
  secretKey: string;
  merchantId: string;
  isSandbox: boolean;
  callbackUrl: string;
}

export default function MarketplacePaymentsPage() {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  // Provider states
  // 1. NowPayments (Crypto / USDT)
  const [nowPaymentsEnabled, setNowPaymentsEnabled] = useState(true);
  const [nowPaymentsApiKey, setNowPaymentsApiKey] = useState('np_live_sec_****************');
  const [nowPaymentsIpnSecret, setNowPaymentsIpnSecret] = useState('ipn_sec_****************');
  const [nowPaymentsSandbox, setNowPaymentsSandbox] = useState(false);

  // 2. Paymento (Crypto / USDT)
  const [paymentoEnabled, setPaymentoEnabled] = useState(false);
  const [paymentoMerchantToken, setPaymentoMerchantToken] = useState('');
  const [paymentoClientId, setPaymentoClientId] = useState('');

  // 3. ZarinPal (IRT - Toman)
  const [zarinPalEnabled, setZarinPalEnabled] = useState(false);
  const [zarinPalMerchantId, setZarinPalMerchantId] = useState('');
  const [zarinPalSandbox, setZarinPalSandbox] = useState(true);

  // 4. Stripe (Global USD/EUR)
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [stripePublishableKey, setStripePublishableKey] = useState('pk_live_****************');
  const [stripeSecretKey, setStripeSecretKey] = useState('sk_live_****************');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const configs = {
        nowPayments: { enabled: nowPaymentsEnabled, apiKey: nowPaymentsApiKey, ipnSecret: nowPaymentsIpnSecret, sandbox: nowPaymentsSandbox },
        paymento: { enabled: paymentoEnabled, merchantToken: paymentoMerchantToken, clientId: paymentoClientId },
        zarinPal: { enabled: zarinPalEnabled, merchantId: zarinPalMerchantId, sandbox: zarinPalSandbox },
        stripe: { enabled: stripeEnabled, publishableKey: stripePublishableKey, secretKey: stripeSecretKey },
        updatedAt: new Date().toISOString(),
      };
      // Persist securely to backend database settings instead of vulnerable browser localStorage
      const res = await fetch('/api/admin/payments/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configJson: JSON.stringify(configs) }),
      });
      if (!res.ok) {
        throw new Error('Backend rejected payment configuration');
      }
      toast.success('Configuration Saved', 'Payment providers updated securely on server.');
    } catch {
      toast.error('Save Failed', 'Failed to store payment provider configurations.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 font-sans max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#3ECF8E] uppercase tracking-wider mb-1">
            <CreditCard className="w-4 h-4" />
            <span>Marketplace Treasury & Gateways</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Payment Provider Configurations
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Configure multi-tenant payment gateways associated with each supported currency (USDT, IRT, USD).
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-mono text-xs font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto shadow-md shadow-indigo-600/20"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'SAVING...' : 'SAVE CONFIGURATIONS'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: Crypto Gateways (USDT / Multi-Tenant) */}
        <div className="p-6 rounded-xl border border-[#262626] bg-[#171717] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                ₮
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-100">Crypto Gateways (USDT / Multi-Tenant)</h2>
                <span className="text-[11px] text-zinc-500 font-mono">Tether USDT, Bitcoin, Ethereum</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              ACTIVE PROVIDERS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* NowPayments Card */}
            <div className="p-4 rounded-lg border border-[#262626] bg-[#141414] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-100 font-mono">NowPayments Direct Gateway</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nowPaymentsEnabled}
                    onChange={(e) => setNowPaymentsEnabled(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <span className="text-xs font-semibold text-zinc-300">Enabled</span>
                </label>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">API Key</label>
                  <input
                    type="password"
                    value={nowPaymentsApiKey}
                    onChange={(e) => setNowPaymentsApiKey(e.target.value)}
                    placeholder="np_live_..."
                    className="w-full px-3 py-1.5 border border-[#262626] rounded-md text-xs font-mono bg-[#171717] focus:outline-none focus:ring-1 focus:ring-1 focus:ring-[#3ECF8E]/30 focus:border-[#3ECF8E]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">IPN Secret</label>
                  <input
                    type="password"
                    value={nowPaymentsIpnSecret}
                    onChange={(e) => setNowPaymentsIpnSecret(e.target.value)}
                    placeholder="ipn_sec_..."
                    className="w-full px-3 py-1.5 border border-[#262626] rounded-md text-xs font-mono bg-[#171717] focus:outline-none focus:ring-1 focus:ring-1 focus:ring-[#3ECF8E]/30 focus:border-[#3ECF8E]"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="np_sandbox"
                    checked={nowPaymentsSandbox}
                    onChange={(e) => setNowPaymentsSandbox(e.target.checked)}
                    className="w-3.5 h-3.5 accent-indigo-600"
                  />
                  <label htmlFor="np_sandbox" className="text-[11px] font-mono text-zinc-400 cursor-pointer">
                    Enable Sandbox Mode
                  </label>
                </div>
              </div>
            </div>

            {/* Paymento Card */}
            <div className="p-4 rounded-lg border border-[#262626] bg-[#141414] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-100 font-mono">Paymento Multi-Tenant Gateway</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentoEnabled}
                    onChange={(e) => setPaymentoEnabled(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <span className="text-xs font-semibold text-zinc-300">Enabled</span>
                </label>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">Merchant Token</label>
                  <input
                    type="password"
                    value={paymentoMerchantToken}
                    onChange={(e) => setPaymentoMerchantToken(e.target.value)}
                    placeholder="pay_token_..."
                    className="w-full px-3 py-1.5 border border-[#262626] rounded-md text-xs font-mono bg-[#171717] focus:outline-none focus:ring-1 focus:ring-1 focus:ring-[#3ECF8E]/30 focus:border-[#3ECF8E]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">Client ID</label>
                  <input
                    type="text"
                    value={paymentoClientId}
                    onChange={(e) => setPaymentoClientId(e.target.value)}
                    placeholder="client_id_..."
                    className="w-full px-3 py-1.5 border border-[#262626] rounded-md text-xs font-mono bg-[#171717] focus:outline-none focus:ring-1 focus:ring-1 focus:ring-[#3ECF8E]/30 focus:border-[#3ECF8E]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Iran Fiat Gateways (IRT - Toman) */}
        <div className="p-6 rounded-xl border border-[#262626] bg-[#171717] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs">
                تومان
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-100">National Fiat Gateways (IRT - Toman)</h2>
                <span className="text-[11px] text-zinc-500 font-mono">
                  Iranian Toman (IRR dropped; adopting direct IRT denomination)
                </span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
              STANDBY / ADVISORY
            </span>
          </div>

          <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-zinc-100 font-mono">ZarinPal Payment Gateway</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-mono font-semibold">
                  Domain Verification Required
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={zarinPalEnabled}
                  onChange={(e) => setZarinPalEnabled(e.target.checked)}
                  className="w-4 h-4 accent-amber-600"
                />
                <span className="text-xs font-semibold text-zinc-300">Enabled</span>
              </label>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-amber-800 font-sans bg-amber-100/60 p-3 rounded-md">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
              <span>
                <strong>Architectural Note:</strong> ZarinPal requires the publisher or operator to have a registered domain/subdomain with valid e-namad authentication. Currently kept in standby mode without active routing until domain verification research is complete.
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Merchant ID (UUID)</label>
                <input
                  type="text"
                  value={zarinPalMerchantId}
                  onChange={(e) => setZarinPalMerchantId(e.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  className="w-full px-3 py-1.5 border border-[#262626] rounded-md text-xs font-mono bg-[#171717] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Global Fiat Gateways (USD/EUR) */}
        <div className="p-6 rounded-xl border border-[#262626] bg-[#171717] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                $
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-100">Global Fiat Gateways (USD / EUR)</h2>
                <span className="text-[11px] text-zinc-500 font-mono">Credit Card, Apple Pay, SEPA Direct Debit</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
              CONFIGURED
            </span>
          </div>

          <div className="p-4 rounded-lg border border-[#262626] bg-[#141414] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-zinc-100 font-mono">Stripe Connect Marketplace</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stripeEnabled}
                  onChange={(e) => setStripeEnabled(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className="text-xs font-semibold text-zinc-300">Enabled</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Publishable Key</label>
                <input
                  type="text"
                  value={stripePublishableKey}
                  onChange={(e) => setStripePublishableKey(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#262626] rounded-md text-xs font-mono bg-[#171717] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Secret Key</label>
                <input
                  type="password"
                  value={stripeSecretKey}
                  onChange={(e) => setStripeSecretKey(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#262626] rounded-md text-xs font-mono bg-[#171717] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
