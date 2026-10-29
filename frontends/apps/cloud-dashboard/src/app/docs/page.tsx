'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PublicNav, PublicFooter } from '@/components/layout/PublicNav';
import { Code2, Terminal, Layers, Cpu, Check, Copy, ArrowRight, BookOpen, Sparkles } from 'lucide-react';

export default function DocsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const strategySnippet = `using Razor.Sdk.Slots.Strategy;
using Razor.Sdk.Models;

public class MeanRevertingPairsStrategy : ITradingStrategy
{
    // Genetic Algorithm Parameter Declarations
    [GeneParameter(Min = 5, Max = 50, Step = 1)]
    public int LookbackWindow { get; set; } = 20;

    [GeneParameter(Min = 1.0, Max = 3.5, Step = 0.1)]
    public double ZScoreThreshold { get; set; } = 2.0;

    public void OnTick(Tick tick, IBrokerAdapter broker)
    {
        double currentZScore = CalculateZScore(tick.Price);
        if (currentZScore > ZScoreThreshold)
        {
            broker.PlaceOrder(new OrderRequest 
            {
                Symbol = tick.Symbol,
                Side = OrderSide.Sell,
                Quantity = 1.0,
                StopLoss = tick.Price * 1.02,
                TakeProfit = tick.Price * 0.97
            });
        }
    }
}`;

  const fitnessSnippet = `using Razor.Kernel.Hooks;

public class SortinoSharpeCompositeHook : IFitnessHook
{
    public double EvaluateFitness(FitnessEvaluationContext context)
    {
        // Punish drawdown aggressively; reward geometric compounding
        if (context.MaxDrawdownPercent > 10.0) return 0.0;
        
        double sharpe = context.SharpeRatio;
        double sortino = context.SortinoRatio;
        double profitFactor = context.ProfitFactor;

        return (sharpe * 0.4) + (sortino * 0.4) + (profitFactor * 0.2);
    }
}`;

  const adapterSnippet = `using Razor.Sdk.Slots.Adapter;
using Razor.Sdk.Models;

public class Mt5BridgeAdapter : IBrokerAdapter
{
    public Task ConnectAsync(AdapterConfiguration config)
    {
        // Authenticate with MT5 IPC socket or broker gateway
        return Task.CompletedTask;
    }

    public Task<OrderResult> PlaceOrderAsync(OrderRequest order)
    {
        // Sub-millisecond tick execution to live exchange
        return Task.FromResult(new OrderResult { Success = true, Ticket = "ORD-" + Guid.NewGuid() });
    }
}`;

  return (
    <div className="min-h-screen bg-[#171717] text-zinc-100 rounded-xl font-mono text-xs selection:bg-black selection:text-white flex flex-col justify-between">
      <PublicNav />

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-16 space-y-16 flex-1">
        {/* Header */}
        <section className="space-y-4 max-w-4xl">
          <div className="inline-block px-3 py-1 border border-[#262626] bg-[#171717] font-bold text-zinc-100 uppercase">
            DEVELOPER ARCHITECTURE GUIDE
          </div>
          <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-tight text-zinc-100 leading-none">
            Slots & Hooks Extension Ecosystem
          </h1>
          <p className="text-sm md:text-base text-zinc-100 leading-relaxed font-normal pt-2">
            Build and publish high-performance trading strategies, live broker bridges, and custom fitness objectives using the modular Razor SDK.
            Every component compiles directly into native .NET 10 LTS binaries with sub-millisecond execution fidelity.
          </p>
        </section>

        {/* Quick Index */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a href="#slots" className="p-4 border border-[#262626] hover:bg-[#141414] transition-colors block space-y-1">
            <span className="font-bold text-sm uppercase block">[1] Trading Strategy Slots</span>
            <p className="text-[11px] text-zinc-400">ITradingStrategy, tick loops, and genetic parameter genes.</p>
          </a>

          <a href="#hooks" className="p-4 border border-[#262626] hover:bg-[#141414] transition-colors block space-y-1">
            <span className="font-bold text-sm uppercase block">[2] Fitness Evaluation Hooks</span>
            <p className="text-[11px] text-zinc-400">IFitnessHook, objective functions, and drawdown penalties.</p>
          </a>

          <a href="#adapters" className="p-4 border border-[#262626] hover:bg-[#141414] transition-colors block space-y-1">
            <span className="font-bold text-sm uppercase block">[3] Broker Adapters & Publishing</span>
            <p className="text-[11px] text-zinc-400">IBrokerAdapter, MT5/Crypto bridges, and marketplace cataloging.</p>
          </a>
        </section>

        {/* Section 1: Strategy Slots */}
        <section id="slots" className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#262626] pb-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-zinc-500">SECTION 01</span>
              <h2 className="text-xl font-bold uppercase">Trading Strategy Slots (ITradingStrategy)</h2>
            </div>
            <span className="border border-[#262626] px-2 py-0.5 text-[10px] font-bold">Profile D Contract</span>
          </div>

          <p className="text-sm leading-relaxed">
            Strategy Slots implement the <code>ITradingStrategy</code> interface. Strategies declare optimizable genes using the <code>[GeneParameter]</code> attribute. When the Genetic Algorithm optimizer runs, it mutates and crosses over these parameters to identify optimal risk-reward boundaries without manual intervention.
          </p>

          <div className="border border-[#262626] bg-zinc-950 text-zinc-100 p-4 space-y-2 relative">
            <div className="flex items-center justify-between text-[11px] border-b border-zinc-800 pb-2 text-zinc-400">
              <span>MeanRevertingPairsStrategy.cs</span>
              <button
                onClick={() => copyToClipboard(strategySnippet, 'strategy')}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                {copiedCode === 'strategy' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode === 'strategy' ? 'COPIED' : 'COPY SNIPPET'}</span>
              </button>
            </div>
            <pre className="overflow-x-auto text-[11px] font-mono leading-relaxed p-2">
              <code>{strategySnippet}</code>
            </pre>
          </div>
        </section>

        {/* Section 2: Fitness Hooks */}
        <section id="hooks" className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#262626] pb-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-zinc-500">SECTION 02</span>
              <h2 className="text-xl font-bold uppercase">Fitness Evaluation Hooks (IFitnessHook)</h2>
            </div>
            <span className="border border-[#262626] px-2 py-0.5 text-[10px] font-bold">Optimization Interceptor</span>
          </div>

          <p className="text-sm leading-relaxed">
            Fitness Hooks govern how the genetic selection operator scores candidate chromosomes at the end of each generation. By injecting a custom hook, you can optimize for Sharpe, Sortino, Calmar, or custom institutional payout profiles.
          </p>

          <div className="border border-[#262626] bg-zinc-950 text-zinc-100 p-4 space-y-2 relative">
            <div className="flex items-center justify-between text-[11px] border-b border-zinc-800 pb-2 text-zinc-400">
              <span>SortinoSharpeCompositeHook.cs</span>
              <button
                onClick={() => copyToClipboard(fitnessSnippet, 'fitness')}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                {copiedCode === 'fitness' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode === 'fitness' ? 'COPIED' : 'COPY SNIPPET'}</span>
              </button>
            </div>
            <pre className="overflow-x-auto text-[11px] font-mono leading-relaxed p-2">
              <code>{fitnessSnippet}</code>
            </pre>
          </div>
        </section>

        {/* Section 3: Broker Adapters */}
        <section id="adapters" className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#262626] pb-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-zinc-500">SECTION 03</span>
              <h2 className="text-xl font-bold uppercase">Broker Adapter Slots (IBrokerAdapter)</h2>
            </div>
            <span className="border border-[#262626] px-2 py-0.5 text-[10px] font-bold">Execution Connector</span>
          </div>

          <p className="text-sm leading-relaxed">
            Broker Adapters abstract third-party liquidity providers, proprietary broker terminals, and cryptocurrency exchanges. An adapter receives order placement requests and reports real-time execution fills and slippage telemetry back to the Engine.
          </p>

          <div className="border border-[#262626] bg-zinc-950 text-zinc-100 p-4 space-y-2 relative">
            <div className="flex items-center justify-between text-[11px] border-b border-zinc-800 pb-2 text-zinc-400">
              <span>Mt5BridgeAdapter.cs</span>
              <button
                onClick={() => copyToClipboard(adapterSnippet, 'adapter')}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                {copiedCode === 'adapter' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode === 'adapter' ? 'COPIED' : 'COPY SNIPPET'}</span>
              </button>
            </div>
            <pre className="overflow-x-auto text-[11px] font-mono leading-relaxed p-2">
              <code>{adapterSnippet}</code>
            </pre>
          </div>
        </section>

        {/* Marketplace Publishing Box */}
        <section className="p-8 border border-[#262626] bg-[#141414] space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm uppercase">
            <Sparkles className="w-4 h-4 text-zinc-100" />
            <span>Publishing to the Razor Marketplace</span>
          </div>
          <p className="text-xs leading-relaxed max-w-3xl">
            When your Strategy Slot or Broker Adapter is ready, package your compiled assembly with a manifest metadata file and publish it to the Marketplace Hub. Other operators and fund managers can acquire licenses and assign your slot to live execution runners in 1-click.
          </p>
          <div className="pt-2">
            <Link
              href="/marketplace"
              className="px-6 py-2.5 bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium font-bold text-xs border border-[#262626] inline-flex items-center gap-2 transition-colors uppercase"
            >
              <span>Explore Marketplace Catalog &rarr;</span>
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
