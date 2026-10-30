'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PublicNav, PublicFooter } from '@/components/layout/PublicNav';
import { Mail, Phone, MapPin, Terminal, CheckCircle2, Send, ShieldAlert } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: 'Institutional Inquiries', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-zinc-100 font-mono text-xs selection:bg-[#3ECF8E] selection:text-[#0f0f0f] flex flex-col justify-between">
      <PublicNav />

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-16 space-y-12 flex-1">
        {/* Header */}
        <section className="space-y-4 max-w-3xl">
          <div className="inline-block px-3 py-1 border border-[#262626] bg-[#171717] font-bold text-zinc-100 uppercase">
            OPERATIONS & DESK CONTACT
          </div>
          <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-tight text-zinc-100 leading-none">
            Get in touch with the Razor Engineering & Trading Desk.
          </h1>
          <p className="text-sm text-zinc-100 leading-relaxed font-normal">
            Direct routing for enterprise deployments, broker adapter integration partnerships, security disclosures, and 24/7 incident escalation.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Details Card */}
          <div className="p-8 border border-[#262626] bg-[#141414] rounded-xl space-y-6">
            <h2 className="text-base font-bold uppercase border-b border-[#262626] pb-2">
              Communication Channels
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 mt-1 text-zinc-100 shrink-0" />
                <div>
                  <span className="font-bold block">Trading Desk & Support</span>
                  <span className="text-zinc-100">desk@razor.trading</span>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Average response time: &lt; 15 minutes during market hours</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Terminal className="w-4 h-4 mt-1 text-zinc-100 shrink-0" />
                <div>
                  <span className="font-bold block">In-Terminal Ticketing</span>
                  <p className="text-zinc-100">
                    For active engine instances, use the{' '}
                    <Link href="/tickets" className="underline font-bold">
                      Operations Triage Console
                    </Link>{' '}
                    to generate cryptographic diagnostic reports.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 mt-1 text-zinc-100 shrink-0" />
                <div>
                  <span className="font-bold block">Security & Vulnerability Disclosure</span>
                  <span className="text-zinc-100">security@razor.trading</span>
                  <p className="text-[10px] text-zinc-400 mt-0.5">PGP Key ID: 0x98FA2B44C1D983</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#262626] space-y-2">
              <span className="font-bold uppercase text-[11px] block">Cluster Gateway Status</span>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-[#3ECF8E] text-[#0f0f0f] rounded-full animate-pulse" />
                <span className="font-bold text-green-700">All Cloud Control Planes Operational</span>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="p-8 border border-[#262626] bg-[#171717] rounded-xl space-y-6">
            <h2 className="text-base font-bold uppercase border-b border-[#262626] pb-2">
              Send Dispatch Request
            </h2>

            {submitted ? (
              <div className="p-6 border border-[#262626] bg-[#141414] rounded-xl text-center space-y-4">
                <CheckCircle2 className="w-8 h-8 text-[#3ECF8E] mx-auto" />
                <h3 className="font-bold text-sm uppercase">Dispatch Received</h3>
                <p className="text-xs text-zinc-100">
                  Your message has been assigned a priority correlation ticket. Our quant operations team will respond via verified email.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2 bg-[#3ECF8E] text-[#0f0f0f] rounded-full text-xs font-bold border border-[#262626] hover:bg-[#34b27b] transition-colors"
                >
                  SEND ANOTHER MESSAGE
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="font-bold uppercase text-[11px]">Full Name or Desk Tag</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Chief Quant Operator"
                    className="w-full px-3 py-2 border border-[#262626] bg-[#171717] text-xs font-mono focus:outline-none focus:border-[#3ECF8E]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold uppercase text-[11px]">Corporate or Trader Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="operator@fund.com"
                    className="w-full px-3 py-2 border border-[#262626] bg-[#171717] text-xs font-mono focus:outline-none focus:border-[#3ECF8E]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold uppercase text-[11px]">Subject</label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-[#262626] bg-[#171717] text-xs font-mono focus:outline-none focus:border-[#3ECF8E]"
                  >
                    <option value="Institutional Inquiries">Institutional Fleet Deployment</option>
                    <option value="Broker Adapter Integration">Broker Adapter Integration (MT5 / Crypto)</option>
                    <option value="Marketplace Publishing">Marketplace Algorithm Publishing</option>
                    <option value="Bug Report or Incident">Bug Report or Incident</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold uppercase text-[11px]">Message</label>
                  <textarea
                    rows={4}
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Detail your inquiry or fleet specifications..."
                    className="w-full px-3 py-2 border border-[#262626] bg-[#171717] text-xs font-mono focus:outline-none focus:border-[#3ECF8E]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium text-xs font-bold border border-[#262626] flex items-center justify-center gap-2 uppercase transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Inquiry</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
