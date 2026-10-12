'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import {
  UploadCloud,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';

const EXTENSION_KINDS = [
  { value: 'Strategy', label: 'Strategy (Systematic Trading Logic)' },
  { value: 'Adapter', label: 'Adapter (Exchange/Broker Connectivity Gateway)' },
  { value: 'Indicator', label: 'Indicator (Quantitative Signal Unit)' },
  { value: 'NeuralNetwork', label: 'Neural Network (INeuralNetworkModel / ONNX)' },
  { value: 'HookPlugin', label: 'Hook Plugin (Risk & Compliance Interceptor)' },
];

export function PublishContent() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [name, setName] = useState('');
  const [kind, setKind] = useState('Strategy');
  const [version, setVersion] = useState('1.0.0');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0.00');
  const [sdkVersion, setSdkVersion] = useState('1.0.0');
  const [isCurated, setIsCurated] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError('Extension name is required.');
      return;
    }

    if (!author.trim()) {
      setValidationError('Author or publisher name is required.');
      return;
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      setValidationError('Price must be a valid non-negative number.');
      return;
    }

    setSubmitting(true);
    try {
      const client = getApiClient();
      const { data, error: err } = await client.POST('/api/marketplace/items', {
        body: {
          name: name.trim(),
          kind,
          version: version.trim() || '1.0.0',
          author: author.trim(),
          description: description.trim(),
          price: numericPrice,
          sdkVersion: sdkVersion.trim() || '1.0.0',
          isCurated,
        },
      });

      if (err) {
        toastError('Publication Failed', 'The marketplace server rejected the listing.');
        setValidationError('Failed to publish listing. Please check input parameters.');
      } else if (data) {
        success('Extension Published', `Listing "${data.name}" has been published to the catalogue.`);
        router.push(`/items/${data.id}`);
      }
    } catch (e: any) {
      toastError('Network Error', e?.message || 'Error communicating with marketplace API.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-mono text-zinc-400" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-zinc-200 flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Catalogue</span>
        </Link>
        <span>/</span>
        <span className="text-zinc-200">Publisher Portal</span>
      </nav>

      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Developer & Quant Distribution</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Publish Extension Listing
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Distribute your algorithmic strategies, execution adapters, indicators, and models across the Razor ecosystem with deterministic reproducibility.
        </p>
      </div>

      {validationError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2">
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              Extension Name <span className="text-rose-400">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              placeholder="e.g. AdaptiveVolatilityBreakout"
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              Extension Slot Kind <span className="text-rose-400">*</span>
            </label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {EXTENSION_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              Semantic Version <span className="text-rose-400">*</span>
            </label>
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              type="text"
              placeholder="1.0.0"
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              Author / Publishing Desk <span className="text-rose-400">*</span>
            </label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              type="text"
              placeholder="e.g. QuantDesk-Arbitrage"
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              License Price ($ USD, 0 for Free)
            </label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              Target SDK Version
            </label>
            <input
              value={sdkVersion}
              onChange={(e) => setSdkVersion(e.target.value)}
              type="text"
              placeholder="1.0.0"
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center pt-6">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-mono text-zinc-300 hover:text-white">
              <input
                type="checkbox"
                checked={isCurated}
                onChange={(e) => setIsCurated(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Request Official Razor Curation Badge</span>
              </span>
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              Capability Specification & Documentation
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe execution parameters, market compatibility (FX, Equities, Crypto), expected Sharpe, and latency requirements..."
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between">
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 transition-colors"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs font-mono transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{submitting ? 'Publishing Manifest...' : 'Publish to Marketplace'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
