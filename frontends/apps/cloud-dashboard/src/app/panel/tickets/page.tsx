'use client';

import { useState, useEffect, useMemo } from 'react';
import { getApiClient } from '@/lib/api-client';
import type { TicketPayload, TicketMessagePayload } from '@razor/api-client';
import {
  LifeBuoy,
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
  ShieldAlert,
  Filter,
  Loader2,
  Plus,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/auth-context';
import { CreateTicketModal } from '@/components/tickets/CreateTicketModal';

export default function OperatorTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketPayload | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Sorting
  const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt' | 'priority' | 'status'>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'DESC' | 'ASC'>('DESC');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Lazy loading messages
  const [visibleMessagesCount, setVisibleMessagesCount] = useState(5);

  // Reply Composer
  const [replyText, setReplyText] = useState('');
  const [operatorName, setOperatorName] = useState(user?.userName || user?.email || 'Operations Engineer');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const toast = useToast();

  const loadTickets = async () => {
    try {
      setLoading(true);
      const client = getApiClient();
      const res = await client.GET('/api/tickets', {
        params: {
          query: {
            status: statusFilter === 'All' ? undefined : (statusFilter as TicketPayload['status']),
            priority: priorityFilter === 'All' ? undefined : (priorityFilter as TicketPayload['priority']),
            category: categoryFilter === 'All' ? undefined : (categoryFilter as TicketPayload['category']),
            search: searchQuery.trim() || undefined,
            page,
            pageSize,
          },
        },
      });

      if (res.data) {
        const raw = res.data as unknown as { items?: TicketPayload[] } | TicketPayload[];
        const list: TicketPayload[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        setTickets(list);
        if (selectedTicket) {
          const fresh = list.find((t) => t.id === selectedTicket.id);
          if (fresh) setSelectedTicket(fresh);
        }
      } else {
        setTickets([]);
      }
    } catch {
      toast.error('Load Error', 'Failed to fetch tickets from control plane.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    void loadTickets();
  }, [statusFilter, priorityFilter, categoryFilter, page, pageSize]);

  // Reset lazy load count on ticket selection change
  useEffect(() => {
    setVisibleMessagesCount(5);
  }, [selectedTicket?.id]);

  const handleStatusTransition = async (ticketId: string, newStatus: TicketPayload['status']) => {
    try {
      setUpdatingStatus(true);
      const client = getApiClient();
      await client.PATCH('/api/tickets/{ticketId}/status', {
        params: { path: { ticketId } },
        body: { status: newStatus },
      });

      toast.success('Status Updated', `Ticket marked as ${newStatus}`);
      await loadTickets();
    } catch {
      toast.error('Update Failed', 'Failed to transition ticket status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    try {
      setSubmittingReply(true);
      const client = getApiClient();
      const res = await client.POST('/api/tickets/{ticketId}/messages', {
        params: { path: { ticketId: selectedTicket.id } },
        body: {
          authorName: operatorName.trim(),
          authorRole: 'Operator',
          message: replyText.trim(),
          newStatus: selectedTicket.status === 'Open' ? 'InProgress' : undefined,
        },
      });

      if (res.data) {
        toast.success('Response Dispatched', 'Operator reply recorded.');
        setReplyText('');
        await loadTickets();
      }
    } catch {
      toast.error('Dispatch Error', 'Failed to record operator reply.');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Client multi-param sorting
  const sortedTickets = useMemo(() => {
    const list = Array.isArray(tickets) ? [...tickets] : [];
    const priorityWeights: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'updatedAt') {
        cmp = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      } else if (sortBy === 'createdAt') {
        cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'priority') {
        cmp = (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
      } else if (sortBy === 'status') {
        cmp = a.status.localeCompare(b.status);
      }
      return sortDirection === 'DESC' ? cmp : -cmp;
    });

    return list;
  }, [tickets, sortBy, sortDirection]);

  // Messages in selected ticket sorted DESC by datetime (newest first)
  const sortedMessages = useMemo(() => {
    if (!selectedTicket?.messages) return [];
    return [...selectedTicket.messages].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [selectedTicket?.messages]);

  const visibleMessages = sortedMessages.slice(0, visibleMessagesCount);

  // High-level counts
  const safeTickets = Array.isArray(tickets) ? tickets : [];
  const openCount = safeTickets.filter((t) => t.status === 'Open').length;
  const inProgressCount = safeTickets.filter((t) => t.status === 'InProgress').length;
  const incidentCount = safeTickets.filter((t) => t.category === 'Incident' || t.priority === 'Critical').length;
  const resolvedCount = safeTickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;

  return (
    <div className="space-y-6 max-w-7xl font-mono text-zinc-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1">
            <LifeBuoy className="w-4 h-4 text-zinc-100" />
            <span>INCIDENT TRIAGE & OPERATIONS SUPPORT</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight uppercase">
            Operations Support & Incident Triage
          </h1>
          <p className="text-xs text-zinc-100 mt-1">
            Production incident triage, execution anomalies, and developer assistance tickets.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium text-xs font-bold uppercase flex items-center gap-2 transition-colors self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Ticket</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 border border-[#262626] bg-[#171717] rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-zinc-100">
            <span>Awaiting Triage</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-bold font-mono text-zinc-100">{openCount}</p>
        </div>

        <div className="p-4 border border-[#262626] bg-[#171717] rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-zinc-100">
            <span>Active Investigations</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-bold font-mono text-zinc-100">{inProgressCount}</p>
        </div>

        <div className="p-4 border border-[#262626] bg-[#171717] rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-zinc-100">
            <span>Critical / Incidents</span>
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-400">{incidentCount}</p>
        </div>

        <div className="p-4 border border-[#262626] bg-[#171717] rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-zinc-100">
            <span>Resolved / Closed</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-bold font-mono text-[#3ECF8E]">{resolvedCount}</p>
        </div>
      </div>

      {/* Multi-Param Filter & Sort Control Bar */}
      <div className="p-4 border border-[#262626] bg-[#171717] rounded-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-100 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadTickets()}
              placeholder="SEARCH TICKETS..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#171717] border border-[#262626] text-xs font-mono text-zinc-100 focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md uppercase placeholder:text-zinc-400"
            />
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase text-[11px] flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2 py-1.5 bg-[#171717] border border-[#262626] text-xs font-bold uppercase rounded-md focus:outline-none focus:border-[#3ECF8E]"
            >
              <option value="updatedAt">Updated At</option>
              <option value="createdAt">Created At</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
            </select>
            <button
              onClick={() => setSortDirection(sortDirection === 'DESC' ? 'ASC' : 'DESC')}
              className="px-2.5 py-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold uppercase text-xs transition-colors"
            >
              {sortDirection}
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#262626] text-xs">
          {/* Status */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <span className="font-bold uppercase text-[10px] mr-1">Status:</span>
            {['All', 'Open', 'InProgress', 'Resolved', 'Closed'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-0.5 border border-[#262626] rounded-full uppercase text-[10px] font-bold transition-colors ${
                  statusFilter === s ? 'bg-black text-white' : 'bg-[#171717] text-zinc-100 rounded-xl hover:bg-[#1f1f1f]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Priority */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <span className="font-bold uppercase text-[10px] mr-1">Priority:</span>
            {['All', 'Critical', 'High', 'Medium', 'Low'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriorityFilter(p)}
                className={`px-2.5 py-0.5 border border-[#262626] rounded-full uppercase text-[10px] font-bold transition-colors ${
                  priorityFilter === p ? 'bg-black text-white' : 'bg-[#171717] text-zinc-100 rounded-xl hover:bg-[#1f1f1f]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Category */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <span className="font-bold uppercase text-[10px] mr-1">Category:</span>
            {['All', 'Incident', 'Bug', 'FeatureRequest', 'Billing', 'General'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoryFilter(c)}
                className={`px-2.5 py-0.5 border border-[#262626] rounded-full uppercase text-[10px] font-bold transition-colors ${
                  categoryFilter === c ? 'bg-black text-white' : 'bg-[#171717] text-zinc-100 rounded-xl hover:bg-[#1f1f1f]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Layout: Ticket List + Triage & Message Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 border border-[#262626] bg-[#171717] p-6 rounded-xl">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-100" />
              <p className="text-xs font-bold uppercase">Loading tickets...</p>
            </div>
          ) : sortedTickets.length === 0 ? (
            <div className="py-16 text-center border border-[#262626] p-6 bg-[#171717] space-y-2 rounded-xl">
              <LifeBuoy className="w-8 h-8 text-zinc-100 mx-auto" />
              <p className="text-xs font-bold uppercase">No matching tickets in queue</p>
            </div>
          ) : (
            sortedTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                className={`p-4 border rounded-xl transition-all cursor-pointer ${
                  selectedTicket?.id === t.id
                    ? 'border-[#3ECF8E] bg-[#1f1f1f] ring-1 ring-[#3ECF8E]/30'
                    : 'border-[#262626] bg-[#171717] hover:bg-[#1f1f1f]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2.5 py-0.5 border border-[#262626] rounded-full text-[10px] font-bold uppercase ${
                        t.status === 'Open'
                          ? 'bg-[#171717] text-zinc-100'
                          : t.status === 'InProgress'
                          ? 'bg-[#222222] text-amber-400 border-amber-500/30'
                          : t.status === 'Resolved'
                          ? 'bg-[#3ECF8E] text-[#0f0f0f]'
                          : 'bg-[#141414] text-zinc-400'
                      }`}
                    >
                      {t.status}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-zinc-100">
                      [{t.category}]
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase ${
                      t.priority === 'Critical'
                        ? 'text-rose-400'
                        : t.priority === 'High'
                        ? 'text-zinc-100 underline'
                        : 'text-zinc-100'
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-zinc-100 uppercase truncate">{t.title}</h4>
                <p className="text-xs text-zinc-100 line-clamp-2 mt-1">{t.description}</p>

                <div className="flex items-center justify-between text-[10px] text-zinc-100 mt-3 pt-2 border-t border-[#262626]">
                  <span>@{t.authorName}</span>
                  <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}

          {/* Pagination Controls */}
          <div className="flex items-center justify-between p-3 border border-[#262626] bg-[#171717] text-xs rounded-xl">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold uppercase px-2">Page {page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={tickets.length < pageSize}
                className="p-1 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-1.5 py-0.5 border border-[#262626] bg-[#171717] text-xs font-bold rounded-md focus:outline-none focus:border-[#3ECF8E]"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Selected Ticket Triage Details & DESC Message Stream */}
        <div className="lg:col-span-7">
          {selectedTicket ? (
            <div className="border border-[#262626] bg-[#171717] p-6 rounded-xl space-y-6">
              {/* Header & Status Actions */}
              <div className="space-y-4 border-b border-[#262626] pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 border border-[#262626] bg-[#171717] text-[10px] font-bold uppercase rounded-full">
                        Target: {selectedTicket.targetType}
                      </span>
                      <span className="text-xs font-bold uppercase">
                        Category: {selectedTicket.category}
                      </span>
                    </div>
                    <h3 className="text-base font-bold uppercase text-zinc-100">{selectedTicket.title}</h3>
                  </div>

                  {/* Transitions */}
                  <div className="flex items-center gap-1.5">
                    {selectedTicket.status !== 'InProgress' && selectedTicket.status !== 'Closed' && (
                      <button
                        type="button"
                        onClick={() => handleStatusTransition(selectedTicket.id, 'InProgress')}
                        disabled={updatingStatus}
                        className="px-3.5 py-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full text-xs font-bold uppercase transition-colors"
                      >
                        Mark In-Progress
                      </button>
                    )}
                    {selectedTicket.status !== 'Resolved' && selectedTicket.status !== 'Closed' && (
                      <button
                        type="button"
                        onClick={() => handleStatusTransition(selectedTicket.id, 'Resolved')}
                        disabled={updatingStatus}
                        className="px-3.5 py-1.5 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full text-xs font-bold uppercase transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                    {selectedTicket.status !== 'Closed' ? (
                      <button
                        type="button"
                        onClick={() => handleStatusTransition(selectedTicket.id, 'Closed')}
                        disabled={updatingStatus}
                        className="px-3.5 py-1.5 border border-[#262626] bg-[#171717] hover:bg-rose-950/40 hover:border-rose-500/50 text-rose-400 rounded-full text-xs font-bold uppercase transition-colors"
                      >
                        Close
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStatusTransition(selectedTicket.id, 'Open')}
                        disabled={updatingStatus}
                        className="px-3.5 py-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full text-xs font-bold uppercase transition-colors"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-zinc-100 flex flex-wrap items-center gap-4 pt-1">
                  <span>Author: <strong className="uppercase">@{selectedTicket.authorName}</strong></span>
                  <span>Priority: <strong className={`uppercase ${selectedTicket.priority === 'Critical' ? 'text-rose-400 font-bold' : ''}`}>{selectedTicket.priority}</strong></span>
                  <span>Opened: {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Instant Reply Composer placed at TOP of stream so NO scrolling required */}
              <form onSubmit={handleSendReply} className="border border-[#262626] p-4 bg-[#141414] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-zinc-100 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-zinc-100" />
                    <span>Post Response (Appends Immediately to Stream)</span>
                  </span>
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="bg-[#171717] border border-[#262626] px-2.5 py-1 text-[11px] font-mono text-zinc-100 focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md uppercase font-bold"
                    placeholder="Operator Name"
                  />
                </div>

                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  placeholder="Draft resolution notes, instructions for the trader, or internal telemetry findings..."
                  className="w-full bg-[#171717] border border-[#262626] p-3 text-xs text-zinc-100 focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 font-mono leading-relaxed rounded-md"
                  required
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingReply}
                    className="flex items-center gap-2 px-5 py-2 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium text-xs font-bold uppercase transition-all disabled:opacity-50"
                  >
                    {submittingReply ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Dispatch Update</span>
                  </button>
                </div>
              </form>

              {/* Message History - Sorted DESC (Newest first) with Lazy Loading */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-[#262626]">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-100">
                    Thread Message Stream ({sortedMessages.length} responses • DESC chronologically)
                  </span>
                  {sortedMessages.length > visibleMessagesCount && (
                    <button
                      type="button"
                      onClick={() => setVisibleMessagesCount((c) => c + 5)}
                      className="px-2.5 py-1 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] text-[10px] font-bold uppercase transition-colors"
                    >
                      Load Older Messages (+5)
                    </button>
                  )}
                </div>

                {visibleMessages.length === 0 ? (
                  <p className="text-xs text-zinc-100 italic p-4 border border-[#262626] bg-[#171717] rounded-lg">
                    No operator replies yet. Initial request below:
                  </p>
                ) : (
                  visibleMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`border border-[#262626] rounded-lg p-4 space-y-2 ${
                        m.authorRole === 'Operator' ? 'bg-[#1f1f1f]' : 'bg-[#141414]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold uppercase text-zinc-100">@{m.authorName}</span>
                          <span className="px-2 py-0.5 border border-[#262626] text-[9px] font-bold uppercase bg-[#171717] rounded-full">
                            {m.authorRole}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-100">
                          {new Date(m.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-100 leading-relaxed whitespace-pre-wrap">
                        {m.message}
                      </p>
                    </div>
                  ))
                )}

                {/* Initial Description Card at Bottom of stream */}
                <div className="border border-[#262626] p-4 bg-[#1f1f1f] rounded-lg space-y-1">
                  <div className="text-[10px] font-bold uppercase text-zinc-100">Initial Description:</div>
                  <p className="text-xs text-zinc-100 leading-relaxed whitespace-pre-wrap">
                    {selectedTicket.description}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="min-h-[300px] flex flex-col items-center justify-center border border-[#262626] p-8 text-center bg-[#171717] space-y-2 rounded-xl">
              <LifeBuoy className="w-8 h-8 text-zinc-100" />
              <p className="text-xs font-bold uppercase text-zinc-100">
                Select a ticket from the queue to view details and post replies
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onTicketCreated={loadTickets}
      />
    </div>
  );
}
