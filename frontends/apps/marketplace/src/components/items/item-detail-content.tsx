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
  Star,
  Server,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import type { MarketplaceItemPayload, EngineInstancePayload } from '@razor/api-client';
import { useAuth } from '@/context/auth-context';
import { LicenseAcquisitionCard } from './LicenseAcquisitionCard';
import { ReviewSubmissionModal } from './ReviewSubmissionModal';

export interface ItemDetailContentProps {
  itemId: string;
}

export function ItemDetailContent({ itemId }: ItemDetailContentProps) {
  const { success, error: toastError } = useToast();
  const { user, isAuthenticated } = useAuth();

  const [item, setItem] = useState<MarketplaceItemPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // License acquisition state
  const [accountId, setAccountId] = useState(user?.accountId || 'acc-operator-default');
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
        const itemRes = await client.GET('/api/marketplace/items/{itemId}', {
          params: { path: { itemId } },
        });

        if (itemRes.error) {
          setError('Failed to fetch extension details.');
        } else if (itemRes.data) {
          setItem(itemRes.data);
        }

        if (isAuthenticated) {
          try {
            const instancesRes = await client.GET('/api/instances');
            if (instancesRes.data) {
              setFleetInstances(instancesRes.data);
              if (instancesRes.data.length > 0 && !targetInstanceId) {
                setTargetInstanceId(instancesRes.data[0].instanceId);
              }
            }
          } catch {
            // Ignore fleet instances error if unauthenticated
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

  useEffect(() => {
    if (user?.accountId && !accountId) {
      setAccountId(user.accountId);
    }
  }, [user, accountId]);

  async function handleAcquire(e: React.FormEvent) {
    e.preventDefault();
    const effectiveAccountId = accountId.trim() || user?.accountId || 'acc-operator-default';

    setAcquiring(true);
    setAcquiredLicense(null);
    try {
      const client = getApiClient();
      const { data, error: err } = await client.POST('/api/marketplace/items/{itemId}/acquire', {
        params: { path: { itemId } },
        body: {
          accountId: effectiveAccountId,
          targetInstanceId: targetInstanceId.trim() || undefined,
        },
      });

      if (err) {
        const errorMsg = typeof err === 'object' && err !== null && 'detail' in err
          ? String((err as { detail: unknown }).detail)
          : 'The licensing server was unable to issue a license.';
        toastError('Acquisition Failed', errorMsg);
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
          <LicenseAcquisitionCard
            item={item}
            acquiredLicense={acquiredLicense}
            copiedKey={copiedKey}
            onCopyLicense={handleCopyLicense}
            targetInstanceId={targetInstanceId}
            setTargetInstanceId={setTargetInstanceId}
            accountId={accountId}
            setAccountId={setAccountId}
            fleetInstances={fleetInstances}
            acquiring={acquiring}
            onAcquire={handleAcquire}
          />
        </div>
      )}

      {/* Review Submission Modal */}
      <ReviewSubmissionModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        reviewAuthor={reviewAuthor}
        setReviewAuthor={setReviewAuthor}
        reviewRating={reviewRating}
        setReviewRating={setReviewRating}
        reviewComment={reviewComment}
        setReviewComment={setReviewComment}
        submittingReview={submittingReview}
        onSubmit={handleSubmitReview}
      />
    </div>
  );
}
