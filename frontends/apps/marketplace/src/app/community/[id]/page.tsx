'use client';

import { useState, useEffect, use } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getApiClient } from '@/lib/api-client';
import type { CommunityThreadPayload } from '@razor/api-client';
import { ArrowLeft, MessageSquare, ThumbsUp, Send, Loader2, Calendar, User, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ThreadDetailPage({ params }: PageProps) {
  const routeParams = useParams();
  const resolved = params ? use(params) : null;
  const threadId = (routeParams?.id as string) || resolved?.id || '';

  const [thread, setThread] = useState<CommunityThreadPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyAuthor, setReplyAuthor] = useState('DevTrader');
  const [replyBadge, setReplyBadge] = useState('Developer');
  const [submittingReply, setSubmittingReply] = useState(false);
  const toast = useToast();

  const loadThread = async () => {
    try {
      setLoading(true);
      const client = getApiClient();
      const res = await client.GET('/api/community/threads/{threadId}', {
        params: { path: { threadId } },
      });

      if (res.data) {
        setThread(res.data);
      }
    } catch (err) {
      console.error('Failed to load thread:', err);
      toast.error('Not Found', 'Discussion thread not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadThread();
  }, [threadId]);

  const handleUpvote = async () => {
    if (!thread) return;
    setThread({ ...thread, upvotes: thread.upvotes + 1 });

    try {
      const client = getApiClient();
      await client.POST('/api/community/threads/{threadId}/upvote', {
        params: { path: { threadId } },
      });
      toast.success('Upvoted', 'Upvoted successfully');
    } catch {
      toast.error('Upvote Error', 'Failed to register upvote');
    }
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      setSubmittingReply(true);
      const client = getApiClient();
      const res = await client.POST('/api/community/threads/{threadId}/replies', {
        params: { path: { threadId } },
        body: {
          authorName: replyAuthor.trim(),
          authorBadge: replyBadge,
          content: replyText.trim(),
        },
      });

      if (res.data && thread) {
        toast.success('Reply Sent', 'Reply published');
        setReplyText('');
        // Reload to get fresh list
        await loadThread();
      }
    } catch {
      toast.error('Reply Error', 'Failed to post reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 flex flex-col items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-xs font-mono">Loading discussion thread...</p>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Thread Not Found</h2>
        <p className="text-sm text-zinc-400">This discussion thread does not exist or has been removed.</p>
        <Link
          href="/community"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 text-indigo-400 text-xs font-mono"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Community</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/community"
          className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Discussions</span>
        </Link>
      </div>

      {/* Main Thread Article */}
      <article className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm">
              {thread.authorName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{thread.authorName}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
                  {thread.authorBadge}
                </span>
              </div>
              <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3" />
                <span>Published on {new Date(thread.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-full text-xs font-mono bg-zinc-800 text-indigo-400 border border-zinc-700/60">
              {thread.category}
            </span>
            <button
              onClick={handleUpvote}
              aria-label="Upvote thread"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-indigo-400 text-xs font-mono transition-colors cursor-pointer"
            >
              <ThumbsUp className="w-4 h-4" />
              <span>{thread.upvotes}</span>
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-white">
          {thread.title}
        </h1>

        <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans bg-zinc-950/40 p-5 rounded-xl border border-zinc-800/60">
          {thread.content}
        </div>
      </article>

      {/* Discussion & Replies Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <span>Replies ({thread.replies?.length ?? 0})</span>
          </h2>
        </div>

        {/* Existing Replies List */}
        <div className="space-y-4">
          {thread.replies && thread.replies.length > 0 ? (
            thread.replies.map((reply) => (
              <div
                key={reply.id}
                className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-200">{reply.authorName}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                      {reply.authorBadge}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {new Date(reply.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {reply.content}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 border border-dashed border-zinc-800 rounded-xl p-6 text-zinc-500 text-xs">
              No replies yet. Join the conversation below!
            </div>
          )}
        </div>

        {/* Reply Submission Box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white">Post a Response</h3>
          <form onSubmit={handlePostReply} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-400">Display Name</label>
                <input
                  type="text"
                  value={replyAuthor}
                  onChange={(e) => setReplyAuthor(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-400">Badge</label>
                <input
                  type="text"
                  value={replyBadge}
                  onChange={(e) => setReplyBadge(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400">Response</label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                placeholder="Share your quantitative perspective, technical observation, or question..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingReply}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all disabled:opacity-50 cursor-pointer"
              >
                {submittingReply ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Submit Response</span>
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
