'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getApiClient } from '@/lib/api-client';
import { getExtensionKindBadge, formatCurrency } from '@razor/ui-kit';
import { useToast } from '@/components/ui/toast';
import {
  Search,
  Download,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Star,
  SlidersHorizontal,
  RotateCcw,
  Tag,
  CheckCircle2,
  Server,
  Zap,
} from 'lucide-react';
import type { MarketplaceItemPayload } from '@razor/api-client';

const KINDS = ['All', 'Strategy', 'Adapter', 'Indicator', 'NeuralNetwork', 'HookPlugin'] as const;

type SortOption = 'rating' | 'downloads' | 'price_asc' | 'price_desc';

function MarketplaceCatalogueContent() {
  const searchParams = useSearchParams();
  const targetEngineId = searchParams?.get('targetEngineId') || null;
  const targetSlot = searchParams?.get('slot') || null;
  const toast = useToast();

  const [items, setItems] = useState<MarketplaceItemPayload[]>([]);
  const [selectedKind, setSelectedKind] = useState<string>(targetSlot || 'All');
  const [searchQuery, setSearchQuery] = useState('');
  const [curatedOnly, setCuratedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    if (targetSlot && KINDS.includes(targetSlot as any)) {
      setSelectedKind(targetSlot);
    }
  }, [targetSlot]);

  useEffect(() => {
    async function fetchItems() {
      setLoading(true);
      setError(null);
      try {
        const client = getApiClient();
        const { data, error: err } = await client.GET('/api/marketplace/items', {
          params: {
            query: {
              kind: selectedKind === 'All' ? undefined : selectedKind,
              query: searchQuery.trim() || undefined,
              isCurated: curatedOnly ? true : undefined,
            },
          },
        });

        if (err) {
          setError('Failed to fetch extensions from Marketplace API.');
        } else if (data) {
          setItems(data);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error communicating with Marketplace API.');
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, [selectedKind, searchQuery, curatedOnly]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating ?? 5.0) - (a.rating ?? 5.0);
        case 'downloads':
          return (b.downloadsCount ?? b.downloads ?? 0) - (a.downloadsCount ?? a.downloads ?? 0);
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        default:
          return 0;
      }
    });
  }, [items, sortBy]);

  function resetFilters() {
    setSelectedKind(targetSlot || 'All');
    setSearchQuery('');
    setCuratedOnly(false);
    setSortBy('rating');
  }

  async function handleAssignToEngine(item: MarketplaceItemPayload) {
    if (!targetEngineId) return;

    setAssigningId(item.id);
    try {
      const client = getApiClient();
      // Ensure acquisition and manifest record exists
      await client.POST('/api/marketplace/items/{itemId}/acquire', {
        params: { path: { itemId: item.id } },
        body: { accountId: '00000000-0000-0000-0000-000000000000', targetInstanceId: targetEngineId },
      });

      const { data, error: err } = await client.PUT('/api/instances/{instanceId}/profile/selections', {
        params: { path: { instanceId: targetEngineId } },
        body: { kind: item.kind, name: item.name, isActive: true },
      });

      if (err) {
        const errorObj = typeof err === 'object' && err !== null ? err as Record<string, unknown> : {};
        const msg = errorObj.detail || errorObj.message || 'Engine profile rejected selection.';
        toast.error('Assignment Failed', String(msg));
      } else {
        toast.success('Slot Configured', `Assigned and activated ${item.name} on engine.`);
        const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3002';
        window.location.href = `${dashboardUrl}/instances/${targetEngineId}`;
      }
    } catch (e) {
      toast.error('Error', e instanceof Error ? e.message : 'Network error.');
    } finally {
      setAssigningId(null);
    }
  }

  const dashboardBaseUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3002';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Contextual Assignment Banner */}
      {targetEngineId && (
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono">
                Target Node: Engine {targetEngineId.slice(0, 8)}...
              </h3>
              <p className="text-xs text-indigo-700">
                Filter applied for {targetSlot || 'all'} additives. Click &quot;Assign to Engine&quot; to install and activate directly.
              </p>
            </div>
          </div>
          <a
            href={`${dashboardBaseUrl}/instances/${targetEngineId}`}
            className="text-xs font-mono font-semibold text-indigo-700 hover:text-indigo-900 underline shrink-0"
          >
            ← Return to Fleet Dashboard
          </a>
        </div>
      )}

      {/* Hero section */}
      <div className="text-center max-w-3xl mx-auto space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Curated Institutional Trading Additives</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900">
          Extend Your Razor Trading Engine
        </h1>
        <p className="text-sm text-zinc-600 max-w-2xl mx-auto leading-relaxed">
          Discover, audit, and hot-swap verified strategies, exchange adapters, indicators, and risk hooks.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search extensions, strategies, adapters, indicators..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-indigo-500 font-mono shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-xs font-mono text-zinc-700 focus:outline-none focus:border-indigo-500 shadow-sm"
            >
              <option value="rating">Highest Rated</option>
              <option value="downloads">Most Downloaded</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>

            <button
              onClick={() => setCuratedOnly((prev) => !prev)}
              className={`px-3 py-2.5 rounded-xl border text-xs font-mono font-medium transition-colors flex items-center gap-1.5 shadow-sm ${
                curatedOnly
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Curated Only</span>
            </button>
          </div>
        </div>

        {/* Category Pill Tabs */}
        <div role="tablist" aria-label="Extension categories" className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
          {KINDS.map((kind) => (
            <button
              key={kind}
              role="tab"
              aria-selected={selectedKind === kind}
              onClick={() => setSelectedKind(kind)}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                selectedKind === kind
                  ? 'bg-indigo-600 border-indigo-600 text-white font-semibold shadow-sm'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              {kind}
            </button>
          ))}
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="py-20 text-center text-sm font-mono text-zinc-500 space-y-2">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Loading curated extension catalogue...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setSelectedKind((k) => k)}
            className="px-2.5 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && sortedItems.length === 0 && (
        <div className="py-20 text-center rounded-2xl border border-dashed border-zinc-300 bg-white space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-500 flex items-center justify-center mx-auto">
            <Tag className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-zinc-800 font-mono">No Extensions Found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            No matching extensions found for your current category, search, or curation criteria.
          </p>
          <div className="pt-2">
            <button
              onClick={resetFilters}
              className="px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-xs font-mono text-zinc-700 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Cards Grid */}
      {!loading && sortedItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedItems.map((item) => {
            const kindBadge = getExtensionKindBadge(item.kind);
            const downloadCount = item.downloadsCount ?? item.downloads ?? 0;
            const ratingScore = item.rating ?? 5.0;
            const isAssigning = assigningId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-2xl bg-white border border-zinc-200 p-6 flex flex-col justify-between hover:border-zinc-300 transition-all duration-200 shadow-sm hover:shadow-md group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-zinc-900 text-base tracking-tight truncate group-hover:text-indigo-600 transition-colors">
                          {item.name}
                        </h3>
                        {item.isCurated && (
                          <span
                            title="Audited and curated by Razor Platform"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>Curated</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 font-mono">
                        by <span className="text-zinc-700 font-medium">{item.author}</span> • v{item.version}
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono shrink-0 ${kindBadge.className}`}>
                      {kindBadge.label}
                    </span>
                  </div>

                  <p className="mt-3.5 text-xs text-zinc-600 line-clamp-3 leading-relaxed">
                    {item.description || 'No description provided.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-mono text-zinc-500">
                    <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{ratingScore.toFixed(1)}</span>
                    </div>

                    <div className="flex items-center gap-1 text-zinc-500">
                      <Download className="w-3.5 h-3.5" />
                      <span>{downloadCount}</span>
                    </div>

                    <div className="text-[11px] text-zinc-400">
                      SDK v{item.sdkVersion}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-zinc-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Price</span>
                    <span className="font-bold text-zinc-900 text-sm font-mono">
                      {item.price === 0 ? 'Free' : formatCurrency(item.price)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {targetEngineId && (
                      <button
                        type="button"
                        onClick={() => handleAssignToEngine(item)}
                        disabled={isAssigning}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-mono font-semibold transition-all shadow-sm"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{isAssigning ? 'Assigning...' : 'Assign'}</span>
                      </button>
                    )}

                    <Link
                      href={`/items/${item.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-mono transition-colors"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3 h-3" />
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

export default function MarketplaceCataloguePage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm font-mono text-zinc-500">
          Loading Marketplace Catalogue...
        </div>
      }
    >
      <MarketplaceCatalogueContent />
    </Suspense>
  );
}
