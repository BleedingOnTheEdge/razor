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
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-zinc-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-cyan-600" />
            <span>Open Support or Incident Ticket</span>
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-zinc-700 font-semibold mb-1">Ticket Subject / Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Engine RPC timeout on order dispatch"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white text-xs font-sans"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white text-xs"
              >
                <option value="General">General Inquiries</option>
                <option value="Bug">Defect / Bug Report</option>
                <option value="Incident">Production Incident</option>
                <option value="FeatureRequest">Feature Request</option>
                <option value="Billing">Billing & Subscription</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white text-xs font-medium"
              >
                <option value="Low">Low - Informational</option>
                <option value="Medium">Medium - Standard</option>
                <option value="High">High - Elevated Attention</option>
                <option value="Critical">Critical - Urgent Blocker</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-zinc-700 font-semibold mb-1">Submitting Author</label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white text-xs font-sans"
            />
          </div>

          <div>
            <label className="block text-zinc-700 font-semibold mb-1">Description & Incident Details</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Provide exact error logs, reproduction steps, or operational impact..."
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white text-xs font-sans leading-relaxed"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
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
