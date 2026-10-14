'use client';

import React from 'react';
import { Star } from 'lucide-react';

export interface ReviewSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewAuthor: string;
  setReviewAuthor: (author: string) => void;
  reviewRating: number;
  setReviewRating: (rating: number) => void;
  reviewComment: string;
  setReviewComment: (comment: string) => void;
  submittingReview: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function ReviewSubmissionModal({
  isOpen,
  onClose,
  reviewAuthor,
  setReviewAuthor,
  reviewRating,
  setReviewRating,
  reviewComment,
  setReviewComment,
  submittingReview,
  onSubmit,
}: ReviewSubmissionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            <span>Submit Operator Review</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs font-mono"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
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
              onClick={onClose}
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
  );
}
