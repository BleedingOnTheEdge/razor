'use client';

import React, { useState } from 'react';
import { Plus, X, LifeBuoy } from 'lucide-react';
import { getApiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';

export interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated: () => Promise<void>;
}

export function CreateTicketModal({ isOpen, onClose, onTicketCreated }: CreateTicketModalProps) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'General' | 'Bug' | 'Billing' | 'Incident' | 'FeatureRequest'>('General');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [authorName, setAuthorName] = useState('Senior Operations Engineer');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Validation Error', 'Title and description are required.');
      return;
    }

    setSubmitting(true);
    try {
      const client = getApiClient();
      const res = await client.POST('/api/tickets', {
        body: {
          title: title.trim(),
          category,
          priority,
          authorName: authorName.trim(),
          description: description.trim(),
          targetType: 'SystemManager',
        },
      });

      if (res.data) {
        toast.success('Ticket Opened', `Support ticket #${res.data.id.slice(0, 8)} submitted.`);
        setTitle('');
        setDescription('');
        onClose();
        await onTicketCreated();
      } else {
        toast.error('Submission Failed', 'Failed to register ticket.');
      }
    } catch (err) {
      toast.error('Submission Error', err instanceof Error ? err.message : 'Network error.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[#171717] border border-[#262626] max-w-lg w-full p-6 space-y-4 font-mono">
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <h3 className="text-sm font-bold uppercase text-zinc-100 flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-zinc-100" />
            <span>Open Support or Incident Ticket</span>
          </h3>
          <button type="button" onClick={onClose} className="p-1 border border-[#262626] text-zinc-100 hover:bg-[#1f1f1f]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-zinc-100 font-bold uppercase text-[11px] mb-1">Ticket Subject / Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Engine RPC timeout on order dispatch"
              className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs font-mono focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-black rounded-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-100 font-bold uppercase text-[11px] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-[#171717] border border-[#262626] text-zinc-100 text-xs font-mono rounded-none uppercase font-bold"
              >
                <option value="General">General Inquiries</option>
                <option value="Bug">Defect / Bug Report</option>
                <option value="Incident">Production Incident</option>
                <option value="FeatureRequest">Feature Request</option>
                <option value="Billing">Billing & Subscription</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-100 font-bold uppercase text-[11px] mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-[#171717] border border-[#262626] text-zinc-100 text-xs font-mono rounded-none uppercase font-bold"
              >
                <option value="Low">Low - Informational</option>
                <option value="Medium">Medium - Standard</option>
                <option value="High">High - Elevated Attention</option>
                <option value="Critical">Critical - Urgent Blocker</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-zinc-100 font-bold uppercase text-[11px] mb-1">Submitting Author</label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs font-mono focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-black rounded-none"
            />
          </div>

          <div>
            <label className="block text-zinc-100 font-bold uppercase text-[11px] mb-1">Description & Incident Details</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Provide exact error logs, reproduction steps, or operational impact..."
              className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs font-mono focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-black rounded-none leading-relaxed"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold uppercase text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium disabled:opacity-50 font-bold uppercase text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting...' : 'Open Ticket'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
