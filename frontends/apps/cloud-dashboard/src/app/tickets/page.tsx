'use client';

import { useState, useEffect } from 'react';
import { getApiClient } from '@/lib/api-client';
import type { TicketPayload } from '@razor/api-client';
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
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { CreateTicketModal } from '@/components/tickets/CreateTicketModal';

export default function OperatorTicketsPage() {
  const [tickets, setTickets] = useState<TicketPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketPayload | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
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
          },
        },
      });

      if (res.data) {
        setTickets(res.data);
        if (selectedTicket) {
          const fresh = res.data.find((t) => t.id === selectedTicket.id);
          if (fresh) setSelectedTicket(fresh);
        }
      }
    } catch {
      toast.error('Load Error', 'Failed to fetch tickets from control plane.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, [statusFilter]);

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

  const filteredTickets = tickets.filter((t) =>
    priorityFilter === 'All' ? true : t.priority === priorityFilter
  );

  const openCount = tickets.filter((t) => t.status === 'Open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'InProgress').length;
  const incidentCount = tickets.filter((t) => t.category === 'Incident' || t.priority === 'Critical').length;
  const resolvedCount = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;

  return (
    <div className="space-y-6 max-w-7xl font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-cyan-600" />
            <span>Operations Support & Incident Triage</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Cluster operational requests, developer inquiries, and production incidents triage console.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Ticket</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Awaiting Triage</span>
            <Clock className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-zinc-900">{openCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Active Investigations</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-700">{inProgressCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-rose-700 font-medium">
            <span>Critical / Incidents</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-800">{incidentCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Resolved / Closed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-700">{resolvedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
          <span className="text-zinc-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {['All', 'Open', 'InProgress', 'Resolved', 'Closed'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === s
                  ? 'bg-zinc-900 text-white font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-zinc-500 mr-1">Priority:</span>
          {['All', 'Critical', 'High', 'Medium', 'Low'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriorityFilter(p)}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                priorityFilter === p
                  ? 'bg-amber-100 text-amber-900 font-semibold border border-amber-300'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Ticket List + Detail / Reply View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-500 bg-white border border-zinc-200 rounded-2xl shadow-sm">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
              <p className="text-xs font-mono">Loading tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-zinc-200 rounded-2xl p-6 bg-zinc-50">
              <LifeBuoy className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-zinc-600">No matching tickets in queue</p>
            </div>
          ) : (
            filteredTickets.map((t) => (
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
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                        t.status === 'Open'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : t.status === 'InProgress'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : t.status === 'Resolved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {t.status}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      [{t.category}]
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-bold uppercase ${
                      t.priority === 'Critical'
                        ? 'text-rose-600'
                        : t.priority === 'High'
                        ? 'text-amber-700'
                        : 'text-zinc-500'
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-zinc-900 truncate">{t.title}</h4>
                <p className="text-xs text-zinc-500 line-clamp-2 mt-1">{t.description}</p>

                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mt-3 pt-2 border-t border-zinc-100">
                  <span>Author: {t.authorName}</span>
                  <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Ticket Triage Details */}
        <div className="lg:col-span-7">
          {selectedTicket ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-6 shadow-sm sticky top-6">
              {/* Header & Quick Action Buttons */}
              <div className="space-y-4 border-b border-zinc-100 pb-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-zinc-100 text-cyan-800 border border-zinc-200">
                        Target: {selectedTicket.targetType}
                      </span>
                      <span className="text-xs font-mono text-zinc-500">
                        Category: {selectedTicket.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900">{selectedTicket.title}</h3>
                  </div>

                  {/* Triage Status Transitions */}
                  <div className="flex items-center gap-2">
                    {selectedTicket.status !== 'InProgress' && selectedTicket.status !== 'Closed' && (
                      <button
                        type="button"
                        onClick={() => handleStatusTransition(selectedTicket.id, 'InProgress')}
                        disabled={updatingStatus}
                        className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-mono transition-colors cursor-pointer font-medium"
                      >
                        Mark In-Progress
                      </button>
                    )}
                    {selectedTicket.status !== 'Resolved' && selectedTicket.status !== 'Closed' && (
                      <button
                        type="button"
                        onClick={() => handleStatusTransition(selectedTicket.id, 'Resolved')}
                        disabled={updatingStatus}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-mono transition-colors cursor-pointer font-medium"
                      >
                        Resolve
                      </button>
                    )}
                    {selectedTicket.status !== 'Closed' ? (
                      <button
                        type="button"
                        onClick={() => handleStatusTransition(selectedTicket.id, 'Closed')}
                        disabled={updatingStatus}
                        className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-mono transition-colors cursor-pointer font-medium"
                      >
                        Close
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStatusTransition(selectedTicket.id, 'Open')}
                        disabled={updatingStatus}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-mono transition-colors cursor-pointer font-medium"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs font-mono text-zinc-500 flex items-center gap-4">
                  <span>Author: <strong className="text-zinc-800">{selectedTicket.authorName}</strong></span>
                  <span>Priority: <strong className={selectedTicket.priority === 'Critical' ? 'text-rose-600' : 'text-zinc-700'}>{selectedTicket.priority}</strong></span>
                  <span>Opened: {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Message History */}
              <div className="space-y-4 max-h-[440px] overflow-y-auto pr-2">
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-semibold text-zinc-700">Initial Description:</div>
                  <p className="text-xs text-zinc-800 leading-relaxed whitespace-pre-wrap font-sans">
                    {selectedTicket.description}
                  </p>
                </div>

                {selectedTicket.messages && selectedTicket.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`border rounded-xl p-4 space-y-2 ${
                      m.authorRole === 'Operator'
                        ? 'bg-cyan-50/50 border-cyan-200 ml-4'
                        : 'bg-zinc-50 border-zinc-200 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900">{m.authorName}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-200 text-zinc-800 font-bold">
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

              {/* Operator Reply Composer */}
              <form onSubmit={handleSendReply} className="space-y-3 pt-3 border-t border-zinc-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-cyan-600" />
                    <span>Post Operator Update</span>
                  </span>
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-[11px] font-mono text-zinc-800 focus:outline-none focus:bg-white"
                    placeholder="Operator Name"
                  />
                </div>

                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  placeholder="Draft resolution notes, instructions for the developer, or internal findings..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-900 focus:outline-none focus:bg-white focus:border-cyan-600 font-sans"
                  required
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingReply}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-sm"
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
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center border border-dashed border-zinc-200 rounded-2xl p-8 text-center text-zinc-400 bg-zinc-50/50">
              <LifeBuoy className="w-8 h-8 mb-2 text-zinc-400" />
              <p className="text-xs font-medium text-zinc-600">Select a ticket from the triage queue to view details and respond</p>
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
