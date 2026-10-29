'use client';

import React from 'react';
import Link from 'next/link';
import { PublicNav, PublicFooter } from '@/components/layout/PublicNav';
import { Cpu, ShieldCheck, Zap, LineChart, Code2, Layers, ArrowRight } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#171717] text-zinc-100 rounded-xl font-mono text-xs selection:bg-black selection:text-white flex flex-col justify-between">
      <PublicNav />

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-16 space-y-16 flex-1">
        {/* Header */}
        <section className="space-y-4 max-w-4xl">
          <div className="inline-block px-3 py-1 border border-[#262626] bg-[#171717] font-bold text-zinc-100 uppercase">
            ABOUT RAZOR PLATFORM
          </div>
          <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-tight text-zinc-100 leading-none">
            Architected for Quantitative Rigor and Mechanical Speed.
          </h1>
          <p className="text-sm md:text-base text-zinc-100 leading-relaxed font-normal pt-2">
            Razor was engineered from first principles to bridge the gap between institutional quantitative research and real-world execution.
            We replace manual discretionary guesswork with deterministic genetic evolution, walk-forward out-of-sample simulation, and ultra-low-latency order routing.
          </p>
        </section>

        {/* Core Principles Grid */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold uppercase border-b border-[#262626] pb-2">
            Core Quantitative Tenets
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 border border-[#262626] bg-[#171717] space-y-3">
              <div className="w-10 h-10 border border-[#262626] flex items-center justify-center font-bold text-lg bg-black text-white">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-bold uppercase">Zero-Curve-Fitting Philosophy</h3>
              <p className="text-zinc-100 font-normal leading-relaxed">
                Traditional backtests overfit to past noise. Razor enforces strict walk-forward matrix windows where parameters evolved on in-sample data are verified across blind out-of-sample market regimes.
              </p>
            </div>

            <div className="p-6 border border-[#262626] bg-[#171717] space-y-3">
              <div className="w-10 h-10 border border-[#262626] flex items-center justify-center font-bold text-lg bg-black text-white">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-bold uppercase">High-Frequency .NET 10 LTS Core</h3>
              <p className="text-zinc-100 font-normal leading-relaxed">
                Matching and execution engines run on compiled native .NET 10 LTS. Sub-millisecond tick dispatch, zero memory allocations in the hot path, and lock-free ring buffers guarantee execution certainty.
              </p>
            </div>

            <div className="p-6 border border-[#262626] bg-[#171717] space-y-3">
              <div className="w-10 h-10 border border-[#262626] flex items-center justify-center font-bold text-lg bg-black text-white">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-bold uppercase">Institutional Risk Boundaries</h3>
              <p className="text-zinc-100 font-normal leading-relaxed">
                Pre-trade risk checks run before every order. Automated drawdown guards, maximum position sizing limits, and 1-click panic liquidation flatten buttons ensure total portfolio protection.
              </p>
            </div>
          </div>
        </section>

        {/* Technology Architecture */}
        <section className="p-8 border border-[#262626] bg-[#141414] space-y-6">
          <div className="flex items-center justify-between border-b border-[#262626] pb-3">
            <h2 className="text-lg font-bold uppercase">Monorepo System Architecture</h2>
            <span className="border border-[#262626] px-2 py-0.5 text-[10px] font-bold">10 PROJECTS • MODULAR DDD</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border border-[#262626] bg-[#171717] space-y-1.5">
              <span className="font-bold block text-sm">Engine & Kernel</span>
              <p className="text-[11px] text-zinc-100">
                C# algorithmic matching engine, genetic algorithm solver, simulated brokers, and strategy execution slots.
              </p>
            </div>

            <div className="p-4 border border-[#262626] bg-[#171717] space-y-1.5">
              <span className="font-bold block text-sm">Cloud Control Plane</span>
              <p className="text-[11px] text-zinc-100">
                FastEndpoints high-throughput REST API, WebSocket duplex stream server, and SQLite/PostgreSQL persistence.
              </p>
            </div>

            <div className="p-4 border border-[#262626] bg-[#171717] space-y-1.5">
              <span className="font-bold block text-sm">Operator Dashboard</span>
              <p className="text-[11px] text-zinc-100">
                Next.js 15 App Router interface featuring live financial charts, run dispatching, and instance monitoring.
              </p>
            </div>

            <div className="p-4 border border-[#262626] bg-[#171717] space-y-1.5">
              <span className="font-bold block text-sm">Marketplace Hub</span>
              <p className="text-[11px] text-zinc-100">
                Decoupled community hub for acquiring, rating, publishing, and versioning strategy slots and broker adapters.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-6 space-y-4">
          <h2 className="text-2xl font-bold uppercase">Ready to inspect the live engine?</h2>
          <div className="flex justify-center gap-4">
            <Link
              href="/panel"
              className="px-6 py-3 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium font-bold transition-colors flex items-center gap-2"
            >
              <span>[ACCESS OPERATOR TERMINAL]</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/docs"
              className="px-6 py-3 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors"
            >
              [READ DEVELOPER DOCS]
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
