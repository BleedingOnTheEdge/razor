'use client';

import { useState, useEffect } from 'react';
import { getApiClient } from '@/lib/api-client';
import type { TicketPayload, UserProfilePayload } from '@razor/api-client';
import { LifeBuoy, Plus, MessageSquare, Send, CheckCircle2, Clock, AlertCircle, HelpCircle, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { CreateTicketModal } from '@/components/tickets/CreateTicketModal';

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketPayload[]>([]);
  const [profile, setProfile] = useState<UserProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketPayload | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const toast = useToast();

  // Create form state
  const [targetType, setTargetType] = useState<'SystemManager' | 'AdditiveDeveloper'>('SystemManager');
  const [targetItemName, setTargetItemName] = useState('');
  const [category, setCategory] = useState<'Bug' | 'FeatureRequest' | 'Billing' | 'Incident' | 'General'>('General');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const client = getApiClient();

      // Fetch user profile
      const userRes = await client.GET('/api/users/me');
      if (userRes.data) {
        setProfile(userRes.data);
      }

      // Fetch tickets
      const ticketRes = await client.GET('/api/tickets', {
        params: {
          query: {
            status: statusFilter === 'All' ? undefined : (statusFilter as TicketPayload['status']),
          },
        },
      });

      if (ticketRes.data) {
        setTickets(ticketRes.data);
        if (selectedTicket) {
          const fresh = ticketRes.data.find((t) => t.id === selectedTicket.id);
          if (fresh) setSelectedTicket(fresh);
        }
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
      toast.error('Load Error', 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [statusFilter]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      toast.error('Profile Error', 'User profile not available');
      return;
    }
    if (!title.trim() || !description.trim()) {
      toast.error('Validation Error', 'Please provide a title and detailed description');
      return;
    }

    try {
      setSubmitting(true);
      const client = getApiClient();
      const res = await client.POST('/api/tickets', {
        body: {
          accountId: profile.accountId,
          userId: profile.userId,
          authorName: profile.userName,
          targetType,
          targetItemName: targetType === 'AdditiveDeveloper' ? targetItemName.trim() : undefined,
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
        },
      });

      if (res.data) {
        toast.success('Ticket Created', 'Support ticket created successfully');
        setIsCreateOpen(false);
        setTitle('');
        setDescription('');
        setTargetItemName('');
        await loadData();
      }
    } catch {
      toast.error('Creation Error', 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim() || !profile) return;

    try {
      setSubmittingReply(true);
      const client = getApiClient();
      const res = await client.POST('/api/tickets/{ticketId}/messages', {
        params: { path: { ticketId: selectedTicket.id } },
        body: {
          authorName: profile.userName,
          authorRole: 'Developer',
          message: replyMessage.trim(),
        },
      });

      if (res.data) {
        toast.success('Reply Sent', 'Reply submitted');
        setReplyMessage('');
        await loadData();
      }
    } catch {
      toast.error('Reply Error', 'Failed to submit reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const getStatusBadge = (status: TicketPayload['status']) => {
    switch (status) {
      case 'Open':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Clock className="w-3 h-3" /> Open
          </span>
        );
      case 'InProgress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" /> In Progress
          </span>
        );
      case 'Resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </span>
        );
      case 'Closed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/60">
            Closed
          </span>
        );
    }
  };

  const getPriorityBadge = (p: TicketPayload['priority']) => {
    switch (p) {
      case 'Critical':
        return <span className="text-[10px] font-mono text-red-400 uppercase font-bold">Critical</span>;
      case 'High':
        return <span className="text-[10px] font-mono text-amber-400 uppercase font-semibold">High</span>;
      case 'Medium':
        return <span className="text-[10px] font-mono text-cyan-400 uppercase">Medium</span>;
      default:
        return <span className="text-[10px] font-mono text-zinc-400 uppercase">Low</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LifeBuoy className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider font-semibold">
              Support & Inquiries
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Unified Ticketing Center</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Submit inquiries to additive developers or directly escalate infrastructure issues to Razor Cloud operators.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-lg shadow-indigo-600/20 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Open Support Ticket</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {['All', 'Open', 'InProgress', 'Resolved', 'Closed'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
              statusFilter === s
                ? 'bg-zinc-800 text-indigo-400 font-semibold border border-indigo-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Main Grid: Tickets list + selected ticket detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <p className="text-xs font-mono">Loading tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-zinc-800 rounded-2xl p-6 bg-zinc-900/40">
              <LifeBuoy className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-zinc-300">No support tickets found</p>
              <p className="text-[11px] text-zinc-500 mt-1">Open a ticket if you need assistance with an extension or the cluster.</p>
            </div>
          ) : (
            tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedTicket?.id === t.id
                    ? 'bg-zinc-800/80 border-indigo-500/60 shadow-lg'
                    : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(t.status)}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {t.targetType === 'SystemManager' ? 'Platform Operations' : `Additive: ${t.targetItemName || 'Custom'}`}
                    </span>
                  </div>
                  {getPriorityBadge(t.priority)}
                </div>

                <h3 className="text-sm font-semibold text-white truncate">{t.title}</h3>
                <p className="text-xs text-zinc-400 line-clamp-2 mt-1">{t.description}</p>

                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 mt-3 pt-2 border-t border-zinc-800/60">
                  <span>Author: {t.authorName}</span>
                  <span>{t.messages?.length ?? 1} message(s)</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Ticket Thread View */}
        <div className="lg:col-span-7">
          {selectedTicket ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-xl sticky top-24">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusBadge(selectedTicket.status)}
                    <span className="text-xs font-mono text-zinc-400">
                      Category: {selectedTicket.category}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white">{selectedTicket.title}</h2>
                </div>
                {getPriorityBadge(selectedTicket.priority)}
              </div>

              {/* Messages Timeline */}
              <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2">
                {/* Original Description */}
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-semibold text-zinc-200">{selectedTicket.authorName} (Ticket Author)</span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {new Date(selectedTicket.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {selectedTicket.description}
                  </p>
                </div>

                {/* Follow-up responses */}
                {selectedTicket.messages && selectedTicket.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`border rounded-xl p-4 space-y-2 ${
                      m.authorRole === 'Operator' || m.authorRole === 'SystemManager'
                        ? 'bg-indigo-950/20 border-indigo-800/40'
                        : 'bg-zinc-950/40 border-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-200">{m.authorName}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-800 text-zinc-400">
                          {m.authorRole}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {new Date(m.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {m.message}
                    </p>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              {selectedTicket.status !== 'Closed' ? (
                <form onSubmit={handleSendReply} className="space-y-3 pt-2 border-t border-zinc-800">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={3}
                    placeholder="Type your response to the support team or developer..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
                    required
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReply}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {submittingReply ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Send Reply</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-center text-xs text-zinc-400 font-mono">
                  This support ticket is closed.
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
              <MessageSquare className="w-8 h-8 mb-2 text-zinc-600" />
              <p className="text-xs font-medium text-zinc-400">Select a ticket from the left to view messages and reply</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        targetType={targetType}
        setTargetType={setTargetType}
        targetItemName={targetItemName}
        setTargetItemName={setTargetItemName}
        category={category}
        setCategory={setCategory}
        priority={priority}
        setPriority={setPriority}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        profile={profile}
        submitting={submitting}
        onSubmit={handleCreateTicket}
      />
    </div>
  );
}
