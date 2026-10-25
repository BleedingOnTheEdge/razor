'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TraderLandingPage() {
  const [activeTab, setActiveTab] = useState<'evolution' | 'equity' | 'live'>('equity');
  const [simulationStep, setSimulationStep] = useState(0);

  // Live simulation tick timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSimulationStep((s) => (s + 1) % 60);
    }, 800);
    return () => clearInterval(timer);
  }, []);

  // Generate dynamic equity curve points based on simulation step
  const equityPoints = [
    10000, 10250, 10180, 10600, 10520, 10980, 11400, 11250, 11800, 12350,
    12100, 12700, 13400, 13200, 13950, 14600, 14450, 15200, 15900, 16800,
    16600, 17400, 18250, 18900, 19800, 20600, 21500, 22400, 23800, 25200,
  ];

  const currentEquity = equityPoints[simulationStep % equityPoints.length] + (simulationStep * 35);
  const totalGainPct = ((currentEquity - 10000) / 10000) * 100;

  return (
    <div className="min-h-screen bg-white text-black font-mono text-xs selection:bg-black selection:text-white">
      {/* Top Banner Navigation */}
      <nav className="h-16 px-6 md:px-12 border-b border-black flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-base">
            R
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight block">RAZOR PLATFORM</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-black">
              Quantitative Algorithmic Engine
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 font-bold">
          <Link
            href="/auth/login"
            className="px-3 py-1.5 border border-black bg-white hover:bg-black hover:text-white transition-colors"
          >
            [SIGN IN]
          </Link>
          <Link
            href="/panel"
            className="px-4 py-1.5 border border-black bg-black text-white hover:bg-white hover:text-black transition-colors"
          >
            [ENTER TERMINAL]
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="px-6 md:px-12 py-16 md:py-24 border-b border-black max-w-7xl mx-auto space-y-6">
        <div className="inline-block px-3 py-1 border border-black bg-white font-bold text-black uppercase">
          AUTOMATED QUANTITATIVE STRATEGY FACTORY
        </div>

        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-black leading-none">
          BUILD YOUR ALGORITHMIC <br />
          <span className="text-green-600">MONEY PRINTING MACHINE</span>.
        </h1>

        <p className="text-sm md:text-base text-black max-w-3xl leading-relaxed font-normal">
          Stop staring at charts and trading with fear and greed. Deploy autonomous algorithmic strategies evolved
          by genetic algorithms, stress-tested with rolling walk-forward simulations, and executed directly on your
          brokers with sub-millisecond precision.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-4">
          <Link
            href="/panel"
            className="px-6 py-3 border border-black bg-black text-white hover:bg-white hover:text-black font-bold text-sm transition-colors"
          >
            [LAUNCH YOUR ENGINE NOW]
          </Link>

          <Link
            href="/auth/login"
            className="px-6 py-3 border border-black bg-white hover:bg-black hover:text-white font-bold text-sm transition-colors"
          >
            [TRY INSTANT DEMO SESSION]
          </Link>
        </div>
      </header>

      {/* Interactive Visualization Studio */}
      <section className="px-6 md:px-12 py-12 border-b border-black max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-black">
          <div>
            <h2 className="text-lg font-bold uppercase text-black">
              Live Algorithmic Execution Simulator
            </h2>
            <p className="text-black font-normal mt-0.5">
              Watch real-time strategy DNA synthesis, portfolio compounding, and sub-millisecond order fills.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('equity')}
              className={`px-3 py-1.5 border border-black font-bold transition-colors ${
                activeTab === 'equity' ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'
              }`}
            >
              [EQUITY CURVE]
            </button>
            <button
              onClick={() => setActiveTab('evolution')}
              className={`px-3 py-1.5 border border-black font-bold transition-colors ${
                activeTab === 'evolution' ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'
              }`}
            >
              [GENETIC CONVERGENCE]
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`px-3 py-1.5 border border-black font-bold transition-colors ${
                activeTab === 'live' ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'
              }`}
            >
              [LIVE ORDER STREAM]
            </button>
          </div>
        </div>

        {/* Dynamic Display Canvas */}
        <div className="p-6 border border-black bg-white space-y-6">
          {/* Quick Telemetry Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border border-black bg-zinc-50">
            <div>
              <span className="font-bold text-black uppercase block">Simulated Portfolio</span>
              <span className="text-2xl font-bold text-green-600 mt-1 block">
                ${currentEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="font-bold text-black uppercase block">Total Compounded ROI</span>
              <span className="text-2xl font-bold text-green-600 mt-1 block">
                +{totalGainPct.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="font-bold text-black uppercase block">Sharpe Ratio</span>
              <span className="text-2xl font-bold text-black mt-1 block">
                2.94
              </span>
            </div>
            <div>
              <span className="font-bold text-black uppercase block">Max Drawdown Guard</span>
              <span className="text-2xl font-bold text-red-600 mt-1 block">
                -3.8%
              </span>
            </div>
          </div>

          {/* Tab 1: Equity Curve SVG */}
          {activeTab === 'equity' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>SIMULATED OUT-OF-SAMPLE EQUITY PROGRESSION</span>
                <span className="text-green-600">[30 ROLLING WINDOWS • ZERO CURVE FITTING]</span>
              </div>
              <div className="h-64 border border-black bg-white p-4 flex items-end">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="50" x2="600" y2="50" stroke="#000000" strokeWidth="0.5" strokeDasharray="4 4" />
                  <line x1="0" y1="100" x2="600" y2="100" stroke="#000000" strokeWidth="0.5" strokeDasharray="4 4" />
                  <line x1="0" y1="150" x2="600" y2="150" stroke="#000000" strokeWidth="0.5" strokeDasharray="4 4" />

                  {/* Polyline */}
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
                <span className="text-black">[FITNESS CLIMB: +312% • GENOME DIVERSITY: 0.84]</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { gen: 1, best: 0.94, avg: 0.42, div: 0.95, genes: [0.12, 0.45, 12, 30] },
                  { gen: 15, best: 2.15, avg: 1.62, div: 0.74, genes: [0.03, 0.08, 14, 21] },
                  { gen: 30, best: 3.92, avg: 3.41, div: 0.52, genes: [0.015, 0.045, 14, 26] },
                ].map((g) => (
                  <div key={g.gen} className="p-4 border border-black bg-white space-y-2">
                    <div className="flex items-center justify-between font-bold border-b border-black pb-1">
                      <span>GENERATION #{g.gen}</span>
                      <span className="text-green-600">Fitness: {g.best}</span>
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

          {/* Tab 3: Live Order Stream */}
          {activeTab === 'live' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>HIGH-FREQUENCY ORDER EXECUTION TELEMETRY</span>
                <span className="text-green-600">[LATENCY: 11ms • ZERO SLIPPAGE]</span>
              </div>
              <div className="border border-black overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-black bg-white">
                      <th className="p-2.5 font-bold text-black">Ticket</th>
                      <th className="p-2.5 font-bold text-black">Symbol</th>
                      <th className="p-2.5 font-bold text-black">Direction</th>
                      <th className="p-2.5 font-bold text-black text-right">Fill Price</th>
                      <th className="p-2.5 font-bold text-black text-right">Hard SL</th>
                      <th className="p-2.5 font-bold text-black text-right">Target TP</th>
                      <th className="p-2.5 font-bold text-black text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { t: 'ORD-9921', s: 'BTC/USDT', side: 'BUY', p: 66420.5, sl: 65800.0, tp: 67900.0, st: 'FILLED' },
                      { t: 'ORD-9922', s: 'ETH/USDT', side: 'SELL', p: 2640.2, sl: 2690.0, tp: 2540.0, st: 'FILLED' },
                      { t: 'ORD-9923', s: 'SOL/USDT', side: 'BUY', p: 154.8, sl: 151.0, tp: 162.5, st: 'FILLED' },
                      { t: 'ORD-9924', s: 'BTC/USDT', side: 'BUY', p: 66510.0, sl: 65950.0, tp: 68100.0, st: 'EXECUTED' },
                    ].map((order) => (
                      <tr key={order.t} className="border-b border-black hover:bg-zinc-50 font-bold">
                        <td className="p-2.5">{order.t}</td>
                        <td className="p-2.5">{order.s}</td>
                        <td className="p-2.5 text-green-600">[{order.side}]</td>
                        <td className="p-2.5 text-right">{order.p.toFixed(2)}</td>
                        <td className="p-2.5 text-right text-red-600">{order.sl.toFixed(2)}</td>
                        <td className="p-2.5 text-right text-green-600">{order.tp.toFixed(2)}</td>
                        <td className="p-2.5 text-right text-green-600">[{order.st}]</td>
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
      <section className="px-6 md:px-12 py-16 border-b border-black max-w-7xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-bold uppercase text-black">
            The Three Pillars of Your Automated Trading Machine
          </h2>
          <p className="text-black font-normal mt-1">
            Engineered from first principles to outperform discretionary traders and emotional mistakes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 border border-black bg-white space-y-4">
            <div className="w-10 h-10 border border-black flex items-center justify-center font-bold text-lg bg-black text-white">
              01
            </div>
            <h3 className="text-base font-bold uppercase text-black">Genetic Evolution</h3>
            <p className="text-black font-normal leading-relaxed">
              Explore millions of parameter combinations in parallel. Razor evaluates mutation rates, crossovers,
              and elitism percentage to evolve robust strategy chromosomes that adapt to changing market regimes.
            </p>
          </div>

          <div className="p-6 border border-black bg-white space-y-4">
            <div className="w-10 h-10 border border-black flex items-center justify-center font-bold text-lg bg-black text-white">
              02
            </div>
            <h3 className="text-base font-bold uppercase text-black">Walk-Forward Validation</h3>
            <p className="text-black font-normal leading-relaxed">
              Never fall for backtest curve-fitting again. Razor splits historical data into rolling in-sample and out-of-sample
              windows to certify deterministic profitability before a single dollar of live capital is risked.
            </p>
          </div>

          <div className="p-6 border border-black bg-white space-y-4">
            <div className="w-10 h-10 border border-black flex items-center justify-center font-bold text-lg bg-black text-white">
              03
            </div>
            <h3 className="text-base font-bold uppercase text-black">Deterministic Execution</h3>
            <p className="text-black font-normal leading-relaxed">
              Built on .NET 10 LTS with sub-millisecond execution times. Multiple broker adapters connect in parallel with hard stop-loss
              guards, emergency liquidation switches, and comprehensive formulated Excel exports.
            </p>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <footer className="px-6 md:px-12 py-16 max-w-7xl mx-auto text-center space-y-6">
        <h2 className="text-3xl font-bold uppercase text-black">
          READY TO AUTOMATE YOUR TRADING EDGE?
        </h2>
        <p className="text-black font-normal max-w-xl mx-auto">
          Sign into the operator terminal or connect your private engine runner in under 60 seconds.
        </p>

        <div className="flex justify-center gap-4 pt-2">
          <Link
            href="/panel"
            className="px-8 py-3.5 border border-black bg-black text-white hover:bg-white hover:text-black font-bold text-sm transition-colors"
          >
            [ENTER TRADING PANEL]
          </Link>
          <Link
            href="/auth/login"
            className="px-8 py-3.5 border border-black bg-white hover:bg-black hover:text-white font-bold text-sm transition-colors"
          >
            [SIGN IN WITH ACCOUNT]
          </Link>
        </div>

        <div className="pt-8 border-t border-black text-[11px] text-black">
          RAZOR PLATFORM • INSTITUTIONAL HIGH-FREQUENCY QUANTITATIVE RUNNER • ALL RIGHTS RESERVED
        </div>
      </footer>
    </div>
  );
}
