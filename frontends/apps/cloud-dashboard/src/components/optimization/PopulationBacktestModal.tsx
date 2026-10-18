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
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 font-mono text-xs"
      onClick={onClose}
    >
      <div
        className="bg-white border border-black max-w-4xl w-full p-6 space-y-5 max-h-[92vh] overflow-y-auto text-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-black">
          <div>
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-black uppercase">
                    Individual #{individual.individualIndex} (Gen {generationNumber})
                  </h3>
                  <span className="px-2 py-0.5 border border-black text-xs font-mono font-bold bg-black text-white">
                    Fitness: {individual.fitness.toFixed(4)}
                  </span>
                  <span className="px-2 py-0.5 border border-black text-xs font-mono bg-white text-black font-bold">
                    Diversity: {individual.diversity.toFixed(3)}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 mt-1">
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
                className="px-3 py-1.5 border border-black bg-black hover:bg-white hover:text-black text-white text-xs font-mono font-bold transition-colors"
              >
                [RUN THIS DNA]
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white font-bold transition-colors"
            >
              [CLOSE]
            </button>
          </div>
        </div>

        {/* Backtest Executive Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs font-mono">
          <div className="p-3 bg-white border border-black">
            <span className="text-[11px] text-zinc-600 block font-bold">Total Return</span>
            <span className={`text-base font-bold mt-1 block ${individual.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {individual.totalReturn >= 0 ? `+${individual.totalReturn.toFixed(2)}%` : `${individual.totalReturn.toFixed(2)}%`}
            </span>
          </div>
          <div className="p-3 bg-white border border-black">
            <span className="text-[11px] text-zinc-600 block font-bold">Sharpe Ratio</span>
            <span className="text-base font-bold mt-1 block text-black">
              {individual.sharpeRatio.toFixed(2)}
            </span>
          </div>
          <div className="p-3 bg-white border border-black">
            <span className="text-[11px] text-zinc-600 block font-bold">Max Drawdown</span>
            <span className="text-base font-bold mt-1 block text-red-600">
              -{individual.maxDrawdown.toFixed(2)}%
            </span>
          </div>
          <div className="p-3 bg-white border border-black">
            <span className="text-[11px] text-zinc-600 block font-bold">Win Rate</span>
            <span className="text-base font-bold mt-1 block text-black">
              {individual.winRate.toFixed(1)}%
            </span>
          </div>
          <div className="p-3 bg-white border border-black">
            <span className="text-[11px] text-zinc-600 block font-bold">Profit Factor</span>
            <span className="text-base font-bold mt-1 block text-green-600">
              {individual.profitFactor.toFixed(2)}
            </span>
          </div>
          <div className="p-3 bg-white border border-black">
            <span className="text-[11px] text-zinc-600 block font-bold">Total Fills</span>
            <span className="text-base font-bold mt-1 block text-black">
              {individual.tradeCount} Trades
            </span>
          </div>
        </div>

        {/* Strategy Parameters & Chromosome Genes */}
        <div className="p-4 bg-white border border-black space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-black font-bold uppercase">
            <span>Decoded Gene Parameters</span>
            <span className="text-[11px] text-zinc-600 font-bold">
              {individual.genes.length} Chromosome Alleles
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
            {Object.entries(individual.parameters || {}).map(([key, val]) => (
              <div key={key} className="p-2 bg-white border border-black">
                <span className="text-[10px] text-zinc-600 block truncate font-bold">{key}</span>
                <span className="text-xs font-bold text-black mt-0.5 block">
                  {typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(3)) : String(val)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-mono text-black uppercase font-bold mr-1">Raw Genes:</span>
            {individual.genes.map((g, idx) => (
              <span key={idx} className="px-1.5 py-0.5 border border-black bg-white font-mono text-[10px] text-black">
                g{idx}: <strong className="text-black">{typeof g === 'number' ? g.toFixed(3) : String(g)}</strong>
              </span>
            ))}
          </div>
        </div>

        {/* Realized Equity & Balance Curve */}
        {equityPoints.length > 0 && (
          <div className="p-4 bg-white border border-black space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-black uppercase">
                Realized Equity & Balance Curve
              </span>
              {hoveredPoint ? (
                <div className="flex items-center gap-2 text-[11px] font-mono border border-black bg-black text-white px-2 py-0.5">
                  <span>{hoveredPoint.timestamp}</span>
                  <span className="font-bold">Eq: {formatCurrency(hoveredPoint.equity)}</span>
                  <span className="text-red-400 font-bold">DD: -{hoveredPoint.drawdownPct.toFixed(2)}%</span>
                </div>
              ) : (
                <span className="text-[11px] text-zinc-600">[HOVER TO INSPECT]</span>
              )}
            </div>

            <div className="relative w-full overflow-hidden border border-black bg-white p-2">
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
                      <line x1={padLeft} y1={y} x2={padLeft + chartW} y2={y} stroke="#e5e5e5" strokeWidth="1" />
                      <text x={padLeft - 6} y={y + 3} textAnchor="end" className="text-[9px] font-mono fill-black font-bold">
                        ${(val / 1000).toFixed(1)}k
                      </text>
                    </g>
                  );
                })}

                {pathD && <path d={pathD} fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" />}

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
                      <line x1={pt.x} y1={padTop} x2={pt.x} y2={padTop + chartH} stroke="#000000" strokeWidth="1.5" strokeDasharray="3 3" />
                      <circle cx={pt.x} cy={pt.y} r="4" fill="#000000" stroke="#ffffff" strokeWidth="1.5" />
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
            <h4 className="text-xs font-bold uppercase tracking-wider text-black">
              Simulated Trade Fills ({filteredTrades.length}) - Click any trade for telemetry
            </h4>

            <div>
              <input
                type="text"
                value={tradeSearch}
                onChange={(e) => {
                  setTradeSearch(e.target.value);
                  setTradePage(1);
                }}
                placeholder="Search fills..."
                className="px-3 py-1 bg-white border border-black text-xs font-mono text-black placeholder-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="border border-black overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-black text-black text-[10px] uppercase font-bold">
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
              <tbody className="divide-y divide-black text-black">
                {currentTrades.map((t) => (
                  <tr
                    key={t.ticket}
                    onClick={() => onSelectTrade(t)}
                    className="hover:bg-zinc-100 cursor-pointer transition-colors group"
                    title="Click to view granular trade telemetry"
                  >
                    <td className="py-2 px-3 text-black font-bold group-hover:underline">#{t.ticket}</td>
                    <td className="py-2 px-3 font-bold text-black">{t.symbol}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-1.5 py-0.5 border border-black text-[10px] font-bold ${
                          t.side.toUpperCase() === 'BUY'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {t.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold">{t.volume}</td>
                    <td className="py-2 px-3">${typeof t.openPrice === 'number' ? t.openPrice.toFixed(2) : t.openPrice}</td>
                    <td className="py-2 px-3">${typeof t.closePrice === 'number' ? t.closePrice.toFixed(2) : t.closePrice}</td>
                    <td className={`py-2 px-3 font-bold ${(t.profit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {t.profit != null ? (t.profit >= 0 ? `+${formatCurrency(t.profit)}` : formatCurrency(t.profit)) : '—'}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 border border-black bg-white text-black text-[10px] font-bold">
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
            <div className="flex items-center justify-between text-xs font-mono text-black pt-1">
              <span className="font-bold">Page {tradePage} of {totalPages}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={tradePage === 1}
                  onClick={() => setTradePage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white font-bold disabled:opacity-30"
                >
                  PREV
                </button>
                <button
                  type="button"
                  disabled={tradePage >= totalPages}
                  onClick={() => setTradePage((p) => Math.min(totalPages, p + 1))}
                  className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white font-bold disabled:opacity-30"
                >
                  NEXT
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-black">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-black bg-white hover:bg-black hover:text-white text-black font-bold text-xs font-mono transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
