'use client';

import { useState, useEffect } from 'react';
import { getApiClient } from '@/lib/api-client';
import type { TicketPayload, UserProfilePayload } from '@razor/api-client';
import { LifeBuoy, Plus, MessageSquare, Send, CheckCircle2, Clock, Loader2 } from 'lucide-react';
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
      const userRes = await client.GET('/api/users/me').catch(() => ({ data: null }));
      if (userRes && userRes.data) {
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
        const raw = ticketRes.data as unknown as { items?: TicketPayload[] } | TicketPayload[];
        const list: TicketPayload[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        setTickets(list);
        if (selectedTicket) {
          const fresh = list.find((t) => t.id === selectedTicket.id);
          if (fresh) setSelectedTicket(fresh);
        }
      } else {
        setTickets([]);
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
    if (!title.trim() || !description.trim()) {
      toast.error('Validation Error', 'Please provide a title and detailed description');
      return;
    }

    const effectiveAccountId = profile?.accountId || '00000000-0000-0000-0000-000000000000';
    const effectiveUserId = profile?.userId || '00000000-0000-0000-0000-000000000000';
    const effectiveAuthorName = profile?.userName || 'Community Trader';

    try {
      setSubmitting(true);
      const client = getApiClient();
      const res = await client.POST('/api/tickets', {
        body: {
          accountId: effectiveAccountId,
          userId: effectiveUserId,
          authorName: effectiveAuthorName,
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
    if (!selectedTicket || !replyMessage.trim()) return;

    const authorName = profile?.userName || 'Community Trader';
    const authorRole = profile?.role === 'Developer' ? 'Developer' : 'Trader';

    try {
      setSubmittingReply(true);
      const client = getApiClient();
      const res = await client.POST('/api/tickets/{ticketId}/messages', {
        params: { path: { ticketId: selectedTicket.id } },
        body: {
          authorName,
          authorRole,
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3" /> Open
          </span>
        );
      case 'InProgress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> In Progress
          </span>
        );
      case 'Resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </span>
        );
      case 'Closed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-zinc-100 text-zinc-600 border border-zinc-200">
            Closed
          </span>
        );
    }
  };

  const getPriorityBadge = (p: TicketPayload['priority']) => {
    switch (p) {
      case 'Critical':
        return <span className="text-[10px] font-mono text-rose-600 uppercase font-bold">Critical</span>;
      case 'High':
        return <span className="text-[10px] font-mono text-amber-600 uppercase font-semibold">High</span>;
      case 'Medium':
        return <span className="text-[10px] font-mono text-cyan-700 uppercase">Medium</span>;
      default:
        return <span className="text-[10px] font-mono text-zinc-500 uppercase">Low</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LifeBuoy className="w-5 h-5 text-cyan-600" />
            <span className="text-xs font-mono text-cyan-700 uppercase tracking-wider font-semibold">
              Support & Inquiries
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-900">Unified Ticketing Center</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Submit inquiries to additive developers or directly escalate infrastructure issues to Razor Cloud operators.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer self-start md:self-auto"
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
                ? 'bg-zinc-900 text-white font-semibold'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
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
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-500 bg-white border border-zinc-200 rounded-2xl shadow-sm">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
              <p className="text-xs font-mono">Loading tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-zinc-200 rounded-2xl p-6 bg-zinc-50">
              <LifeBuoy className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-zinc-700">No support tickets found</p>
              <p className="text-[11px] text-zinc-500 mt-1">Open a ticket if you need assistance with an extension or the cluster.</p>
            </div>
          ) : (
            tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedTicket?.id === t.id
                    ? 'bg-white border-cyan-500 shadow-md ring-2 ring-cyan-100'
                    : 'bg-white hover:border-zinc-300 border-zinc-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(t.status)}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                      {t.targetType === 'SystemManager' ? 'Platform Operations' : `Additive: ${t.targetItemName || 'Custom'}`}
                    </span>
                  </div>
                  {getPriorityBadge(t.priority)}
                </div>

                <h3 className="text-sm font-semibold text-zinc-900 truncate">{t.title}</h3>
                <p className="text-xs text-zinc-500 line-clamp-2 mt-1">{t.description}</p>

                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mt-3 pt-2 border-t border-zinc-100">
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
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-6 shadow-sm sticky top-24">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusBadge(selectedTicket.status)}
                    <span className="text-xs font-mono text-zinc-500">
                      Category: {selectedTicket.category}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-zinc-900">{selectedTicket.title}</h2>
                </div>
                {getPriorityBadge(selectedTicket.priority)}
              </div>

              {/* Messages Timeline */}
              <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2">
                {/* Original Description */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="font-semibold text-zinc-800">{selectedTicket.authorName} (Ticket Author)</span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {new Date(selectedTicket.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap font-sans">
                    {selectedTicket.description}
                  </p>
                </div>

                {/* Follow-up responses */}
                {selectedTicket.messages && selectedTicket.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`border rounded-xl p-4 space-y-2 ${
                      m.authorRole === 'Operator' || m.authorRole === 'SystemManager'
                        ? 'bg-cyan-50/50 border-cyan-200 ml-4'
                        : 'bg-zinc-50 border-zinc-200 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900">{m.authorName}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-200 text-zinc-800">
                          {m.authorRole}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {new Date(m.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-800 leading-relaxed whitespace-pre-wrap font-sans">
                      {m.message}
                    </p>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              {selectedTicket.status !== 'Closed' ? (
                <form onSubmit={handleSendReply} className="space-y-3 pt-2 border-t border-zinc-100">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={3}
                    placeholder="Type your response to the support team or developer..."
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-900 focus:outline-none focus:bg-white focus:border-cyan-600 font-sans"
                    required
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReply}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
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
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-center text-xs text-zinc-500 font-mono">
                  This support ticket is closed.
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center border border-dashed border-zinc-200 rounded-2xl p-8 text-center text-zinc-400 bg-zinc-50/50">
              <MessageSquare className="w-8 h-8 mb-2 text-zinc-400" />
              <p className="text-xs font-medium text-zinc-600">Select a ticket from the left to view messages and reply</p>
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
