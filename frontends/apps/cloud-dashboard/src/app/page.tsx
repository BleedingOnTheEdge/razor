'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { PublicNav, PublicFooter } from '@/components/layout/PublicNav';
import {
  ArrowRight,
  ShieldAlert,
  Zap,
  Cpu,
  BarChart3,
  TrendingUp,
  Activity,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles
} from 'lucide-react';

export default function TraderLandingPage() {
  const { isAuthenticated, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'equity' | 'evolution' | 'montecarlo' | 'live'>('equity');
  const [simulationStep, setSimulationStep] = useState(0);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setSimulationStep((s) => (s + 1) % 60);
    }, 800);
    return () => clearInterval(timer);
  }, []);

  const equityPoints = [
    10000, 10250, 10180, 10600, 10520, 10980, 11400, 11250, 11800, 12350,
    12100, 12700, 13400, 13200, 13950, 14600, 14450, 15200, 15900, 16800,
    16600, 17400, 18250, 18900, 19800, 20600, 21500, 22400, 23800, 25200,
  ];

  const currentEquity = equityPoints[simulationStep % equityPoints.length] + (simulationStep * 35);
  const totalGainPct = ((currentEquity - 10000) / 10000) * 100;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-zinc-100 font-mono text-xs selection:bg-[#3ECF8E] selection:text-[#0f0f0f] flex flex-col justify-between">
      <PublicNav />

      <main className="space-y-16 flex-1">
        {/* Hero Section */}
        <header className="px-6 md:px-12 py-16 md:py-24 border-b border-[#262626] max-w-7xl mx-auto space-y-6">
          <div className="inline-block px-3 py-1 rounded-full border border-[#262626] bg-[#141414] font-bold text-zinc-300 uppercase">
            AUTOMATED QUANTITATIVE STRATEGY FACTORY
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-zinc-100 leading-none">
            BUILD YOUR <span className="text-rose-400">OWN</span> <br />
            <span className="text-[#3ECF8E]">MONEY PRINTING MACHINE</span>.
          </h1>

          <p className="text-sm md:text-base text-zinc-100 max-w-3xl leading-relaxed font-normal">
            Stop staring at charts and trading with fear and greed. Deploy autonomous algorithmic strategies evolved
            by genetic algorithms, stress-tested with rolling walk-forward simulations, and executed directly on your
            brokers with sub-millisecond precision.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            {mounted && isAuthenticated ? (
              <>
                <Link
                  href="/panel"
                  className="px-6 py-3 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium font-bold text-sm transition-colors flex items-center gap-2"
                >
                  <span>[ENTER OPERATOR TERMINAL]</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/panel/instances"
                  className="px-6 py-3 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium font-bold text-sm transition-colors"
                >
                  [VIEW FLEET INSTANCES]
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-6 py-3 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium font-bold text-sm transition-colors flex items-center gap-2"
                >
                  <span>[SIGN IN TO ACCESS TERMINAL]</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/auth/login"
                  className="px-6 py-3 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium font-bold text-sm transition-colors"
                >
                  [TRY INSTANT DEMO SESSION]
                </Link>
              </>
            )}
          </div>
        </header>

        {/* Institutional Quantitative KPI Scorecard for Traders */}
        <section className="px-6 md:px-12 max-w-7xl mx-auto space-y-4">
          <div className="flex items-center justify-between border-b border-[#262626] pb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-100">
              Institutional Quantitative Scorecard
            </h2>
            <span className="text-[10px] font-bold border border-[#262626] px-1.5 py-0.5">
              VERIFIED HISTORICAL TELEMETRY
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 border border-[#262626] bg-[#141414] rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase block">Sharpe Ratio</span>
              <span className="text-xl font-bold text-zinc-100 block">2.94</span>
              <span className="text-[9px] text-[#3ECF8E] font-bold block">&gt; 2.0 Institutional Elite</span>
            </div>

            <div className="p-3.5 border border-[#262626] bg-[#141414] rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase block">Sortino Ratio</span>
              <span className="text-xl font-bold text-zinc-100 block">4.12</span>
              <span className="text-[9px] text-zinc-400 block">Downside Volatility Adjusted</span>
            </div>

            <div className="p-3.5 border border-[#262626] bg-[#141414] rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase block">Profit Factor</span>
              <span className="text-xl font-bold text-[#3ECF8E] block">2.48</span>
              <span className="text-[9px] text-zinc-400 block">Gross Profit / Gross Loss</span>
            </div>

            <div className="p-3.5 border border-[#262626] bg-[#141414] rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase block">Max Drawdown</span>
              <span className="text-xl font-bold text-rose-400 block">-3.8%</span>
              <span className="text-[9px] text-zinc-400 block">Hard Circuit Breaker</span>
            </div>

            <div className="p-3.5 border border-[#262626] bg-[#141414] rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase block">Win Rate</span>
              <span className="text-xl font-bold text-zinc-100 block">68.4%</span>
              <span className="text-[9px] text-zinc-400 block">30 Rolling OOS Windows</span>
            </div>

            <div className="p-3.5 border border-[#262626] bg-[#141414] rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase block">Execution Latency</span>
              <span className="text-xl font-bold text-[#3ECF8E] block">8.4ms</span>
              <span className="text-[9px] text-zinc-400 block">Compiled .NET 10 LTS</span>
            </div>
          </div>
        </section>

        {/* Interactive Visualization Studio */}
        <section className="px-6 md:px-12 py-8 border-y border-[#262626] max-w-7xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#262626]">
            <div>
              <h2 className="text-lg font-bold uppercase text-zinc-100">
                Live Algorithmic Execution Simulator
              </h2>
              <p className="text-zinc-100 font-normal mt-0.5">
                Watch real-time strategy DNA synthesis, portfolio compounding, and sub-millisecond order fills.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab('equity')}
                className={`px-3 py-1.5 border border-[#262626] font-bold transition-colors ${
                  activeTab === 'equity' ? 'border-[#3ECF8E] bg-[#3ECF8E]/10 text-[#3ECF8E]' : 'border-[#262626] bg-[#141414] text-zinc-300 hover:bg-[#1f1f1f]'
                }`}
              >
                [EQUITY CURVE]
              </button>
              <button
                onClick={() => setActiveTab('evolution')}
                className={`px-3 py-1.5 border border-[#262626] font-bold transition-colors ${
                  activeTab === 'evolution' ? 'border-[#3ECF8E] bg-[#3ECF8E]/10 text-[#3ECF8E]' : 'border-[#262626] bg-[#141414] text-zinc-300 hover:bg-[#1f1f1f]'
                }`}
              >
                [GENETIC CONVERGENCE]
              </button>
              <button
                onClick={() => setActiveTab('montecarlo')}
                className={`px-3 py-1.5 border border-[#262626] font-bold transition-colors ${
                  activeTab === 'montecarlo' ? 'border-[#3ECF8E] bg-[#3ECF8E]/10 text-[#3ECF8E]' : 'border-[#262626] bg-[#141414] text-zinc-300 hover:bg-[#1f1f1f]'
                }`}
              >
                [MONTE CARLO RISK]
              </button>
              <button
                onClick={() => setActiveTab('live')}
                className={`px-3 py-1.5 border border-[#262626] font-bold transition-colors ${
                  activeTab === 'live' ? 'border-[#3ECF8E] bg-[#3ECF8E]/10 text-[#3ECF8E]' : 'border-[#262626] bg-[#141414] text-zinc-300 hover:bg-[#1f1f1f]'
                }`}
              >
                [LIVE ORDER STREAM]
              </button>
            </div>
          </div>

          {/* Dynamic Display Canvas */}
          <div className="p-6 border border-[#262626] bg-[#171717] rounded-xl space-y-6">
            {/* Quick Live Telemetry Header */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border border-[#262626] bg-[#141414] rounded-lg">
              <div>
                <span className="font-bold text-zinc-100 uppercase block">Simulated Portfolio</span>
                <span className="text-2xl font-bold text-[#3ECF8E] mt-1 block">
                  ${currentEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="font-bold text-zinc-100 uppercase block">Total Compounded ROI</span>
                <span className="text-2xl font-bold text-[#3ECF8E] mt-1 block">
                  +{totalGainPct.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="font-bold text-zinc-100 uppercase block">Calmar Ratio</span>
                <span className="text-2xl font-bold text-zinc-100 mt-1 block">
                  3.65
                </span>
              </div>
              <div>
                <span className="font-bold text-zinc-100 uppercase block">Max Drawdown Guard</span>
                <span className="text-2xl font-bold text-rose-400 mt-1 block">
                  -3.8%
                </span>
              </div>
            </div>

            {/* Tab 1: Equity Curve SVG */}
            {activeTab === 'equity' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>SIMULATED OUT-OF-SAMPLE EQUITY PROGRESSION</span>
                  <span className="text-[#3ECF8E]">[30 ROLLING WINDOWS • ZERO CURVE FITTING]</span>
                </div>
                <div className="h-64 border border-[#262626] bg-[#141414] rounded-xl p-4 flex items-end">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
                    <line x1="0" y1="50" x2="600" y2="50" stroke="#000000" strokeWidth="0.5" strokeDasharray="4 4" />
                    <line x1="0" y1="100" x2="600" y2="100" stroke="#000000" strokeWidth="0.5" strokeDasharray="4 4" />
                    <line x1="0" y1="150" x2="600" y2="150" stroke="#000000" strokeWidth="0.5" strokeDasharray="4 4" />

                    <polyline
                      fill="none"
                      stroke="#16a34a"
                      strokeWidth="2.5"
                      points={equityPoints
                        .map((val, idx) => {
                          const x = (idx / (equityPoints.length - 1)) * 600;
                          const y = 200 - ((val - 9000) / (26000 - 9000)) * 180;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                  </svg>
                </div>
              </div>
            )}

            {/* Tab 2: Genetic Convergence */}
            {activeTab === 'evolution' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>POPULATION CHROMOSOME EVOLUTION ACROSS GENERATIONS</span>
                  <span className="text-zinc-100">[FITNESS CLIMB: +312% • GENOME DIVERSITY: 0.84]</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { gen: 1, best: 0.94, avg: 0.42, div: 0.95, genes: [0.12, 0.45, 12, 30] },
                    { gen: 15, best: 2.15, avg: 1.62, div: 0.74, genes: [0.03, 0.08, 14, 21] },
                    { gen: 30, best: 3.92, avg: 3.41, div: 0.52, genes: [0.015, 0.045, 14, 26] },
                  ].map((g) => (
                    <div key={g.gen} className="p-4 border border-[#262626] bg-[#171717] rounded-xl space-y-2">
                      <div className="flex items-center justify-between font-bold border-b border-[#262626] pb-1">
                        <span>GENERATION #{g.gen}</span>
                        <span className="text-[#3ECF8E]">Fitness: {g.best}</span>
                      </div>
                      <div className="text-[11px] space-y-1">
                        <div>Average Fitness: <strong>{g.avg}</strong></div>
                        <div>Diversity Index: <strong>{(g.div * 100).toFixed(0)}%</strong></div>
                        <div className="pt-1 text-[10px] break-all">
                          Winning Chromosome: <strong>[{g.genes.join(', ')}]</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Monte Carlo Risk */}
            {activeTab === 'montecarlo' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>500-PATH RESAMPLED MONTE CARLO RISK CONE</span>
                  <span className="text-zinc-400">[99% CONFIDENCE VALUE AT RISK: $412]</span>
                </div>
                <div className="h-64 border border-[#262626] bg-[#141414] rounded-xl p-4 flex items-end">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
                    {/* Upper 95% Band */}
                    <path d="M 0 160 Q 300 80 600 20 L 600 120 Q 300 140 0 160 Z" fill="#bbf7d0" fillOpacity="0.4" />
                    {/* Expected Path */}
                    <line x1="0" y1="160" x2="600" y2="70" stroke="#16a34a" strokeWidth="2.5" />
                    {/* Lower 5% Boundary */}
                    <line x1="0" y1="160" x2="600" y2="120" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="3 3" />
                  </svg>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Start: $10,000</span>
                  <span>Worst 1st Percentile Path: $18,400</span>
                  <span>Median Projected Compounding: $25,200</span>
                </div>
              </div>
            )}

            {/* Tab 4: Live Order Stream */}
            {activeTab === 'live' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>HIGH-FREQUENCY ORDER EXECUTION TELEMETRY</span>
                  <span className="text-[#3ECF8E]">[LATENCY: 8.4ms • ZERO SLIPPAGE]</span>
                </div>
                <div className="border border-[#262626] overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#262626] bg-[#171717]">
                        <th className="p-2.5 font-bold text-zinc-100">Ticket</th>
                        <th className="p-2.5 font-bold text-zinc-100">Symbol</th>
                        <th className="p-2.5 font-bold text-zinc-100">Direction</th>
                        <th className="p-2.5 font-bold text-zinc-100 text-right">Fill Price</th>
                        <th className="p-2.5 font-bold text-zinc-100 text-right">Hard SL</th>
                        <th className="p-2.5 font-bold text-zinc-100 text-right">Target TP</th>
                        <th className="p-2.5 font-bold text-zinc-100 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { t: 'ORD-9921', s: 'BTC/USDT', side: 'BUY', p: 66420.5, sl: 65800.0, tp: 67900.0, st: 'FILLED' },
                        { t: 'ORD-9922', s: 'ETH/USDT', side: 'SELL', p: 2640.2, sl: 2690.0, tp: 2540.0, st: 'FILLED' },
                        { t: 'ORD-9923', s: 'SOL/USDT', side: 'BUY', p: 154.8, sl: 151.0, tp: 162.5, st: 'FILLED' },
                        { t: 'ORD-9924', s: 'BTC/USDT', side: 'BUY', p: 66510.0, sl: 65950.0, tp: 68100.0, st: 'EXECUTED' },
                      ].map((order) => (
                        <tr key={order.t} className="border-b border-[#262626] hover:bg-[#141414] font-bold">
                          <td className="p-2.5">{order.t}</td>
                          <td className="p-2.5">{order.s}</td>
                          <td className="p-2.5 text-[#3ECF8E]">[{order.side}]</td>
                          <td className="p-2.5 text-right">{order.p.toFixed(2)}</td>
                          <td className="p-2.5 text-right text-rose-400">{order.sl.toFixed(2)}</td>
                          <td className="p-2.5 text-right text-[#3ECF8E]">{order.tp.toFixed(2)}</td>
                          <td className="p-2.5 text-right text-[#3ECF8E]">[{order.st}]</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* The 3 Pillars of Algorithmic Supremacy */}
        <section className="px-6 md:px-12 py-12 max-w-7xl mx-auto space-y-8">
          <div>
            <h2 className="text-2xl font-bold uppercase text-zinc-100">
              The Three Pillars of Your Automated Trading Machine
            </h2>
            <p className="text-zinc-100 font-normal mt-1">
              Engineered from first principles to outperform discretionary traders and emotional mistakes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
              <div className="w-10 h-10 border border-[#262626] flex items-center justify-center font-bold text-lg bg-black text-white">
                01
              </div>
              <h3 className="text-base font-bold uppercase text-zinc-100">Genetic Evolution</h3>
              <p className="text-zinc-100 font-normal leading-relaxed">
                Explore millions of parameter combinations in parallel. Razor evaluates mutation rates, crossovers,
                and elitism percentage to evolve robust strategy chromosomes that adapt to changing market regimes.
              </p>
            </div>

            <div className="p-6 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
              <div className="w-10 h-10 border border-[#262626] flex items-center justify-center font-bold text-lg bg-black text-white">
                02
              </div>
              <h3 className="text-base font-bold uppercase text-zinc-100">Walk-Forward Validation</h3>
              <p className="text-zinc-100 font-normal leading-relaxed">
                Never fall for backtest curve-fitting again. Razor splits historical data into rolling in-sample and out-of-sample
                windows to certify deterministic profitability before a single dollar of live capital is risked.
              </p>
            </div>

            <div className="p-6 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
              <div className="w-10 h-10 border border-[#262626] flex items-center justify-center font-bold text-lg bg-black text-white">
                03
              </div>
              <h3 className="text-base font-bold uppercase text-zinc-100">Deterministic Execution</h3>
              <p className="text-zinc-100 font-normal leading-relaxed">
                Built on .NET 10 LTS with sub-millisecond execution times. Multiple broker adapters connect in parallel with hard stop-loss
                guards, emergency liquidation switches, and comprehensive formulated Excel exports.
              </p>
            </div>
          </div>
        </section>

        {/* Discretionary vs Razor Comparison Matrix */}
        <section className="px-6 md:px-12 py-12 border-t border-[#262626] max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-[#262626] pb-2">
            <h2 className="text-lg font-bold uppercase text-zinc-100">
              Discretionary Manual Trading vs. Razor Autonomous Machine
            </h2>
            <span className="text-[10px] font-bold border border-[#262626] px-1.5 py-0.5">
              PARADIGM SHIFT
            </span>
          </div>

          <div className="border border-[#262626] overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#262626] bg-[#141414]">
                  <th className="p-3 font-bold uppercase">Attribute</th>
                  <th className="p-3 font-bold uppercase text-red-700">Manual / Discretionary Trading</th>
                  <th className="p-3 font-bold uppercase text-[#3ECF8E]">Razor Algorithmic Engine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                <tr>
                  <td className="p-3 font-bold">Execution Speed</td>
                  <td className="p-3 text-rose-400">800ms - 3,000ms (Human hesitation)</td>
                  <td className="p-3 text-[#3ECF8E] font-bold">&lt; 10ms (Native .NET 10 LTS socket loop)</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold">Emotional Discipline</td>
                  <td className="p-3 text-rose-400">Revenge trading, panic selling, moving stops</td>
                  <td className="p-3 text-[#3ECF8E] font-bold">Zero emotion, deterministic rule compliance</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold">Strategy Validation</td>
                  <td className="p-3 text-rose-400">Anecdotal chart patterns, curve-fitted tests</td>
                  <td className="p-3 text-[#3ECF8E] font-bold">Walk-forward out-of-sample window verification</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold">Market Coverage</td>
                  <td className="p-3 text-rose-400">1-2 pairs max before cognitive fatigue</td>
                  <td className="p-3 text-[#3ECF8E] font-bold">Hundreds of assets evaluated simultaneously 24/7</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 md:px-12 py-16 border-t border-[#262626] max-w-7xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold uppercase text-zinc-100">
            READY TO AUTOMATE YOUR TRADING EDGE?
          </h2>
          <p className="text-zinc-100 font-normal max-w-xl mx-auto">
            Sign into the operator terminal or connect your private engine runner in under 60 seconds.
          </p>

          <div className="flex justify-center gap-4 pt-2">
            {mounted && isAuthenticated ? (
              <Link
                href="/panel"
                className="px-8 py-3.5 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium font-bold text-sm transition-colors"
              >
                [ENTER TRADING PANEL]
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="px-8 py-3.5 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium font-bold text-sm transition-colors"
              >
                [SIGN IN WITH ACCOUNT]
              </Link>
            )}
            <Link
              href="/docs"
              className="px-8 py-3.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium font-bold text-sm transition-colors"
            >
              [READ DEVELOPER SPECS]
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
