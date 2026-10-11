'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiClient } from '@/lib/api-client';
import { getExtensionKindBadge, formatCurrency } from '@razor/ui-kit';
import { Search, Download, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import type { MarketplaceItemPayload } from '@razor/api-client';

const KINDS = ['All', 'Strategy', 'Adapter', 'Indicator', 'NeuralNetwork', 'HookPlugin'];

export default function MarketplaceCataloguePage() {
  const [items, setItems] = useState<MarketplaceItemPayload[]>([]);
  const [selectedKind, setSelectedKind] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
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
              query: searchQuery || undefined,
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
  }, [selectedKind, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="text-center max-w-2xl mx-auto space-y-3 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Curated Algorithmic Extensions</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Extend Your Razor Trading Engine
        </h1>
        <p className="text-sm text-zinc-400">
          Discover certified adapters, quantitative strategies, indicators, and deep learning models built for zero-alloc high-frequency execution.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Kind Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {KINDS.map((kind) => (
            <button
              key={kind}
              onClick={() => setSelectedKind(kind)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap ${
                selectedKind === kind
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {kind}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            type="text"
            placeholder="Search extensions..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="py-16 text-center text-sm font-mono text-zinc-400">
          Loading extensions catalogue...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-mono">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && items.length === 0 && (
        <div className="py-20 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20">
          <h3 className="text-base font-semibold text-zinc-200">No Extensions Found</h3>
          <p className="mt-1 text-sm text-zinc-400">Try adjusting your category filter or search query.</p>
        </div>
      )}

      {/* Cards Grid */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const kindBadge = getExtensionKindBadge(item.kind);
            return (
              <div
                key={item.id}
                className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-white text-base tracking-tight">{item.name}</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">by {item.author}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${kindBadge.className}`}>
                      {kindBadge.label}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-zinc-300 line-clamp-3 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="font-bold text-white text-sm">
                      {item.price === 0 ? 'Free' : formatCurrency(item.price)}
                    </span>
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" />
                      {item.downloadsCount}
                    </span>
                  </div>

                  <Link
                    href={`/items/${item.id}`}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                  >
                    <span>View Details</span>
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
