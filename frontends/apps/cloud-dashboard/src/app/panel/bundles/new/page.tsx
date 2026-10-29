'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Package,
  Save,
  ArrowLeft,
  Dice5,
  Eye,
  FileText,
  DollarSign,
  Globe,
  Store,
  Layers,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { ComponentSlotGrid } from '@/components/bundles/ComponentSlotGrid';
import { DynamicParameterGenerator } from '@/components/bundles/DynamicParameterGenerator';
import { BundleSnapshotPanel } from '@/components/bundles/BundleSnapshotPanel';
import type { AvailableComponent, BundleSnapshotPayload, TradingBundlePayload } from '@/types/bundle';

// Mock/Catalog components available to the account
const SAMPLE_AVAILABLE_COMPONENTS: AvailableComponent[] = [
  // Strategies
  {
    id: 'TrendFollowing',
    name: 'Trend Following Dual EMA',
    kind: 'Strategy',
    description: 'Exponential moving average cross strategy with ATR volatility trailing stop.',
    version: '1.2.0',
    author: 'Razor Quant Labs',
    category: 'Trend',
    isOwned: true,
  },
  {
    id: 'MeanReversion',
    name: 'Bollinger Mean Reversion',
    kind: 'Strategy',
    description: 'Statistical mean reversion trading overextended standard deviations.',
    version: '2.0.1',
    author: 'Razor Quant Labs',
    category: 'MeanReversion',
    isOwned: true,
  },
  {
    id: 'OrderBookImbalance',
    name: 'Order Book Microstructure',
    kind: 'Strategy',
    description: 'High-frequency order flow imbalance scalper for perpetual futures.',
    version: '1.0.4',
    author: 'AlphaFlow Labs',
    category: 'Microstructure',
    isOwned: true,
  },
  {
    id: 'GridTrading',
    name: 'Geometric Grid Market Maker',
    kind: 'Strategy',
    description: 'Multi-level liquidity provision grid for ranging currency pairs.',
    version: '3.1.0',
    author: 'Community Contributor',
    category: 'MarketMaking',
    isOwned: false,
  },

  // Adapters
  {
    id: 'BinanceFutures',
    name: 'Binance USDT-M Futures Direct',
    kind: 'Adapter',
    description: 'Ultra-low latency WebSocket streaming and REST order gateway for Binance Futures.',
    version: '2.4.0',
    author: 'BleedingOnTheEdge Core',
    category: 'Perpetuals',
    isOwned: true,
  },
  {
    id: 'BybitPerpetuals',
    name: 'Bybit Linear V5 Direct',
    kind: 'Adapter',
    description: 'Direct DMA connection to Bybit Linear perpetual markets with sub-millisecond execution.',
    version: '2.1.2',
    author: 'BleedingOnTheEdge Core',
    category: 'Perpetuals',
    isOwned: true,
  },
  {
    id: 'PaperBroker',
    name: 'Paper Broker Emulator',
    kind: 'Adapter',
    description: 'Deterministic in-memory matching engine for zero-risk strategy simulation.',
    version: '1.0.0',
    author: 'BleedingOnTheEdge Core',
    category: 'Simulated',
    isOwned: true,
  },

  // Hooks
  {
    id: 'DrawdownCircuitBreaker',
    name: 'Dynamic Drawdown Circuit Breaker',
    kind: 'Hook',
    description: 'Automatically halts order dispatch if daily account drawdown exceeds configured threshold.',
    version: '1.1.0',
    author: 'RiskGuard Systems',
    category: 'Risk',
    isOwned: true,
  },
  {
    id: 'OrderRateLimiter',
    name: 'Leaky Bucket Order Rate Limiter',
    kind: 'Hook',
    description: 'Prevents exchange API ban by queuing and smoothing order transmissions.',
    version: '2.0.0',
    author: 'BleedingOnTheEdge Core',
    category: 'Execution',
    isOwned: true,
  },
  {
    id: 'TelegramAlertInterceptor',
    name: 'Telegram Trade Broadcast Hook',
    kind: 'Hook',
    description: 'Dispatches instant formatted trade notification cards to secure Telegram channels.',
    version: '1.3.1',
    author: 'Ops Tools',
    category: 'Alerting',
    isOwned: true,
  },
  {
    id: 'SlippageGuard',
    name: 'Max Tolerable Slippage Hook',
    kind: 'Hook',
    description: 'Rejects execution if market depth slippage deviates more than specified ticks from mark price.',
    version: '1.0.2',
    author: 'RiskGuard Systems',
    category: 'Risk',
    isOwned: true,
  },
];

