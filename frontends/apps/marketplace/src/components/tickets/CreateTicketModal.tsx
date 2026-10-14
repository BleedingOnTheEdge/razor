'use client';

import React from 'react';
import { LifeBuoy, Loader2 } from 'lucide-react';
import type { UserProfilePayload } from '@razor/api-client';

export interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'SystemManager' | 'AdditiveDeveloper';
  setTargetType: (val: 'SystemManager' | 'AdditiveDeveloper') => void;
  targetItemName: string;
  setTargetItemName: (val: string) => void;
  category: 'Bug' | 'FeatureRequest' | 'Billing' | 'Incident' | 'General';
  setCategory: (val: 'Bug' | 'FeatureRequest' | 'Billing' | 'Incident' | 'General') => void;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  setPriority: (val: 'Low' | 'Medium' | 'High' | 'Critical') => void;
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  profile: UserProfilePayload | null;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function CreateTicketModal({
  isOpen,
  onClose,
  targetType,
  setTargetType,
  targetItemName,
  setTargetItemName,
  category,
  setCategory,
  priority,
  setPriority,
  title,
  setTitle,
  description,
  setDescription,
  profile,
  submitting,
  onSubmit,
}: CreateTicketModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-indigo-400" />
            <span>Open Support Ticket</span>
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xs font-mono"
          >
            ✕ Cancel
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-300">Routing Target</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="SystemManager">Razor Cloud Operations</option>
                <option value="AdditiveDeveloper">Additive / Extension Developer</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="General">General Inquiry</option>
                <option value="Bug">Bug Report</option>
                <option value="FeatureRequest">Feature Request</option>
                <option value="Billing">Billing & Entitlements</option>
                <option value="Incident">Operational Incident</option>
              </select>
            </div>
          </div>

          {targetType === 'AdditiveDeveloper' && (
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-300">Target Extension Name</label>
              <input
                type="text"
                value={targetItemName}
                onChange={(e) => setTargetItemName(e.target.value)}
                placeholder="e.g. MockPaperTradingAdapter, QuantMomentumIndicator"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                required={targetType === 'AdditiveDeveloper'}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-300">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-300">Submitting As</label>
              <div className="px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-400">
                {profile?.userName ?? 'dev-operator'}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-zinc-300">Subject / Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summary of issue or question..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-zinc-300">Detailed Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Provide step-by-step reproduction steps, stack traces, or operational impact details..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Submit Ticket</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
