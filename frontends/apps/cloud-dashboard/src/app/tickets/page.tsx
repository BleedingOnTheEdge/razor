'use client';

import { useState, useEffect } from 'react';
import { getApiClient } from '@/lib/api-client';
import type { TicketPayload, TicketMessagePayload } from '@razor/api-client';
import { LifeBuoy, AlertTriangle, CheckCircle2, Clock, MessageSquare, Send, ShieldAlert, Check, X, Filter, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-cyan-400" />
            <span>Operations Support & Incident Triage</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Cluster operational requests, developer inquiries, and production incidents triage console.
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Awaiting Triage</span>
            <Clock className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">{openCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Active Investigations</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-400">{inProgressCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-red-950/20 border border-red-800/40 space-y-1">
          <div className="flex items-center justify-between text-xs text-red-300">
            <span>Critical / Incidents</span>
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-red-400">{incidentCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Resolved</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-400">{resolvedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
          <span className="text-zinc-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {['All', 'Open', 'InProgress', 'Resolved', 'Closed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === s
                  ? 'bg-zinc-800 text-cyan-400 font-semibold border border-cyan-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
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
              onClick={() => setPriorityFilter(p)}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                priorityFilter === p
                  ? 'bg-zinc-800 text-amber-400 font-semibold border border-amber-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
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
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              <p className="text-xs font-mono">Loading tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-zinc-800 rounded-2xl p-6 bg-zinc-900/40">
              <LifeBuoy className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-zinc-400">No matching tickets in queue</p>
            </div>
          ) : (
            filteredTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedTicket?.id === t.id
                    ? 'bg-zinc-800/90 border-cyan-500/60 shadow-lg'
                    : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                        t.status === 'Open'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : t.status === 'InProgress'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : t.status === 'Resolved'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {t.status}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      [{t.category}]
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-bold uppercase ${
                      t.priority === 'Critical'
                        ? 'text-red-400'
                        : t.priority === 'High'
                        ? 'text-amber-400'
                        : 'text-zinc-400'
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-white truncate">{t.title}</h4>
                <p className="text-xs text-zinc-400 line-clamp-2 mt-1">{t.description}</p>

                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 mt-3 pt-2 border-t border-zinc-800/60">
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
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-xl sticky top-6">
              {/* Header & Quick Action Buttons */}
              <div className="space-y-4 border-b border-zinc-800 pb-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-cyan-300 border border-zinc-700">
                        Target: {selectedTicket.targetType}
                      </span>
                      <span className="text-xs font-mono text-zinc-400">
                        Category: {selectedTicket.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{selectedTicket.title}</h3>
                  </div>

                  {/* Triage Status Transitions */}
                  <div className="flex items-center gap-2">
                    {selectedTicket.status !== 'InProgress' && selectedTicket.status !== 'Closed' && (
                      <button
                        onClick={() => handleStatusTransition(selectedTicket.id, 'InProgress')}
                        disabled={updatingStatus}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono transition-colors cursor-pointer"
                      >
                        Mark In-Progress
                      </button>
                    )}
                    {selectedTicket.status !== 'Resolved' && selectedTicket.status !== 'Closed' && (
                      <button
                        onClick={() => handleStatusTransition(selectedTicket.id, 'Resolved')}
                        disabled={updatingStatus}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono transition-colors cursor-pointer"
                      >
                        Resolve
                      </button>
                    )}
                    {selectedTicket.status !== 'Closed' ? (
                      <button
                        onClick={() => handleStatusTransition(selectedTicket.id, 'Closed')}
                        disabled={updatingStatus}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition-colors cursor-pointer"
                      >
                        Close
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusTransition(selectedTicket.id, 'Open')}
                        disabled={updatingStatus}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-mono transition-colors cursor-pointer"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs font-mono text-zinc-400 flex items-center gap-4">
                  <span>Author: <strong className="text-white">{selectedTicket.authorName}</strong></span>
                  <span>Priority: <strong className={selectedTicket.priority === 'Critical' ? 'text-red-400' : 'text-zinc-200'}>{selectedTicket.priority}</strong></span>
                  <span>Opened: {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Message History */}
              <div className="space-y-4 max-h-[440px] overflow-y-auto pr-2">
                <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-semibold text-zinc-300">Initial Description:</div>
                  <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {selectedTicket.description}
                  </p>
                </div>

                {selectedTicket.messages && selectedTicket.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`border rounded-xl p-4 space-y-2 ${
                      m.authorRole === 'Operator'
                        ? 'bg-cyan-950/20 border-cyan-800/40 ml-4'
                        : 'bg-zinc-950/40 border-zinc-800/60 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{m.authorName}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-800 text-cyan-400">
                          {m.authorRole}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {new Date(m.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans">
                      {m.message}
                    </p>
                  </div>
                ))}
              </div>

              {/* Operator Reply Composer */}
              <form onSubmit={handleSendReply} className="space-y-3 pt-3 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    <span>Post Operator Update</span>
                  </span>
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-[11px] font-mono text-zinc-300 focus:outline-none"
                    placeholder="Operator Name"
                  />
                </div>

                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  placeholder="Draft resolution notes, instructions for the developer, or internal findings..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
                  required
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingReply}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
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
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
              <LifeBuoy className="w-8 h-8 mb-2 text-zinc-600" />
              <p className="text-xs font-medium text-zinc-400">Select a ticket from the triage queue to view details and respond</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
