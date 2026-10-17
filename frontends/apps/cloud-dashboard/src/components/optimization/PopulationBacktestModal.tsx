'use client';

import React, { useState } from 'react';
import { X, Dna, TrendingUp, BarChart3, Layers, Sliders, ChevronLeft, ChevronRight, Search, Activity, Play } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@razor/ui-kit';
import type { PopulationIndividualPayload, TradeItemPayload, EquityPointPayload } from '@/lib/api-client';

export interface PopulationBacktestModalProps {
  isOpen: boolean;
  onClose: () => void;
  individual: PopulationIndividualPayload | null;
  generationNumber: number;
  onSelectTrade: (trade: TradeItemPayload) => void;
  onRunAsBacktest?: (individual: PopulationIndividualPayload) => void;
}

export function PopulationBacktestModal({
  isOpen,
  onClose,
  individual,
  generationNumber,
  onSelectTrade,
  onRunAsBacktest,
}: PopulationBacktestModalProps) {
  const [tradeSearch, setTradeSearch] = useState('');
  const [tradePage, setTradePage] = useState(1);
  const [hoveredPoint, setHoveredPoint] = useState<EquityPointPayload | null>(null);
  const tradesPerPage = 8;

  if (!isOpen || !individual) return null;

  const allTrades = individual.trades || [];
  const filteredTrades = allTrades.filter((t) => {
    if (!tradeSearch.trim()) return true;
    const q = tradeSearch.toLowerCase();
    return (
      t.ticket.toString().includes(q) ||
      t.symbol.toLowerCase().includes(q) ||
      t.side.toLowerCase().includes(q) ||
      (t.exitReason || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredTrades.length / tradesPerPage));
  const currentTrades = filteredTrades.slice((tradePage - 1) * tradesPerPage, tradePage * tradesPerPage);

  const equityPoints = individual.equityCurve || [];
  const minEq = equityPoints.length > 0 ? Math.min(...equityPoints.map((p) => p.equity)) : 95000;
  const maxEq = equityPoints.length > 0 ? Math.max(...equityPoints.map((p) => p.equity)) : 105000;
  const svgWidth = 700;
  const svgHeight = 180;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 25;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;
  const eqRange = Math.max(1, maxEq - minEq);

  const pointsMapped = equityPoints.map((p, idx) => {
    const x = padLeft + (idx / Math.max(1, equityPoints.length - 1)) * chartW;
    const y = padTop + chartH - ((p.equity - minEq) / eqRange) * chartH;
    return { ...p, x, y };
  });

  const pathD = pointsMapped.length > 0 ? `M ${pointsMapped.map((p) => `${p.x},${p.y}`).join(' L ')}` : '';
  const areaD = pointsMapped.length > 0 ? `${pathD} L ${pointsMapped[pointsMapped.length - 1].x},${padTop + chartH} L ${pointsMapped[0].x},${padTop + chartH} Z` : '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border border-zinc-200 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto text-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-100">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <Dna className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-zinc-900">
                    Individual #{individual.individualIndex} (Gen {generationNumber})
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    Fitness: {individual.fitness.toFixed(4)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-zinc-100 text-zinc-600 border border-zinc-200">
                    Diversity: {individual.diversity.toFixed(3)}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 font-mono">
                  Autonomous backtest simulation report evaluated during genetic algorithm convergence.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRunAsBacktest && (
              <button
                type="button"
                onClick={() => onRunAsBacktest(individual)}
                className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run This DNA</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Backtest Executive Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
            <span className="text-[11px] text-zinc-500 block">Total Return</span>
            <span className={`text-base font-bold mt-1 block ${individual.totalReturn >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {individual.totalReturn >= 0 ? `+${individual.totalReturn.toFixed(2)}%` : `${individual.totalReturn.toFixed(2)}%`}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
            <span className="text-[11px] text-zinc-500 block">Sharpe Ratio</span>
            <span className="text-base font-bold mt-1 block text-zinc-900">
              {individual.sharpeRatio.toFixed(2)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
            <span className="text-[11px] text-zinc-500 block">Max Drawdown</span>
            <span className="text-base font-bold mt-1 block text-rose-700">
              -{individual.maxDrawdown.toFixed(2)}%
            </span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
            <span className="text-[11px] text-zinc-500 block">Win Rate</span>
            <span className="text-base font-bold mt-1 block text-zinc-900">
              {individual.winRate.toFixed(1)}%
            </span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
            <span className="text-[11px] text-zinc-500 block">Profit Factor</span>
            <span className="text-base font-bold mt-1 block text-emerald-700">
              {individual.profitFactor.toFixed(2)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
            <span className="text-[11px] text-zinc-500 block">Total Fills</span>
            <span className="text-base font-bold mt-1 block text-zinc-900">
              {individual.tradeCount} Trades
            </span>
          </div>
        </div>

        {/* Strategy Parameters & Chromosome Genes */}
        <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-purple-900 font-bold">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-purple-700" />
              <span>Decoded Gene Parameters</span>
            </span>
            <span className="text-[11px] text-purple-700 font-normal">
              {individual.genes.length} Chromosome Alleles
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
            {Object.entries(individual.parameters || {}).map(([key, val]) => (
              <div key={key} className="p-2 rounded-lg bg-white border border-purple-200/70">
                <span className="text-[10px] text-zinc-500 block truncate">{key}</span>
                <span className="text-xs font-bold text-zinc-900 mt-0.5 block">
                  {typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(3)) : String(val)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase font-semibold mr-1">Raw Genes:</span>
            {individual.genes.map((g, idx) => (
              <span key={idx} className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-300/80 font-mono text-[10px] text-zinc-700">
                g{idx}: <strong className="text-purple-900">{typeof g === 'number' ? g.toFixed(3) : String(g)}</strong>
              </span>
            ))}
          </div>
        </div>

        {/* Interactive SVG Equity Curve */}
        {equityPoints.length > 0 && (
          <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-zinc-800 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-cyan-600" />
                <span>Realized Equity & Balance Curve</span>
              </span>
              {hoveredPoint ? (
                <div className="flex items-center gap-2 text-[11px] font-mono bg-zinc-900 text-white px-2.5 py-1 rounded-lg">
                  <span className="text-zinc-400">{hoveredPoint.timestamp}</span>
                  <span className="font-bold text-cyan-400">Eq: {formatCurrency(hoveredPoint.equity)}</span>
                  <span className="text-rose-400">DD: -{hoveredPoint.drawdownPct.toFixed(2)}%</span>
                </div>
              ) : (
                <span className="text-[11px] text-zinc-400">Hover point to inspect equity</span>
              )}
            </div>

            <div className="relative w-full overflow-hidden">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto select-none"
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <defs>
                  <linearGradient id="popEqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {[0, 0.5, 1.0].map((ratio) => {
                  const y = padTop + chartH * ratio;
                  const val = maxEq - ratio * (maxEq - minEq);
                  return (
                    <g key={ratio}>
                      <line x1={padLeft} y1={y} x2={padLeft + chartW} y2={y} stroke="#f4f4f5" strokeWidth="1" />
                      <text x={padLeft - 6} y={y + 3} textAnchor="end" className="text-[9px] font-mono fill-zinc-400">
                        ${(val / 1000).toFixed(1)}k
                      </text>
                    </g>
                  );
                })}

                {areaD && <path d={areaD} fill="url(#popEqGrad)" />}
                {pathD && <path d={pathD} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" />}

                {pointsMapped.map((pt, idx) => (
                  <rect
                    key={idx}
                    x={pt.x - chartW / pointsMapped.length / 2}
                    y={padTop}
                    width={chartW / pointsMapped.length}
                    height={chartH}
                    fill="transparent"
                    className="cursor-crosshair"
                    onMouseEnter={() => setHoveredPoint(pt)}
                  />
                ))}

                {hoveredPoint && (() => {
                  const pt = pointsMapped.find((p) => p.timestamp === hoveredPoint.timestamp);
                  if (!pt) return null;
                  return (
                    <g>
                      <line x1={pt.x} y1={padTop} x2={pt.x} y2={padTop + chartH} stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="3 3" />
                      <circle cx={pt.x} cy={pt.y} r="4" fill="#8b5cf6" stroke="#ffffff" strokeWidth="2" />
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>
        )}

        {/* Trade History Table - Every Trade Clickable! */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-zinc-500" />
              <span>Simulated Trade Fills ({filteredTrades.length})</span>
              <span className="text-[11px] font-normal text-cyan-700 normal-case ml-2">
                (Click any trade to open granular fill telemetry)
              </span>
            </h4>

            <div className="relative min-w-[200px]">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={tradeSearch}
                onChange={(e) => {
                  setTradeSearch(e.target.value);
                  setTradePage(1);
                }}
                placeholder="Search fills..."
                className="w-full pl-7 pr-3 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs font-mono divide-y divide-zinc-200">
              <thead className="bg-zinc-50 text-zinc-500 text-[10px] uppercase">
                <tr>
                  <th className="py-2 px-3">Ticket</th>
                  <th className="py-2 px-3">Symbol</th>
                  <th className="py-2 px-3">Side</th>
                  <th className="py-2 px-3">Volume</th>
                  <th className="py-2 px-3">Entry Px</th>
                  <th className="py-2 px-3">Exit Px</th>
                  <th className="py-2 px-3">Profit ($)</th>
                  <th className="py-2 px-3">Exit Trigger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {currentTrades.map((t) => (
                  <tr
                    key={t.ticket}
                    onClick={() => onSelectTrade(t)}
                    className="hover:bg-cyan-50/70 cursor-pointer transition-colors group"
                    title="Click to view granular trade telemetry"
                  >
                    <td className="py-2 px-3 text-cyan-700 group-hover:underline font-bold">#{t.ticket}</td>
                    <td className="py-2 px-3 font-semibold text-zinc-800">{t.symbol}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          t.side.toUpperCase() === 'BUY'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {t.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-3">{t.volume}</td>
                    <td className="py-2 px-3">${typeof t.openPrice === 'number' ? t.openPrice.toFixed(2) : t.openPrice}</td>
                    <td className="py-2 px-3">${typeof t.closePrice === 'number' ? t.closePrice.toFixed(2) : t.closePrice}</td>
                    <td className={`py-2 px-3 font-bold ${(t.profit ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {t.profit != null ? (t.profit >= 0 ? `+${formatCurrency(t.profit)}` : formatCurrency(t.profit)) : '—'}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px]">
                        {t.exitReason}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs font-mono text-zinc-500 pt-1">
              <span>Page {tradePage} of {totalPages}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={tradePage === 1}
                  onClick={() => setTradePage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded border border-zinc-200 hover:bg-zinc-50 disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={tradePage >= totalPages}
                  onClick={() => setTradePage((p) => Math.min(totalPages, p + 1))}
                  className="p-1 rounded border border-zinc-200 hover:bg-zinc-50 disabled:opacity-30"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs font-mono transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
