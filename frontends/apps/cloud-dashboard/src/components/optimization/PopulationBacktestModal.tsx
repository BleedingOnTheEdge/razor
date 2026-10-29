'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  runId?: string;
}

export function PopulationBacktestModal({
  isOpen,
  onClose,
  individual,
  generationNumber,
  onSelectTrade,
  onRunAsBacktest,
  runId,
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
  const padLeft = 55;
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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans text-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#171717] border border-[#262626] rounded-2xl shadow-xl max-w-4xl w-full p-6 space-y-5 max-h-[92vh] overflow-y-auto text-zinc-100 animate-in fade-in-0 zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#262626]">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                <Dna className="w-5 h-5 text-[#3ECF8E]" />
                <span>Individual #{individual.individualIndex} (Gen {generationNumber}) Backtest</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 text-[#3ECF8E] border border-emerald-200">
                Fitness: {individual.fitness.toFixed(4)}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#1f1f1f] text-zinc-300">
                Diversity: {individual.diversity.toFixed(3)}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Autonomous backtest simulation report evaluated during genetic algorithm convergence.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onRunAsBacktest && (
              <button
                type="button"
                onClick={() => onRunAsBacktest(individual)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Run This DNA</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-500 hover:text-zinc-400 hover:bg-[#1f1f1f] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Backtest Executive Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="p-3.5 bg-[#141414] border border-[#262626] rounded-xl">
            <span className="text-zinc-400 text-xs block font-medium uppercase tracking-wider">Total Return</span>
            <span className={`text-lg font-bold mt-1 block font-mono ${individual.totalReturn >= 0 ? 'text-[#3ECF8E]' : 'text-rose-400'}`}>
              {individual.totalReturn >= 0 ? `+${individual.totalReturn.toFixed(2)}%` : `${individual.totalReturn.toFixed(2)}%`}
            </span>
          </div>
          <div className="p-3.5 bg-[#141414] border border-[#262626] rounded-xl">
            <span className="text-zinc-400 text-xs block font-medium uppercase tracking-wider">Sharpe Ratio</span>
            <span className="text-lg font-bold mt-1 block font-mono text-zinc-100">
              {individual.sharpeRatio.toFixed(2)}
            </span>
          </div>
          <div className="p-3.5 bg-[#141414] border border-[#262626] rounded-xl">
            <span className="text-zinc-400 text-xs block font-medium uppercase tracking-wider">Max Drawdown</span>
            <span className="text-lg font-bold mt-1 block font-mono text-rose-400">
              -{individual.maxDrawdown.toFixed(2)}%
            </span>
          </div>
          <div className="p-3.5 bg-[#141414] border border-[#262626] rounded-xl">
            <span className="text-zinc-400 text-xs block font-medium uppercase tracking-wider">Win Rate</span>
            <span className="text-lg font-bold mt-1 block font-mono text-zinc-100">
              {individual.winRate.toFixed(1)}%
            </span>
          </div>
          <div className="p-3.5 bg-[#141414] border border-[#262626] rounded-xl">
            <span className="text-zinc-400 text-xs block font-medium uppercase tracking-wider">Profit Factor</span>
            <span className="text-lg font-bold mt-1 block font-mono text-[#3ECF8E]">
              {individual.profitFactor.toFixed(2)}
            </span>
          </div>
          <div className="p-3.5 bg-[#141414] border border-[#262626] rounded-xl">
            <span className="text-zinc-400 text-xs block font-medium uppercase tracking-wider">Total Fills</span>
            <span className="text-lg font-bold mt-1 block font-mono text-zinc-100">
              {individual.tradeCount} Trades
            </span>
          </div>
        </div>

        {/* Strategy Parameters & Chromosome Genes */}
        <div className="p-4 bg-[#171717] border border-[#262626] rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            <span>Decoded Gene Parameters</span>
            <span className="text-zinc-400 font-mono">
              {individual.genes.length} Chromosome Alleles
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs font-mono">
            {Object.entries(individual.parameters || {}).map(([key, val]) => (
              <div key={key} className="p-2.5 bg-[#141414] border border-[#262626] rounded-lg">
                <span className="text-zinc-400 block truncate font-medium text-[11px] uppercase">{key}</span>
                <span className="text-sm font-bold text-zinc-100 mt-0.5 block">
                  {typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(3)) : String(val)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#262626]">
            <span className="text-xs text-zinc-400 uppercase font-semibold mr-1">Raw Genes:</span>
            {individual.genes.map((g, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded bg-[#1f1f1f] border border-[#262626] font-mono text-xs text-zinc-200">
                g{idx}: <strong>{typeof g === 'number' ? g.toFixed(3) : String(g)}</strong>
              </span>
            ))}
          </div>
        </div>

        {/* Realized Equity & Balance Curve */}
        {equityPoints.length > 0 && (
          <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300 uppercase tracking-wider">
                Realized Equity & Balance Curve
              </span>
              {hoveredPoint ? (
                <div className="flex items-center gap-3 text-xs font-mono bg-[#141414] text-white px-2.5 py-1 rounded-md">
                  <span className="text-zinc-500">{hoveredPoint.timestamp}</span>
                  <span className="font-bold text-emerald-400">Eq: {formatCurrency(hoveredPoint.equity)}</span>
                  <span className="text-rose-400 font-bold">DD: -{hoveredPoint.drawdownPct.toFixed(2)}%</span>
                </div>
              ) : (
                <span className="text-xs text-zinc-500">Hover over curve to inspect</span>
              )}
            </div>

            <div className="relative w-full overflow-hidden rounded-lg bg-[#171717] border border-[#262626] p-2">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto select-none"
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {[0, 0.5, 1.0].map((ratio) => {
                  const y = padTop + chartH * ratio;
                  const val = maxEq - ratio * (maxEq - minEq);
                  return (
                    <g key={ratio}>
                      <line x1={padLeft} y1={y} x2={padLeft + chartW} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                      <text x={padLeft - 8} y={y + 3} textAnchor="end" className="text-[10px] font-mono fill-slate-500">
                        ${(val / 1000).toFixed(1)}k
                      </text>
                    </g>
                  );
                })}

                {pathD && <path d={pathD} fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />}

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
                      <line x1={pt.x} y1={padTop} x2={pt.x} y2={padTop + chartH} stroke="#2563eb" strokeWidth="1.5" strokeDasharray="3 3" />
                      <circle cx={pt.x} cy={pt.y} r="4" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>
        )}

        {/* Trade History Table */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Simulated Trade Fills ({filteredTrades.length}) - Click any trade for telemetry
            </h4>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tradeSearch}
                onChange={(e) => {
                  setTradeSearch(e.target.value);
                  setTradePage(1);
                }}
                placeholder="Search fills..."
                className="pl-8 pr-3 py-1.5 bg-[#171717] border border-[#262626] rounded-lg text-xs text-zinc-200 placeholder-slate-400 focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 focus:border-[#3ECF8E]"
              />
            </div>
          </div>

          <div className="border border-[#262626] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-[#262626] bg-[#141414] text-zinc-400 uppercase font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Ticket</th>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Side</th>
                  <th className="py-2.5 px-3">Volume</th>
                  <th className="py-2.5 px-3">Entry Px</th>
                  <th className="py-2.5 px-3">Exit Px</th>
                  <th className="py-2.5 px-3">Profit ($)</th>
                  <th className="py-2.5 px-3">Exit Trigger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-[#171717]">
                {currentTrades.map((t) => (
                  <tr
                    key={t.ticket}
                    onClick={() => onSelectTrade(t)}
                    className="hover:bg-[#141414]/80 cursor-pointer transition-colors group"
                    title="Click to view granular trade telemetry"
                  >
                    <td className="py-2.5 px-3 text-[#3ECF8E] font-bold group-hover:underline">#{t.ticket}</td>
                    <td className="py-2.5 px-3 font-semibold text-zinc-100 font-sans">{t.symbol}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          t.side.toUpperCase() === 'BUY'
                            ? 'bg-emerald-50 text-[#3ECF8E] border border-emerald-200'
                            : 'bg-rose-50 text-rose-400 border border-rose-200'
                        }`}
                      >
                        {t.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-zinc-200">{t.volume}</td>
                    <td className="py-2.5 px-3 text-zinc-300">${typeof t.openPrice === 'number' ? t.openPrice.toFixed(2) : t.openPrice}</td>
                    <td className="py-2.5 px-3 text-zinc-300">${typeof t.closePrice === 'number' ? t.closePrice.toFixed(2) : t.closePrice}</td>
                    <td className={`py-2.5 px-3 font-bold ${(t.profit ?? 0) >= 0 ? 'text-[#3ECF8E]' : 'text-rose-400'}`}>
                      {t.profit != null ? (t.profit >= 0 ? `+${formatCurrency(t.profit)}` : formatCurrency(t.profit)) : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium border border-[#262626] bg-[#141414] text-zinc-300">
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
            <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
              <span>Page {tradePage} of {totalPages}</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={tradePage === 1}
                  onClick={() => setTradePage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 border border-[#262626] rounded-md bg-[#171717] hover:bg-[#141414] text-zinc-300 font-medium disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={tradePage >= totalPages}
                  onClick={() => setTradePage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 border border-[#262626] rounded-md bg-[#171717] hover:bg-[#141414] text-zinc-300 font-medium disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#262626]">
          {runId && individual?.id ? (
            <Link
              href={'/panel/reports/' + runId + '/generations/' + generationNumber + '/populations/' + individual.id}
              className="px-3.5 py-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors inline-flex items-center gap-1.5 text-xs font-mono"
            >
              <span>OPEN FULL CANDIDATE PAGE →</span>
            </Link>
          ) : <div />}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#262626] rounded-lg bg-[#171717] hover:bg-[#141414] text-zinc-300 font-medium text-sm transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
