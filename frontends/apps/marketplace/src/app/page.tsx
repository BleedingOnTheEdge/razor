'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getApiClient } from '@/lib/api-client';
import { getExtensionKindBadge, formatCurrency } from '@razor/ui-kit';
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
} from 'lucide-react';
import type { MarketplaceItemPayload } from '@razor/api-client';

const KINDS = ['All', 'Strategy', 'Adapter', 'Indicator', 'NeuralNetwork', 'HookPlugin'] as const;

type SortOption = 'rating' | 'downloads' | 'price_asc' | 'price_desc';

export default function MarketplaceCataloguePage() {
  const [items, setItems] = useState<MarketplaceItemPayload[]>([]);
  const [selectedKind, setSelectedKind] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [curatedOnly, setCuratedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (e: any) {
        setError(e?.message || 'Error communicating with Marketplace API.');
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
    setSelectedKind('All');
    setSearchQuery('');
    setCuratedOnly(false);
    setSortBy('rating');
  }

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="text-center max-w-3xl mx-auto space-y-3 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Curated Institutional Algorithmic Extensions</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Extend Your Razor Trading Engine
        </h1>
        <p className="text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Discover certified adapters, quantitative strategies, indicators, and deep learning models built for zero-alloc high-frequency execution.
        </p>

        {/* Quick stats pills */}
        <div className="pt-2 flex items-center justify-center gap-4 text-xs font-mono text-zinc-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Deterministic Reproduction Certified</span>
          </span>
          <span className="text-zinc-700">•</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Engine Sandbox Safe</span>
          </span>
        </div>
      </div>

      {/* Search, Categories, and Control Bar */}
      <div className="space-y-4 p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0" role="tablist" aria-label="Extension category filters">
            {KINDS.map((kind) => {
              const active = selectedKind === kind;
              return (
                <button
                  key={kind}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedKind(kind)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/30'
                      : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  {kind}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type="text"
              placeholder="Search extensions, authors, models..."
              aria-label="Search extensions"
              className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Second bar: Curated toggle + Sorting */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-zinc-800/60 text-xs font-mono">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white select-none">
              <input
                type="checkbox"
                checked={curatedOnly}
                onChange={(e) => setCuratedOnly(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Curated Only</span>
              </span>
            </label>

            {(selectedKind !== 'All' || searchQuery || curatedOnly) && (
              <button
                onClick={resetFilters}
                className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-zinc-400 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Sort:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort extensions"
              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="rating">Top Rated</option>
              <option value="downloads">Most Downloaded</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="py-20 text-center text-sm font-mono text-zinc-400 space-y-2">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Loading curated extension catalogue...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setSelectedKind((k) => k)}
            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && sortedItems.length === 0 && (
        <div className="py-20 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-800/80 text-zinc-400 flex items-center justify-center mx-auto">
            <Tag className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-zinc-200 font-mono">No Extensions Found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            No matching extensions found for your current category, search, or curation criteria.
          </p>
          <div className="pt-2">
            <button
              onClick={resetFilters}
              className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-200 transition-colors"
            >
              Reset All Filters
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

            return (
              <div
                key={item.id}
                className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-6 flex flex-col justify-between hover:border-zinc-700 transition-all duration-200 shadow-sm hover:shadow-indigo-500/5 group"
              >
                <div>
                  {/* Top Bar: Title & Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-white text-base tracking-tight truncate group-hover:text-indigo-300 transition-colors">
                          {item.name}
                        </h3>
                        {item.isCurated && (
                          <span
                            title="Audited and curated by Razor Platform"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>Curated</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                        by <span className="text-zinc-300">{item.author}</span> • v{item.version}
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono shrink-0 ${kindBadge.className}`}>
                      {kindBadge.label}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="mt-3.5 text-xs text-zinc-300 line-clamp-3 leading-relaxed">
                    {item.description || 'No description provided.'}
                  </p>

                  {/* Rating & Stats Bar */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono text-zinc-400">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{ratingScore.toFixed(1)}</span>
                    </div>

                    <div className="flex items-center gap-1 text-zinc-400">
                      <Download className="w-3.5 h-3.5" />
                      <span>{downloadCount}</span>
                    </div>

                    <div className="text-[11px] text-zinc-400">
                      SDK v{item.sdkVersion}
                    </div>
                  </div>
                </div>

                {/* Footer Bar: Price & Action */}
                <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Price</span>
                    <span className="font-bold text-white text-sm font-mono">
                      {item.price === 0 ? 'Free' : formatCurrency(item.price)}
                    </span>
                  </div>

                  <Link
                    href={`/items/${item.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-transparent text-xs font-mono font-semibold transition-all duration-150"
                  >
                    <span>Specification</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
