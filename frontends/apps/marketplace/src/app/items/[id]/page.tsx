'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { getApiClient } from '@/lib/api-client';
import { getExtensionKindBadge, formatCurrency, formatTimestamp } from '@razor/ui-kit';
import { ArrowLeft, Download, ShieldCheck, CheckCircle2, KeyRound } from 'lucide-react';
import type { MarketplaceItemPayload } from '@razor/api-client';

interface ItemDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { id: itemId } = use(params);

  const [item, setItem] = useState<MarketplaceItemPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [accountId, setAccountId] = useState('acc-operator-default');
  const [targetInstanceId, setTargetInstanceId] = useState('');
  const [acquiring, setAcquiring] = useState(false);
  const [acquiredLicense, setAcquiredLicense] = useState<string | null>(null);

  useEffect(() => {
    async function fetchItem() {
      setLoading(true);
      setError(null);
      try {
        const client = getApiClient();
        const { data, error: err } = await client.GET('/api/marketplace/items/{itemId}', {
          params: { path: { itemId } },
        });

        if (err) {
          setError('Failed to fetch extension details.');
        } else if (data) {
          setItem(data);
        }
      } catch (e: any) {
        setError(e?.message || 'Error communicating with Marketplace API.');
      } finally {
        setLoading(false);
      }
    }

    fetchItem();
  }, [itemId]);

  async function handleAcquire(e: React.FormEvent) {
    e.preventDefault();
    setAcquiring(true);
    setAcquiredLicense(null);
    try {
      const client = getApiClient();
      const { data, error: err } = await client.POST('/api/marketplace/items/{itemId}/acquire', {
        params: { path: { itemId } },
        body: {
          accountId,
          targetInstanceId: targetInstanceId || undefined,
        },
      });

      if (err) {
        alert('Failed to acquire license.');
      } else if (data) {
        setAcquiredLicense(data.licenseKey);
      }
    } catch (e: any) {
      alert(`Acquisition error: ${e?.message}`);
    } finally {
      setAcquiring(false);
    }
  }

  const kindBadge = item ? getExtensionKindBadge(item.kind) : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Link */}
      <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
        <Link href="/" className="hover:text-zinc-200 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Catalogue</span>
        </Link>
        <span>/</span>
        <span className="text-zinc-300">{itemId}</span>
      </div>

      {loading && (
        <div className="py-16 text-center text-sm font-mono text-zinc-400">
          Loading extension specification...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-mono">
          {error}
        </div>
      )}

      {item && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-white">{item.name}</h1>
                {kindBadge && (
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${kindBadge.className}`}>
                    {kindBadge.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Author: <span className="text-zinc-300">{item.author}</span> • Version: v{item.version}
              </p>
            </div>

            <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                Description & Capabilities
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                {item.description}
              </p>
            </div>

            <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                System Compatibility
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/50">
                  <span className="text-zinc-400 block">Target SDK Version</span>
                  <span className="font-bold text-white mt-1 block">v{item.sdkVersion}</span>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/50">
                  <span className="text-zinc-400 block">Total Downloads</span>
                  <span className="font-bold text-white mt-1 block">{item.downloadsCount} installations</span>
                </div>
              </div>
            </div>
          </div>

          {/* Acquisition Sidebar */}
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-6">
              <div>
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block">License Price</span>
                <span className="text-3xl font-bold text-white mt-1 block">
                  {item.price === 0 ? 'Free' : formatCurrency(item.price)}
                </span>
              </div>

              {acquiredLicense ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>License Acquired!</span>
                  </div>
                  <div className="mt-2 p-2 bg-zinc-950 rounded border border-zinc-800 text-[11px] font-mono text-zinc-200 break-all select-all">
                    {acquiredLicense}
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    This key has been registered with your Cloud account and is ready for engine deployment.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleAcquire} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">Account ID</label>
                    <input
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      type="text"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">Target Engine (Optional)</label>
                    <input
                      value={targetInstanceId}
                      onChange={(e) => setTargetInstanceId(e.target.value)}
                      type="text"
                      placeholder="e.g. inst-12345"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={acquiring}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs font-mono transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{acquiring ? 'Acquiring...' : 'Acquire License'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
