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
    <div className="min-h-screen bg-white text-black font-mono text-xs selection:bg-black selection:text-white flex flex-col justify-between">
      <PublicNav />

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-16 space-y-12 flex-1">
        {/* Header */}
        <section className="space-y-4 max-w-3xl">
          <div className="inline-block px-3 py-1 border border-black bg-white font-bold text-black uppercase">
            OPERATIONS & DESK CONTACT
          </div>
          <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-tight text-black leading-none">
            Get in touch with the Razor Engineering & Trading Desk.
          </h1>
          <p className="text-sm text-black leading-relaxed font-normal">
            Direct routing for enterprise deployments, broker adapter integration partnerships, security disclosures, and 24/7 incident escalation.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Details Card */}
          <div className="p-8 border border-black bg-zinc-50 space-y-6">
            <h2 className="text-base font-bold uppercase border-b border-black pb-2">
              Communication Channels
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 mt-1 text-black shrink-0" />
                <div>
                  <span className="font-bold block">Trading Desk & Support</span>
                  <span className="text-black">desk@razor.trading</span>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Average response time: &lt; 15 minutes during market hours</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Terminal className="w-4 h-4 mt-1 text-black shrink-0" />
                <div>
                  <span className="font-bold block">In-Terminal Ticketing</span>
                  <p className="text-black">
                    For active engine instances, use the{' '}
                    <Link href="/tickets" className="underline font-bold">
                      Operations Triage Console
                    </Link>{' '}
                    to generate cryptographic diagnostic reports.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 mt-1 text-black shrink-0" />
                <div>
                  <span className="font-bold block">Security & Vulnerability Disclosure</span>
                  <span className="text-black">security@razor.trading</span>
                  <p className="text-[10px] text-zinc-600 mt-0.5">PGP Key ID: 0x98FA2B44C1D983</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-black space-y-2">
              <span className="font-bold uppercase text-[11px] block">Cluster Gateway Status</span>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-green-600 rounded-full animate-pulse" />
                <span className="font-bold text-green-700">All Cloud Control Planes Operational</span>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="p-8 border border-black bg-white space-y-6">
            <h2 className="text-base font-bold uppercase border-b border-black pb-2">
              Send Dispatch Request
            </h2>

            {submitted ? (
              <div className="p-6 border border-black bg-zinc-50 text-center space-y-4">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto" />
                <h3 className="font-bold text-sm uppercase">Dispatch Received</h3>
                <p className="text-xs text-black">
                  Your message has been assigned a priority correlation ticket. Our quant operations team will respond via verified email.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2 bg-black text-white text-xs font-bold border border-black"
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
                    className="w-full px-3 py-2 border border-black bg-white text-xs font-mono focus:outline-none"
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
                    className="w-full px-3 py-2 border border-black bg-white text-xs font-mono focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold uppercase text-[11px]">Subject</label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-black bg-white text-xs font-mono focus:outline-none"
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
                    className="w-full px-3 py-2 border border-black bg-white text-xs font-mono focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-black text-white hover:bg-zinc-800 text-xs font-bold border border-black flex items-center justify-center gap-2 uppercase transition-colors"
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
