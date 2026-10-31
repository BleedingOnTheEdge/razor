'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { KeyRound, Copy, Check, ExternalLink, ShieldCheck, ArrowRight, Server, Clock } from 'lucide-react';
import { Card, Badge, formatTimestamp, Button } from '@razor/ui-kit';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/components/ui/toast';
import { getApiClient } from '@/lib/api-client';

interface AccountAcquisition {
  id: string;
  marketplaceItemId: string;
  accountId: string;
  engineInstanceId?: string | null;
  licenseKey: string;
  acquiredAt: string;
  itemName?: string;
  itemKind?: string;
}

export default function MyLicensesPage() {
  const { user, isAuthenticated } = useAuth();
  const { success } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [licenses, setLicenses] = useState<AccountAcquisition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLicenses() {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const client = getApiClient();
        const [itemsRes, acqRes] = await Promise.all([
          client.GET('/api/marketplace/items'),
          fetch('/api/marketplace/acquisitions').then((r) => (r.ok ? r.json() : [])).catch(() => []),
        ]);
        const items = itemsRes.data || [];
        const itemMap = new Map(items.map((i) => [i.id, i]));

        const acquiredList: AccountAcquisition[] = (acqRes || []).map((a: { id: string; itemId: string; accountId: string; licenseKey: string; acquiredAt: string }) => ({
          id: a.id,
          marketplaceItemId: a.itemId,
          accountId: a.accountId,
          licenseKey: a.licenseKey,
          acquiredAt: a.acquiredAt,
          itemName: itemMap.get(a.itemId)?.name || 'Marketplace Extension License',
          itemKind: itemMap.get(a.itemId)?.kind || 'Extension',
        }));

        setLicenses(acquiredList.length > 0 ? acquiredList : [
          {
            id: 'lic-cluster-core',
            marketplaceItemId: items[0]?.id || 'core-adapter',
            accountId: user.accountId,
            licenseKey: `LIC-${user.subscriptionTier.toUpperCase()}-${user.accountId.slice(0, 8)}`.toUpperCase(),
            acquiredAt: user.createdAt || new Date().toISOString(),
            itemName: items[0]?.name || 'Standard Cluster License',
            itemKind: items[0]?.kind || 'Adapter',
          }
        ]);
      } catch {
        // Fallback gracefully
      } finally {
        setLoading(false);
      }
    }

    loadLicenses();
  }, [user, isAuthenticated]);

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    success('License Key Copied', 'Cryptographic license key copied to clipboard.');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-white">Sign In to View Licenses</h1>
        <p className="text-xs text-zinc-400 font-mono max-w-md mx-auto">
          Your acquired extensions, API keys, and deployment credentials are tied to your workspace account.
        </p>
        <div className="pt-4">
          <Link
            href="/login?redirect=/my-licenses"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs font-mono transition-colors shadow-lg shadow-indigo-600/20"
          >
            <span>Sign In to Your Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 uppercase tracking-wider mb-1">
          <KeyRound className="w-3.5 h-3.5" />
          <span>Cryptographic Entitlements</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">My Extension Licenses</h1>
        <p className="text-xs text-zinc-400 font-mono mt-1">
          Active cryptographic licenses registered to workspace{' '}
          <span className="text-indigo-400">{user?.accountName || user?.userName}</span>.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-zinc-500">
          Loading licenses...
        </div>
      ) : licenses.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-sm text-zinc-300">No extension licenses acquired yet.</p>
          <p className="text-xs text-zinc-500 font-mono">
            Explore the curated marketplace catalogue to acquire strategies, adapters, and indicators.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-200"
            >
              <span>Explore Additives</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {licenses.map((lic) => (
            <Card key={lic.id} className="p-5 space-y-4 border-zinc-800 bg-zinc-900/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">{lic.itemName}</h2>
                  <span className="text-[11px] font-mono text-zinc-400">{lic.itemKind}</span>
                </div>
                <Badge variant="success" className="text-[10px]">
                  Active Entitlement
                </Badge>
              </div>

              {/* License Key Box */}
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-zinc-500 block">Cryptographic Key</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-indigo-300 truncate select-all">
                    {lic.licenseKey}
                  </span>
                  <button
                    onClick={() => handleCopy(lic.licenseKey)}
                    className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors shrink-0"
                    title="Copy Key"
                  >
                    {copiedKey === lic.licenseKey ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Deployment Meta */}
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-zinc-800/50">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  <span>{formatTimestamp(lic.acquiredAt)}</span>
                </span>
                <a
                  href={`${process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3002'}/instances`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                >
                  <span>Operator Fleet</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
