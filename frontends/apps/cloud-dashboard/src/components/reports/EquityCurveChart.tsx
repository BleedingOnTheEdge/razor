'use client';

import React, { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '@razor/ui-kit';
import type { EquityPointPayload } from '@/lib/api-client';

export interface EquityCurveChartProps {
  equityPoints: EquityPointPayload[];
}

export function EquityCurveChart({ equityPoints }: EquityCurveChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<EquityPointPayload | null>(null);

  const svgWidth = 800;
  const svgHeight = 220;
  const padLeft = 65;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const { minEq, maxEq, pointsMapped, pathD, areaD } = useMemo(() => {
    if (equityPoints.length === 0) {
      return { minEq: 0, maxEq: 100000, pointsMapped: [], pathD: '', areaD: '' };
    }

    let min = equityPoints[0]?.equity ?? 100000;
    let max = equityPoints[0]?.equity ?? 100000;
    for (const pt of equityPoints) {
      const eq = pt?.equity ?? 100000;
      if (eq < min) min = eq;
      if (eq > max) max = eq;
    }

    const range = max === min ? (max || 100000) * 0.1 : max - min;
    const yMin = min - range * 0.05;
    const yMax = max + range * 0.05;

    const mapped = equityPoints.map((pt, idx) => {
      const eq = pt?.equity ?? 100000;
      const x = padLeft + (idx / Math.max(1, equityPoints.length - 1)) * chartW;
      const y = padTop + chartH - ((eq - yMin) / Math.max(1, yMax - yMin)) * chartH;
      return { ...pt, equity: eq, x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 };
    });

    const path = mapped.reduce(
      (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${(pt.x ?? 0).toFixed(1)} ${(pt.y ?? 0).toFixed(1)}`,
      ''
    );
    const lastX = mapped[mapped.length - 1]?.x ?? 0;
    const firstX = mapped[0]?.x ?? 0;
    const bottomY = padTop + chartH;
    const area = mapped.length > 0
      ? `${path} L ${lastX.toFixed(1)} ${bottomY.toFixed(1)} L ${firstX.toFixed(1)} ${bottomY.toFixed(1)} Z`
      : '';

    return { minEq: min, maxEq: max, pointsMapped: mapped, pathD: path, areaD: area };
  }, [equityPoints, chartW, chartH, padLeft, padTop]);

  if (equityPoints.length === 0) return null;

  return (
    <div className="p-6 rounded-2xl bg-[#171717] border border-[#262626] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div>
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#3ECF8E]" />
            <span>Realized Equity & Balance Progression Curve</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5 font-sans">
            Granular time-series of mark-to-market portfolio equity, account balance, and drawdown depth.
          </p>
        </div>

        {/* Inspect Tooltip Pill */}
        {hoveredPoint ? (
          <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-[#141414] border border-[#262626] text-zinc-100 font-mono text-xs">
            <span className="text-zinc-400">{hoveredPoint.timestamp}</span>
            <span className="font-bold text-[#3ECF8E]">Equity: {formatCurrency(hoveredPoint.equity)}</span>
            <span className="text-zinc-300">Bal: {formatCurrency(hoveredPoint.balance)}</span>
            <span className="text-rose-400">DD: -{(hoveredPoint.drawdownPct ?? 0).toFixed(2)}%</span>
          </div>
        ) : (
          <div className="text-xs font-mono text-zinc-400">Hover over curve to inspect telemetry points</div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3ECF8E" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3ECF8E" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
            const y = padTop + chartH * ratio;
            const val = maxEq - ratio * (maxEq - minEq);
            return (
              <g key={ratio}>
                <line x1={padLeft} y1={y} x2={padLeft + chartW} y2={y} stroke="#f4f4f5" strokeWidth="1" />
                <text x={padLeft - 8} y={y + 3} textAnchor="end" className="text-[10px] font-mono fill-zinc-400">
                  {Number.isFinite(val) ? `$${(val / 1000).toFixed(1)}k` : '—'}
                </text>
              </g>
            );
          })}

          {/* Gradient Fill under Equity */}
          {areaD && <path d={areaD} fill="url(#equityGradient)" />}

          {/* Equity Line */}
          {pathD && <path d={pathD} fill="none" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round" />}

          {/* Drawdown Area (bottom layer) */}
          {equityPoints.map((pt, idx) => {
            if (pt.drawdownPct <= 0.05) return null;
            const x = padLeft + (idx / Math.max(1, equityPoints.length - 1)) * chartW;
            const ddH = Math.min(25, (pt.drawdownPct / 20) * 25);
            const y = padTop + chartH - ddH;
            return <rect key={`dd-${idx}`} x={x - 1} y={y} width="2" height={ddH} fill="#f43f5e" opacity="0.4" />;
          })}

          {/* Hover Interaction Vertical Bar and Marker */}
          {pointsMapped.map((pt, idx) => (
            <rect
              key={`hit-${idx}`}
              x={pt.x - chartW / Math.max(1, pointsMapped.length) / 2}
              y={padTop}
              width={chartW / Math.max(1, pointsMapped.length)}
              height={chartH}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHoveredPoint(pt)}
            />
          ))}

          {hoveredPoint && (
            <g>
              {(() => {
                const hoveredMapped = pointsMapped.find((p) => p.timestamp === hoveredPoint.timestamp);
                if (!hoveredMapped) return null;
                return (
                  <>
                    <line
                      x1={hoveredMapped.x}
                      y1={padTop}
                      x2={hoveredMapped.x}
                      y2={padTop + chartH}
                      stroke="#0e7490"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    <circle cx={hoveredMapped.x} cy={hoveredMapped.y} r="4.5" fill="#06b6d4" stroke="#ffffff" strokeWidth="2" />
                  </>
                );
              })()}
            </g>
          )}

          {/* Time Axis Labels */}
          {pointsMapped.length > 0 && (
            <>
              <text x={padLeft} y={svgHeight - 10} textAnchor="start" className="text-[10px] font-mono fill-zinc-400">
                {pointsMapped[0].timestamp}
              </text>
              <text
                x={padLeft + chartW / 2}
                y={svgHeight - 10}
                textAnchor="middle"
                className="text-[10px] font-mono fill-zinc-400"
              >
                {pointsMapped[Math.floor(pointsMapped.length / 2)]?.timestamp}
              </text>
              <text
                x={padLeft + chartW}
                y={svgHeight - 10}
                textAnchor="end"
                className="text-[10px] font-mono fill-zinc-400"
              >
                {pointsMapped[pointsMapped.length - 1]?.timestamp}
              </text>
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
