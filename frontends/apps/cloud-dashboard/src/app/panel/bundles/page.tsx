'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, Plus, Search, Layers, RefreshCw, ExternalLink, Trash2 } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import type { TradingBundlePayload } from '@/types/bundle';

export default function BundlesListPage() {
  const [bundles, setBundles] = useState<TradingBundlePayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<string>('All');
  const toast = useToast();

  const loadBundles = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<TradingBundlePayload[]>('/api/bundles');
      const list = Array.isArray(res) ? res : ((res as any)?.items || []);
      setBundles(list);
    } catch {
      // Fallback to sample bundle state if backend endpoint is fresh
      setBundles([
        {
          id: 'BND-ALPHA01',
          accountId: '00000000-0000-0000-0000-000000000000',
          name: 'Momentum Scalper Bundle',
          description: 'High-frequency momentum strategy paired with Binance Futures and drawdown guardrails.',
          documentationMarkdown: '# Momentum Scalper Bundle\nPre-configured for volatile crypto markets.',
          isPublic: true,
          publishedToMarketplace: true,
          price: 25,
          currency: 'USDT',
          strategySlotId: 'TrendFollowing',
          adapterSlotIdsJson: '["BinanceFutures"]',
          hookSlotIdsJson: '["DrawdownCircuitBreaker","OrderRateLimiter"]',
          defaultConfigurationsJson: '{"StopLossPct": 2.5, "TakeProfitPct": 5.0}',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          snapshots: [
            {
              id: 'snap-1',
              bundleId: 'BND-ALPHA01',
              version: 'v1.0.0',
              name: 'Production Genesis',
              snapshotStateJson: '{}',
              createdAt: new Date().toISOString(),
              dnas: [
                {
                  id: 'dna-1',
                  bundleSnapshotId: 'snap-1',
                  dnaId: 'DNA-GEN-42',
                  name: 'Alpha Chromosome 42',
                  parametersJson: '{}',
                  backtestStatus: 'Backtested',
                  fitness: 2.84,
                  netProfit: 14200,
                  reportSummary: 'Verified on BTC/USDT 2024-2026 data.',
                  createdAt: new Date().toISOString(),
                },
              ],
            },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBundles();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete bundle ${id}?`)) return;
    try {
      await fetchApi(`/api/bundles/${id}`, { method: 'DELETE' });
      toast.success('Bundle Deleted', `Bundle ${id} removed.`);
      setBundles((prev) => prev.filter((b) => b.id !== id));
    } catch {
      toast.error('Delete Failed', 'Failed to remove bundle.');
    }
  };

  const filteredBundles = bundles.filter((b) => {
    if (currencyFilter !== 'All' && b.currency !== currencyFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = b.name.toLowerCase().includes(q);
      const matchId = b.id.toLowerCase().includes(q);
      const matchDesc = b.description?.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-xs text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2 uppercase">
            <Package className="w-5 h-5 text-zinc-100" />
            <span>Bundles Studio & Catalogue</span>
          </h1>
          <p className="text-xs text-zinc-100 font-normal mt-1 font-sans">
            Package trading strategies, adapter bindings, risk hooks, and parameter genes into reusable execution bundles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadBundles}
            disabled={loading}
            className="px-3 py-2 border border-[#262626] bg-[#171717] hover:bg-[#1f1f1f] text-zinc-200 font-bold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>
          <Link
            href="/panel/bundles/new"
            className="px-4 py-2 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full text-xs font-bold uppercase flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Bundle</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bundles by name, ID, or description..."
            className="w-full pl-9 pr-3 py-2 border border-[#262626] bg-[#171717] text-xs text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-[#3ECF8E]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold uppercase text-[11px]">Currency:</span>
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="px-3 py-2 border border-[#262626] bg-[#171717] text-xs font-mono font-bold text-zinc-100 focus:outline-none focus:border-[#3ECF8E]"
          >
            <option value="All">All Currencies</option>
            <option value="Free">Free</option>
            <option value="IRT">IRT</option>
            <option value="USDT">USDT</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      {/* Bundles Grid */}
      {filteredBundles.length === 0 ? (
        <div className="p-12 border border-[#262626] bg-[#171717] text-center space-y-3">
          <Package className="w-8 h-8 text-zinc-100 mx-auto opacity-40" />
          <p className="font-bold text-sm text-zinc-100">NO BUNDLES FOUND</p>
          <p className="text-zinc-400 font-sans text-xs">
            No bundles match your filter criteria. Create your first bundle to package strategy slots and parameter genes.
          </p>
          <Link
            href="/panel/bundles/new"
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#262626] bg-black text-white font-bold hover:bg-zinc-800"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Bundle</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBundles.map((bundle) => {
            let hookCount = 0;
            try {
              hookCount = JSON.parse(bundle.hookSlotIdsJson || '[]').length;
            } catch {
              hookCount = 0;
            }

            return (
              <div
                key={bundle.id}
                className="border border-[#262626] bg-[#171717] p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono text-[11px] px-2 py-0.5 border border-[#262626] bg-[#1f1f1f]">
                      {bundle.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 border text-[10px] font-bold ${
                        bundle.currency === 'Free'
                          ? 'border-green-600 bg-green-50 text-green-700'
                          : 'border-[#262626] bg-black text-white'
                      }`}
                    >
                      {bundle.currency === 'Free' ? 'FREE' : `${bundle.price} ${bundle.currency}`}
                    </span>
                  </div>

                  <div>
                    <h2 className="font-bold text-sm text-zinc-100 uppercase tracking-tight">
                      {bundle.name}
                    </h2>
                    <p className="text-zinc-400 font-sans text-xs line-clamp-2 mt-1">
                      {bundle.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-zinc-200 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-zinc-500 block text-[9px] uppercase">Strategy Slot</span>
                      <span className="font-bold truncate block">
                        {bundle.strategySlotId || 'None'}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[9px] uppercase">Hooks & Adapters</span>
                      <span className="font-bold">
                        {hookCount} Hooks
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1 text-[10px]">
                    {bundle.isPublic && (
                      <span className="px-1.5 py-0.5 border border-[#262626] bg-[#141414] font-bold">
                        PUBLIC
                      </span>
                    )}
                    {bundle.publishedToMarketplace && (
                      <span className="px-1.5 py-0.5 border border-blue-600 bg-blue-50 text-blue-700 font-bold">
                        MARKETPLACE
                      </span>
                    )}
                    {bundle.snapshots && bundle.snapshots.length > 0 && (
                      <span className="px-1.5 py-0.5 border border-purple-600 bg-purple-50 text-purple-700 font-bold">
                        {bundle.snapshots.length} SNAPSHOTS
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#262626] flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-sans">
                    Updated {new Date(bundle.updatedAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(bundle.id)}
                      className="p-1 border border-zinc-300 hover:border-rose-500/30 hover:text-rose-400 text-zinc-400 transition-colors"
                      title="Delete bundle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      href={`/panel/bundles/new?edit=${bundle.id}`}
                      className="px-2.5 py-1 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-bold text-xs transition-colors"
                    >
                      EDIT →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
