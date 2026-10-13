'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiClient } from '@/lib/api-client';
import { getExtensionKindBadge, formatCurrency } from '@razor/ui-kit';
import { useToast } from '@/components/ui/toast';
import {
  ArrowLeft,
  Download,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  Star,
  Copy,
  Check,
  Server,
  MessageSquare,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import type { MarketplaceItemPayload, EngineInstancePayload } from '@razor/api-client';

export interface ItemDetailContentProps {
  itemId: string;
}

export function ItemDetailContent({ itemId }: ItemDetailContentProps) {
  const { success, error: toastError } = useToast();

  const [item, setItem] = useState<MarketplaceItemPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // License acquisition state
  const [accountId, setAccountId] = useState('acc-operator-default');
  const [targetInstanceId, setTargetInstanceId] = useState('');
  const [fleetInstances, setFleetInstances] = useState<EngineInstancePayload[]>([]);
  const [acquiring, setAcquiring] = useState(false);
  const [acquiredLicense, setAcquiredLicense] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Review modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState('Senior Trader');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    async function fetchItemAndFleet() {
      setLoading(true);
      setError(null);
      try {
        const client = getApiClient();
        const [itemRes, instancesRes] = await Promise.all([
          client.GET('/api/marketplace/items/{itemId}', {
            params: { path: { itemId } },
          }),
          client.GET('/api/instances'),
        ]);

        if (itemRes.error) {
          setError('Failed to fetch extension details.');
        } else if (itemRes.data) {
          setItem(itemRes.data);
        }

        if (instancesRes.data) {
          setFleetInstances(instancesRes.data);
          if (instancesRes.data.length > 0 && !targetInstanceId) {
            setTargetInstanceId(instancesRes.data[0].instanceId);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error communicating with Marketplace API.');
      } finally {
        setLoading(false);
      }
    }

    fetchItemAndFleet();
  }, [itemId]);

  async function handleAcquire(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId.trim()) {
      toastError('Validation Error', 'Account ID is required for license acquisition.');
      return;
    }

    setAcquiring(true);
    setAcquiredLicense(null);
    try {
      const client = getApiClient();
      const { data, error: err } = await client.POST('/api/marketplace/items/{itemId}/acquire', {
        params: { path: { itemId } },
        body: {
          accountId: accountId.trim(),
          targetInstanceId: targetInstanceId.trim() || undefined,
        },
      });

      if (err) {
        toastError('Acquisition Failed', 'The licensing server was unable to issue a license.');
      } else if (data) {
        setAcquiredLicense(data.licenseKey);
        success('License Acquired', `License ${data.licenseKey} issued successfully.`);
      }
    } catch (e) {
      toastError('Acquisition Error', e instanceof Error ? e.message : 'Network error during license issuance.');
    } finally {
      setAcquiring(false);
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewAuthor.trim()) {
      toastError('Validation Error', 'Reviewer name is required.');
      return;
    }

    setSubmittingReview(true);
    try {
      const client = getApiClient();
      const { data, error: err } = await client.POST('/api/marketplace/items/{itemId}/reviews', {
        params: { path: { itemId } },
        body: {
          author: reviewAuthor.trim(),
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        },
      });

      if (err) {
        toastError('Review Submission Failed', 'Unable to submit review at this time.');
      } else if (data) {
        success('Review Published', 'Your review and rating have been registered.');
        setIsReviewModalOpen(false);
        setReviewComment('');
        // Update item rating locally
        if (item) {
          setItem({ ...item, rating: data.newRating });
        }
      }
    } catch (e) {
      toastError('Submission Error', e instanceof Error ? e.message : 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  }

  function handleCopyLicense() {
    if (acquiredLicense) {
      navigator.clipboard.writeText(acquiredLicense);
      setCopiedKey(true);
      success('Copied to Clipboard', 'License key copied.');
      setTimeout(() => setCopiedKey(false), 2000);
    }
  }

  const kindBadge = item ? getExtensionKindBadge(item.kind) : null;
  const ratingScore = item?.rating ?? 5.0;
  const downloadCount = item?.downloadsCount ?? item?.downloads ?? 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb Header */}
      <nav className="flex items-center gap-2 text-xs font-mono text-zinc-400" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-zinc-200 flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Catalogue</span>
        </Link>
        <span>/</span>
        <span className="text-zinc-500">{item?.kind || 'Extension'}</span>
        <span>/</span>
        <span className="text-zinc-200 truncate">{item?.name || itemId}</span>
      </nav>

      {/* Loading & Error States */}
      {loading && (
        <div className="py-20 text-center text-sm font-mono text-zinc-400 space-y-2">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Loading extension specification...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
          {error}
        </div>
      )}

      {item && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Specification Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold tracking-tight text-white">{item.name}</h1>
                    {item.isCurated && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Curated by Razor</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 font-mono">
                    Published by <span className="text-zinc-200 font-semibold">{item.author}</span> • Version: v{item.version}
                  </p>
                </div>

                {kindBadge && (
                  <span className={`px-2.5 py-1 rounded text-xs font-semibold font-mono ${kindBadge.className}`}>
                    {kindBadge.label}
                  </span>
                )}
              </div>

              {/* Metrics Ribbon */}
              <div className="pt-3 border-t border-zinc-800/80 flex items-center gap-6 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{ratingScore.toFixed(1)} / 5.0</span>
                </div>
                <div className="text-zinc-400 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-zinc-400" />
                  <span>{downloadCount} installations</span>
                </div>
                <div className="text-zinc-400">
                  Target SDK: <span className="text-zinc-200 font-semibold">v{item.sdkVersion}</span>
                </div>
              </div>
            </div>

            {/* Capability Description */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                Description & Capabilities
              </h2>
              <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                {item.description || 'No detailed documentation provided for this extension.'}
              </div>
            </div>

            {/* Technical Specification Matrix */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                System Compatibility Matrix
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/60 space-y-1">
                  <span className="text-zinc-500 block text-[11px]">Runtime Architecture</span>
                  <span className="font-bold text-white block">Razor Engine .NET 10 LTS</span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/60 space-y-1">
                  <span className="text-zinc-500 block text-[11px]">Extension Slot</span>
                  <span className="font-bold text-indigo-400 block">{item.kind} Slot</span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/60 space-y-1">
                  <span className="text-zinc-500 block text-[11px]">Minimum SDK Version</span>
                  <span className="font-bold text-white block">v{item.sdkVersion}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/60 space-y-1">
                  <span className="text-zinc-500 block text-[11px]">Execution Latency Floor</span>
                  <span className="font-bold text-emerald-400 block">&lt; 100 ns Zero-Alloc Hot Path</span>
                </div>
              </div>
            </div>

            {/* Reviews & Ratings Section */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                    Operator Reviews & Ratings
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5 font-mono">
                    Average Score: {ratingScore.toFixed(1)} based on verified executions
                  </p>
                </div>
                <button
                  onClick={() => setIsReviewModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-transparent text-xs font-mono transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Submit Review</span>
                </button>
              </div>

              {/* Sample/Recent Review Display */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-zinc-200">Algorithmic Trading Lead</span>
                  <div className="flex items-center text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="ml-1">5.0</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Verified in live-simulation environments. Zero garbage collection pressure and perfect deterministic replay alignment.
                </p>
              </div>
            </div>
          </div>

          {/* Acquisition & Deployment Sidebar */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-6 sticky top-24">
              <div>
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block">License Price</span>
                <span className="text-3xl font-bold text-white mt-1 block font-mono">
                  {item.price === 0 ? 'Free' : formatCurrency(item.price)}
                </span>
                <span className="text-[11px] text-zinc-500 block mt-1">Perpetual enterprise deployment license</span>
              </div>

              {acquiredLicense ? (
                <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>License Acquired Successfully!</span>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Assigned License Key</label>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={acquiredLicense}
                        className="w-full px-2.5 py-1.5 bg-zinc-950 rounded border border-zinc-800 text-xs font-mono text-zinc-200 select-all"
                      />
                      <button
                        onClick={handleCopyLicense}
                        aria-label="Copy license key"
                        className="p-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors shrink-0"
                      >
                        {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {targetInstanceId && (
                    <div className="p-2.5 rounded bg-zinc-950/80 border border-zinc-800/50 text-[11px] font-mono text-zinc-400 space-y-1">
                      <span className="text-zinc-500 block">Deploying to Engine:</span>
                      <span className="text-indigo-400 font-semibold block">{targetInstanceId}</span>
                    </div>
                  )}

                  <a
                    href="http://localhost:3002/instances"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-indigo-400 hover:text-indigo-300 pt-1"
                  >
                    <span>View in Operator Dashboard</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <form onSubmit={handleAcquire} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">
                      Trading Account ID <span className="text-rose-400">*</span>
                    </label>
                    <input
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      type="text"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">
                      Deploy to Engine Instance
                    </label>
                    {fleetInstances.length > 0 ? (
                      <select
                        value={targetInstanceId}
                        onChange={(e) => setTargetInstanceId(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">No immediate deployment</option>
                        {fleetInstances.map((inst) => (
                          <option key={inst.instanceId} value={inst.instanceId}>
                            {inst.name || inst.instanceId} ({inst.status})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={targetInstanceId}
                        onChange={(e) => setTargetInstanceId(e.target.value)}
                        type="text"
                        placeholder="e.g. inst-12345"
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                      />
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={acquiring}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs font-mono transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{acquiring ? 'Generating License...' : 'Acquire License & Deploy'}</span>
                  </button>

                  <p className="text-[11px] text-zinc-500 leading-relaxed font-mono">
                    Generating a license issues a cryptographic key tied to your account. The target engine will load the manifest automatically via profile slots.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Submission Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span>Submit Operator Review</span>
              </h3>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  Operator Handle / Desk <span className="text-rose-400">*</span>
                </label>
                <input
                  value={reviewAuthor}
                  onChange={(e) => setReviewAuthor(e.target.value)}
                  type="text"
                  placeholder="e.g. Desk-Quant-NY"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  Rating (1 to 5 Stars)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      aria-label={`${star} star rating`}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        reviewRating >= star
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-600'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${reviewRating >= star ? 'fill-amber-400' : ''}`} />
                    </button>
                  ))}
                  <span className="text-xs font-mono text-zinc-400 ml-2">{reviewRating}.0 / 5.0</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  Execution Feedback / Comments
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  placeholder="Provide quantitative latency, fill quality, or stability observations..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-mono font-semibold text-white transition-colors"
                >
                  {submittingReview ? 'Submitting...' : 'Post Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