function generateAlphanumericId(length = 10): string {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = 'BND-';
  for (let i = 0; i < length - 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function BundleEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const toast = useToast();

  const [saving, setSaving] = useState(false);

  // Metadata Form Fields
  const [bundleId, setBundleId] = useState(() => editId || generateAlphanumericId());
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [documentationMarkdown, setDocumentationMarkdown] = useState(
    '# Bundle Overview\n\nProvide operational details, intended markets, and risk profiles here.'
  );
  const [isPublic, setIsPublic] = useState(false);
  const [publishedToMarketplace, setPublishedToMarketplace] = useState(false);
  const [price, setPrice] = useState<number>(0);
  const [currency, setCurrency] = useState<'Free' | 'IRT' | 'USDT' | 'USD'>('Free');

  // Slots & Hooks selections
  const [strategySlotId, setStrategySlotId] = useState<string>('TrendFollowing');
  const [adapterSlotIds, setAdapterSlotIds] = useState<string[]>(['BinanceFutures']);
  const [hookSlotIds, setHookSlotIds] = useState<string[]>(['DrawdownCircuitBreaker', 'OrderRateLimiter']);

  // Parameter Configurations JSON
  const [configurationsJson, setConfigurationsJson] = useState<string>('{\n  "StopLossPct": 2.5,\n  "TakeProfitPct": 5.0\n}');

  // Snapshots
  const [snapshots, setSnapshots] = useState<BundleSnapshotPayload[]>([]);

  // Preview Mode Toggle for Documentation
  const [previewDoc, setPreviewDoc] = useState(false);

  useEffect(() => {
    if (editId) {
      void (async () => {
        try {
          const bundle = await fetchApi<TradingBundlePayload>(`/api/bundles/${editId}`);
          if (bundle) {
            setBundleId(bundle.id);
            setName(bundle.name);
            setDescription(bundle.description || '');
            setDocumentationMarkdown(bundle.documentationMarkdown || '');
            setIsPublic(bundle.isPublic);
            setPublishedToMarketplace(bundle.publishedToMarketplace);
            setPrice(bundle.price);
            setCurrency(bundle.currency as any);
            setStrategySlotId(bundle.strategySlotId || '');
            try {
              setAdapterSlotIds(JSON.parse(bundle.adapterSlotIdsJson || '[]'));
            } catch {
              setAdapterSlotIds([]);
            }
            try {
              setHookSlotIds(JSON.parse(bundle.hookSlotIdsJson || '[]'));
            } catch {
              setHookSlotIds([]);
            }
            setConfigurationsJson(bundle.defaultConfigurationsJson || '{}');
            setSnapshots(bundle.snapshots || []);
          }
        } catch {
          toast.error('Load Error', `Failed to load bundle ${editId}.`);
        }
      })();
    }
  }, [editId]);

  const handleRegenerateId = () => {
    const newId = generateAlphanumericId();
    setBundleId(newId);
    toast.info('ID Generated', `Assigned unique bundle ID: ${newId}`);
  };

  const handleCreateSnapshot = (version: string, label: string) => {
    const newSnap: BundleSnapshotPayload = {
      id: `snap-${Date.now()}`,
      bundleId,
      version,
      name: label,
      snapshotStateJson: configurationsJson,
      createdAt: new Date().toISOString(),
      dnas: [
        {
          id: `dna-${Date.now()}`,
          bundleSnapshotId: `snap-${Date.now()}`,
          dnaId: `DNA-${Math.floor(1000 + Math.random() * 9000)}`,
          name: 'Baseline Parameter Snapshot',
          parametersJson: configurationsJson,
          backtestStatus: 'Untested',
          createdAt: new Date().toISOString(),
        },
      ],
    };
    setSnapshots((prev) => [newSnap, ...prev]);
    toast.success('Snapshot Captured', `Recorded snapshot ${version} state.`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Validation Error', 'Bundle name is required.');
      return;
    }
    if (!bundleId.trim()) {
      toast.error('Validation Error', 'Bundle ID is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: bundleId.trim(),
        name: name.trim(),
        description: description.trim(),
        documentationMarkdown: documentationMarkdown.trim(),
        isPublic,
        publishedToMarketplace,
        price: currency === 'Free' ? 0 : Number(price),
        currency,
        strategySlotId,
        adapterSlotIdsJson: JSON.stringify(adapterSlotIds),
        hookSlotIdsJson: JSON.stringify(hookSlotIds),
        defaultConfigurationsJson: configurationsJson,
      };

      if (editId) {
        await fetchApi(`/api/bundles/${editId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Bundle Updated', `Bundle ${bundleId} updated successfully.`);
      } else {
        await fetchApi('/api/bundles', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Bundle Created', `Bundle ${bundleId} persisted successfully.`);
      }
      router.push('/panel/bundles');
    } catch {
      toast.error('Save Failed', 'Could not save bundle to control plane.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-xs text-zinc-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
        <div className="flex items-center gap-3">
          <Link
            href="/panel/bundles"
            className="p-2 border border-[#262626] hover:bg-[#1f1f1f] rounded-lg transition-colors"
            title="Back to Bundles Catalogue"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-100" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2 uppercase">
              <Package className="w-5 h-5 text-zinc-100" />
              <span>{editId ? `Edit Bundle [${bundleId}]` : 'Create Trading Bundle'}</span>
            </h1>
            <p className="text-xs text-zinc-100 font-normal mt-0.5 font-sans">
              Assemble strategy slots, adapter gateways, hook interceptors, and default parameter genes.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium disabled:opacity-50 text-xs font-bold uppercase flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'SAVING BUNDLE...' : 'SAVE BUNDLE'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: Package Identity & Metadata */}
        <div className="p-5 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider border-b border-[#262626] pb-2 flex items-center gap-2">
            <Package className="w-4 h-4 text-zinc-100" />
            <span>1. Package Identity & Pricing</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Alphanumeric Unique ID */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-zinc-100 font-bold uppercase">Bundle ID (8-12 Chars)</label>
                <button
                  type="button"
                  onClick={handleRegenerateId}
                  className="text-[10px] text-zinc-400 hover:text-zinc-100 font-bold flex items-center gap-1"
                >
                  <Dice5 className="w-3 h-3" />
                  <span>Randomize</span>
                </button>
              </div>
              <input
                type="text"
                value={bundleId}
                onChange={(e) => setBundleId(e.target.value.toUpperCase())}
                required
                maxLength={12}
                minLength={8}
                placeholder="BND-8X2K4M"
                className="w-full px-3 py-2 bg-[#141414] border border-[#262626] text-zinc-100 font-mono font-bold rounded-md focus:outline-none focus:border-[#3ECF8E] focus:bg-[#171717]"
              />
            </div>

            {/* Bundle Name */}
            <div className="md:col-span-2">
              <label className="block text-zinc-100 font-bold uppercase mb-1">Package Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Trend Scalper Elite Bundle"
                className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 font-bold rounded-md focus:outline-none focus:border-[#3ECF8E]"
              />
            </div>
          </div>

          {/* Pricing & Currencies: Drop IRR; Support IRT, USDT, USD, Free */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-zinc-100 font-bold uppercase mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-zinc-100" />
                <span>Currency Model</span>
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 font-bold rounded-md focus:outline-none focus:border-[#3ECF8E]"
              >
                <option value="Free">Free (Community / Open)</option>
                <option value="IRT">IRT (Toman - Direct Gateway)</option>
                <option value="USDT">USDT (Tether Crypto)</option>
                <option value="USD">USD (Global Fiat)</option>
              </select>
            </div>

            {currency !== 'Free' && (
              <div>
                <label className="block text-zinc-100 font-bold uppercase mb-1">Price ({currency})</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 font-bold rounded-md focus:outline-none focus:border-[#3ECF8E]"
                />
              </div>
            )}

            {/* Visibility Toggles */}
            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#3ECF8E]"
                />
                <span className="font-bold flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> Public Discovery
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={publishedToMarketplace}
                  onChange={(e) => setPublishedToMarketplace(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#3ECF8E]"
                />
                <span className="font-bold flex items-center gap-1 text-blue-700">
                  <Store className="w-3.5 h-3.5" /> Publish to Marketplace
                </span>
              </label>
            </div>
          </div>

          {/* Description Input (Increased Height) */}
          <div className="pt-2">
            <label className="block text-zinc-100 font-bold uppercase mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Detailed description of strategy behavior, market regime prerequisites, and performance expectations..."
              className="w-full p-3 bg-[#171717] border border-[#262626] text-zinc-100 font-sans text-xs rounded-md focus:outline-none focus:border-[#3ECF8E] min-h-[110px]"
            />
          </div>

          {/* Package Documentation (Taller height, removed "(Markdown)" from title) */}
          <div className="pt-2 space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-zinc-100 font-bold uppercase flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-zinc-100" />
                <span>Package Documentation</span>
              </label>
              <button
                type="button"
                onClick={() => setPreviewDoc(!previewDoc)}
                className="text-[11px] font-bold text-zinc-100 flex items-center gap-1 hover:underline"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{previewDoc ? 'EDIT SOURCE' : 'PREVIEW'}</span>
              </button>
            </div>

            {previewDoc ? (
              <div className="w-full p-4 bg-[#141414] border border-[#262626] rounded-xl font-sans text-xs text-zinc-100 min-h-[260px] whitespace-pre-wrap leading-relaxed">
                {documentationMarkdown || '*No documentation written.*'}
              </div>
            ) : (
              <textarea
                value={documentationMarkdown}
                onChange={(e) => setDocumentationMarkdown(e.target.value)}
                rows={10}
                placeholder="Write full deployment guidelines, parameter sensitivities, and setup instructions..."
                className="w-full p-3 bg-[#171717] border border-[#262626] text-zinc-100 font-mono text-xs rounded-md focus:outline-none focus:border-[#3ECF8E] min-h-[260px]"
              />
            )}
          </div>
        </div>

        {/* SECTION 2: Initial Component Slots & Hook Interceptors (Interactive Grids) */}
        <div className="space-y-4">
          <div className="p-5 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider border-b border-[#262626] pb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-zinc-100" />
              <span>2. Component Slots & Hook Interceptors</span>
            </h2>
            <p className="text-xs text-zinc-400 font-sans">
              Select verified strategies, venue execution adapters, and safety interceptors. Click to select or deselect components.
            </p>

            {/* 2.1 Strategy Slot Grid */}
            <ComponentSlotGrid
              title="Strategy Slot (Primary Execution Brain)"
              kind="Strategy"
              availableItems={SAMPLE_AVAILABLE_COMPONENTS}
              selectedIds={strategySlotId ? [strategySlotId] : []}
              onSelect={(id) => setStrategySlotId(id)}
              onDeselect={() => setStrategySlotId('')}
              onClear={() => setStrategySlotId('')}
            />

            {/* 2.2 Venue Adapters Grid */}
            <ComponentSlotGrid
              title="Venue Execution Adapters"
              kind="Adapter"
              availableItems={SAMPLE_AVAILABLE_COMPONENTS}
              selectedIds={adapterSlotIds}
              isMultiSelect
              onSelect={(id) => setAdapterSlotIds((prev) => [...prev, id])}
              onDeselect={(id) => setAdapterSlotIds((prev) => prev.filter((x) => x !== id))}
              onClear={() => setAdapterSlotIds([])}
            />

            {/* 2.3 Hook Interceptors Grid (Multi-select) */}
            <ComponentSlotGrid
              title="Hook Interceptors & Guardrails"
              kind="Hook"
              availableItems={SAMPLE_AVAILABLE_COMPONENTS}
              selectedIds={hookSlotIds}
              isMultiSelect
              onSelect={(id) => setHookSlotIds((prev) => [...prev, id])}
              onDeselect={(id) => setHookSlotIds((prev) => prev.filter((x) => x !== id))}
              onClear={() => setHookSlotIds([])}
            />
          </div>
        </div>

        {/* SECTION 3: Dynamic Parameter Genes & Configurations */}
        <DynamicParameterGenerator
          initialConfigJson={configurationsJson}
          onChange={(newJson) => setConfigurationsJson(newJson)}
        />

        {/* SECTION 4: Snapshots & Attached DNAs */}
        <BundleSnapshotPanel
          snapshots={snapshots}
          onCreateSnapshot={handleCreateSnapshot}
        />

        {/* Action Button */}
        <div className="flex justify-end pt-4 border-t border-[#262626]">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium font-bold text-xs uppercase flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'SAVING BUNDLE...' : 'PERSIST BUNDLE CONFIGURATION'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default function BundleEditorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-mono">Loading Bundle Studio...</div>}>
      <BundleEditorContent />
    </Suspense>
  );
}
