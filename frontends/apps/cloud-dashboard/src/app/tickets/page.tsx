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
import { CreateTicketModal } from '@/components/tickets/CreateTicketModal';

export default function OperatorTicketsPage() {
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
  const [operatorName, setOperatorName] = useState('Senior Operations Engineer');
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
    <div className="space-y-6 max-w-7xl font-mono text-black">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1">
            <LifeBuoy className="w-4 h-4 text-black" />
            <span>INCIDENT TRIAGE & OPERATIONS SUPPORT</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight uppercase">
            Operations Support & Incident Triage
          </h1>
          <p className="text-xs text-black mt-1">
            Production incident triage, execution anomalies, and developer assistance tickets.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 border border-black bg-black text-white hover:bg-zinc-800 text-xs font-bold uppercase flex items-center gap-2 rounded-none transition-colors self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Ticket</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 border border-black bg-white space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-black">
            <span>Awaiting Triage</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-bold font-mono text-black">{openCount}</p>
        </div>

        <div className="p-4 border border-black bg-white space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-black">
            <span>Active Investigations</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-bold font-mono text-black">{inProgressCount}</p>
        </div>

        <div className="p-4 border border-black bg-white space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-black">
            <span>Critical / Incidents</span>
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-bold font-mono text-red-600">{incidentCount}</p>
        </div>

        <div className="p-4 border border-black bg-white space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-black">
            <span>Resolved / Closed</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-bold font-mono text-green-600">{resolvedCount}</p>
        </div>
      </div>

      {/* Multi-Param Filter & Sort Control Bar */}
      <div className="p-4 border border-black bg-white space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-black absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadTickets()}
              placeholder="SEARCH TICKETS..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-black text-xs font-mono text-black focus:outline-none focus:ring-1 focus:ring-black rounded-none uppercase placeholder:text-zinc-400"
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
              className="px-2 py-1.5 bg-white border border-black text-xs font-bold uppercase rounded-none"
            >
              <option value="updatedAt">Updated At</option>
              <option value="createdAt">Created At</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
            </select>
            <button
              onClick={() => setSortDirection(sortDirection === 'DESC' ? 'ASC' : 'DESC')}
              className="px-2.5 py-1.5 border border-black bg-white hover:bg-black hover:text-white font-bold uppercase text-xs transition-colors"
            >
              {sortDirection}
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black text-xs">
          {/* Status */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <span className="font-bold uppercase text-[10px] mr-1">Status:</span>
            {['All', 'Open', 'InProgress', 'Resolved', 'Closed'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-0.5 border border-black uppercase text-[10px] font-bold transition-colors ${
                  statusFilter === s ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'
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
                className={`px-2 py-0.5 border border-black uppercase text-[10px] font-bold transition-colors ${
                  priorityFilter === p ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'
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
                className={`px-2 py-0.5 border border-black uppercase text-[10px] font-bold transition-colors ${
                  categoryFilter === c ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'
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
            <div className="py-20 flex flex-col items-center justify-center gap-3 border border-black bg-white p-6">
              <Loader2 className="w-6 h-6 animate-spin text-black" />
              <p className="text-xs font-bold uppercase">Loading tickets...</p>
            </div>
          ) : sortedTickets.length === 0 ? (
            <div className="py-16 text-center border border-black p-6 bg-white space-y-2">
              <LifeBuoy className="w-8 h-8 text-black mx-auto" />
              <p className="text-xs font-bold uppercase">No matching tickets in queue</p>
            </div>
          ) : (
            sortedTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                className={`p-4 border transition-all cursor-pointer ${
                  selectedTicket?.id === t.id
                    ? 'border-black bg-zinc-100 ring-2 ring-black'
                    : 'border-black bg-white hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 border border-black text-[10px] font-bold uppercase ${
                        t.status === 'Open'
                          ? 'bg-white text-black'
                          : t.status === 'InProgress'
                          ? 'bg-black text-white'
                          : t.status === 'Resolved'
                          ? 'bg-green-600 text-white'
                          : 'bg-zinc-200 text-black'
                      }`}
                    >
                      {t.status}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-black">
                      [{t.category}]
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase ${
                      t.priority === 'Critical'
                        ? 'text-red-600'
                        : t.priority === 'High'
                        ? 'text-black underline'
                        : 'text-black'
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-black uppercase truncate">{t.title}</h4>
                <p className="text-xs text-black line-clamp-2 mt-1">{t.description}</p>

                <div className="flex items-center justify-between text-[10px] text-black mt-3 pt-2 border-t border-black">
                  <span>@{t.authorName}</span>
                  <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}

          {/* Pagination Controls */}
          <div className="flex items-center justify-between p-3 border border-black bg-white text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 border border-black bg-white hover:bg-black hover:text-white transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold uppercase px-2">Page {page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={tickets.length < pageSize}
                className="p-1 border border-black bg-white hover:bg-black hover:text-white transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-1.5 py-0.5 border border-black bg-white text-xs font-bold rounded-none"
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
            <div className="border border-black bg-white p-6 space-y-6">
              {/* Header & Status Actions */}
              <div className="space-y-4 border-b border-black pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 border border-black bg-white text-[10px] font-bold uppercase">
                        Target: {selectedTicket.targetType}
                      </span>
                      <span className="text-xs font-bold uppercase">
                        Category: {selectedTicket.category}
                      </span>
                    </div>
                    <h3 className="text-base font-bold uppercase text-black">{selectedTicket.title}</h3>
                  </div>

                  {/* Transitions */}
                  <div className="flex items-center gap-1.5">
                    {selectedTicket.status !== 'InProgress' && selectedTicket.status !== 'Closed' && (
                      <button
                        type="button"
                        onClick={() => handleStatusTransition(selectedTicket.id, 'InProgress')}
                        disabled={updatingStatus}
                        className="px-3 py-1.5 border border-black bg-white hover:bg-black hover:text-white text-black text-xs font-bold uppercase transition-colors"
                      >
                        Mark In-Progress
                      </button>
                    )}
                    {selectedTicket.status !== 'Resolved' && selectedTicket.status !== 'Closed' && (
                      <button
                        type="button"
                        onClick={() => handleStatusTransition(selectedTicket.id, 'Resolved')}
                        disabled={updatingStatus}
                        className="px-3 py-1.5 border border-black bg-white hover:bg-green-600 hover:text-white text-black text-xs font-bold uppercase transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                    {selectedTicket.status !== 'Closed' ? (
                      <button
                        type="button"
                        onClick={() => handleStatusTransition(selectedTicket.id, 'Closed')}
                        disabled={updatingStatus}
                        className="px-3 py-1.5 border border-black bg-white hover:bg-red-600 hover:text-white text-black text-xs font-bold uppercase transition-colors"
                      >
                        Close
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStatusTransition(selectedTicket.id, 'Open')}
                        disabled={updatingStatus}
                        className="px-3 py-1.5 border border-black bg-white hover:bg-black hover:text-white text-black text-xs font-bold uppercase transition-colors"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-black flex flex-wrap items-center gap-4 pt-1">
                  <span>Author: <strong className="uppercase">@{selectedTicket.authorName}</strong></span>
                  <span>Priority: <strong className={`uppercase ${selectedTicket.priority === 'Critical' ? 'text-red-600 font-bold' : ''}`}>{selectedTicket.priority}</strong></span>
                  <span>Opened: {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Instant Reply Composer placed at TOP of stream so NO scrolling required */}
              <form onSubmit={handleSendReply} className="border border-black p-4 bg-zinc-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-black flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-black" />
                    <span>Post Response (Appends Immediately to Stream)</span>
                  </span>
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="bg-white border border-black px-2.5 py-1 text-[11px] font-mono text-black focus:outline-none uppercase font-bold"
                    placeholder="Operator Name"
                  />
                </div>

                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  placeholder="Draft resolution notes, instructions for the trader, or internal telemetry findings..."
                  className="w-full bg-white border border-black p-3 text-xs text-black focus:outline-none focus:ring-1 focus:ring-black font-mono leading-relaxed rounded-none"
                  required
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingReply}
                    className="flex items-center gap-2 px-5 py-2 border border-black bg-black text-white hover:bg-zinc-800 text-xs font-bold uppercase transition-all disabled:opacity-50 rounded-none"
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
                <div className="flex items-center justify-between pb-1 border-b border-black">
                  <span className="text-xs font-bold uppercase tracking-wider text-black">
                    Thread Message Stream ({sortedMessages.length} responses • DESC chronologically)
                  </span>
                  {sortedMessages.length > visibleMessagesCount && (
                    <button
                      type="button"
                      onClick={() => setVisibleMessagesCount((c) => c + 5)}
                      className="px-2.5 py-1 border border-black bg-white hover:bg-black hover:text-white text-[10px] font-bold uppercase transition-colors"
                    >
                      Load Older Messages (+5)
                    </button>
                  )}
                </div>

                {visibleMessages.length === 0 ? (
                  <p className="text-xs text-black italic p-4 border border-black bg-white">
                    No operator replies yet. Initial request below:
                  </p>
                ) : (
                  visibleMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`border border-black p-4 space-y-2 ${
                        m.authorRole === 'Operator' ? 'bg-white' : 'bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold uppercase text-black">@{m.authorName}</span>
                          <span className="px-1.5 py-0.5 border border-black text-[9px] font-bold uppercase bg-white">
                            {m.authorRole}
                          </span>
                        </div>
                        <span className="text-[10px] text-black">
                          {new Date(m.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-black leading-relaxed whitespace-pre-wrap">
                        {m.message}
                      </p>
                    </div>
                  ))
                )}

                {/* Initial Description Card at Bottom of stream */}
                <div className="border border-black p-4 bg-zinc-100 space-y-1">
                  <div className="text-[10px] font-bold uppercase text-black">Initial Description:</div>
                  <p className="text-xs text-black leading-relaxed whitespace-pre-wrap">
                    {selectedTicket.description}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="min-h-[300px] flex flex-col items-center justify-center border border-black p-8 text-center bg-white space-y-2">
              <LifeBuoy className="w-8 h-8 text-black" />
              <p className="text-xs font-bold uppercase text-black">
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
