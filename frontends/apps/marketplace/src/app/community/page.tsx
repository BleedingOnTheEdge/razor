'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiClient } from '@/lib/api-client';
import type { CommunityThreadPayload } from '@razor/api-client';
import { MessageSquare, ThumbsUp, Plus, Search, Tag, Sparkles, Filter, Loader2, Calendar } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

const CATEGORIES = ['All', 'Announcements', 'Strategies', 'Additives', 'Feedback', 'General'] as const;

export default function CommunityPage() {
  const [threads, setThreads] = useState<CommunityThreadPayload[]>([]);
  const [category, setCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Strategies');
  const [newAuthor, setNewAuthor] = useState('AlphaResearcher');
  const [newBadge, setNewBadge] = useState('Developer');
  const [newContent, setNewContent] = useState('');

  const loadThreads = async () => {
    try {
      setLoading(true);
      const client = getApiClient();
      const res = await client.GET('/api/community/threads', {
        params: {
          query: {
            category: category === 'All' ? undefined : category,
          },
        },
      });

      if (res.data) {
        setThreads(res.data);
      }
    } catch (err) {
      console.error('Failed to load community threads:', err);
      toast.error('Load Error', 'Failed to load community threads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadThreads();
  }, [category]);

  const handleUpvote = async (threadId: string) => {
    // Optimistic update
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, upvotes: t.upvotes + 1 } : t))
    );

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

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Validation Error', 'Please provide both a title and discussion content');
      return;
    }

    try {
      setSubmitting(true);
      const client = getApiClient();
      const res = await client.POST('/api/community/threads', {
        body: {
          title: newTitle.trim(),
          category: newCategory,
          authorName: newAuthor.trim(),
          authorBadge: newBadge,
          content: newContent.trim(),
        },
      });

      if (res.data) {
        toast.success('Published', 'Discussion thread published');
        setIsCreateOpen(false);
        setNewTitle('');
        setNewContent('');
        await loadThreads();
      }
    } catch {
      toast.error('Publish Error', 'Failed to publish thread');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredThreads = threads.filter((t) =>
    searchQuery === ''
      ? true
      : t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.authorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-800/80 to-zinc-900 border border-zinc-700/80 p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Community & Research Hub
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Live Additives
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Additives, Indicators & Strategy Discussions
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl">
              Collaborate with quantitative engineers, share alpha insights, review custom execution hooks, and discuss high-frequency slot extensions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Discussion</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap cursor-pointer ${
                category === cat
                  ? 'bg-zinc-800 text-indigo-400 font-semibold border border-indigo-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search discussions..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Thread List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          <p className="text-xs font-mono">Loading discussions...</p>
        </div>
      ) : filteredThreads.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-zinc-800 rounded-2xl p-8">
          <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-300">No discussions found in this category</p>
          <p className="text-xs text-zinc-500 mt-1">Be the first to start a discussion thread!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredThreads.map((thread) => (
            <div
              key={thread.id}
              className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-xl p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-indigo-400 border border-zinc-700/60">
                    {thread.category}
                  </span>
                  <span className="text-xs font-medium text-zinc-300">
                    {thread.authorName}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                    {thread.authorBadge}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(thread.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <Link href={`/community/${thread.id}`} className="block">
                  <h3 className="text-base font-semibold text-white group-hover:text-indigo-400 transition-colors">
                    {thread.title}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                    {thread.content}
                  </p>
                </Link>
              </div>

              {/* Thread Stats & Upvote */}
              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                <button
                  onClick={() => handleUpvote(thread.id)}
                  aria-label="Upvote discussion"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700/80 text-zinc-300 hover:text-indigo-400 text-xs font-mono transition-colors cursor-pointer"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{thread.upvotes}</span>
                </button>

                <Link
                  href={`/community/${thread.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-400 hover:text-zinc-200 text-xs font-mono transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{thread.repliesCount} replies</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Discussion Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                <span>Start New Discussion</span>
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-zinc-400 hover:text-white text-xs font-mono px-2 py-1"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleCreateThread} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-zinc-300">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Memory efficient order routing with MockPaperTradingAdapter"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono text-zinc-300">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Strategies">Strategies</option>
                    <option value="Additives">Additives</option>
                    <option value="Announcements">Announcements</option>
                    <option value="Feedback">Feedback</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono text-zinc-300">Author Display Name</label>
                  <input
                    type="text"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-zinc-300">Discussion Content</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={5}
                  placeholder="Describe your research, strategy setup, questions, or extension feedback..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-all disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Publish Thread</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
