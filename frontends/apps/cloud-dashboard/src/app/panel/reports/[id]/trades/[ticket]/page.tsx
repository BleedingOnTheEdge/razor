'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getApiBaseUrl, getAuthHeaders } from '@/lib/api-client';
import { formatCurrency, formatPercentage, formatTimestamp, formatHash } from '@razor/ui-kit';

export default function GranularTradeDetailPage() {
  const params = useParams();
  const runId = params.id as string;
  const ticket = params.ticket as string;

  const [trade, setTrade] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadTrade() {
    if (!runId || !ticket) return;
    setLoading(true);
    setError(null);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();
      const res = await fetch(`${baseUrl}/api/reports/${runId}/trades/${ticket}`, { headers });
      if (!res.ok) {
        throw new Error(`Cloud API returned ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      setTrade(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error retrieving trade execution details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrade();
  }, [runId, ticket]);

  const pnl = trade?.pnl ?? 0;
  const isProfit = pnl >= 0;

  return (
    <div className="space-y-6 max-w-5xl font-mono text-xs">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 pb-2 border-b border-[#262626]">
        <Link href="/panel/reports" className="hover:underline font-bold">
          REPORTS
        </Link>
        <span>/</span>
        <Link href={`/panel/reports/${runId}`} className="hover:underline font-bold">
          RUN {formatHash(runId, 6)}
        </Link>
        <span>/</span>
        <Link href={`/panel/reports/${runId}/trades`} className="hover:underline font-bold">
          TRADES
        </Link>
        <span>/</span>
        <span className="font-bold">TICKET #{ticket}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold uppercase text-zinc-100">
            Trade Execution Telemetry — Ticket #{ticket}
          </h1>
          <p className="text-zinc-100 font-normal mt-1">
            Deterministic institutional fill audit, pricing ladder, slippage analysis, and duration metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/panel/reports/${runId}/trades`}
            className="px-3 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors"
          >
            ALL TRADES
          </Link>
          <Link
            href={`/panel/reports/${runId}`}
            className="px-3 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors"
          >
            REPORT OVERVIEW
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-zinc-100 font-bold border border-[#262626]">
          COMPILING TRADE #{ticket} AUDIT DATA FROM CLOUD API...
        </div>
      ) : error ? (
        <div className="p-4 border border-[#262626] text-rose-400 font-bold">
          ERROR: {error}
        </div>
      ) : !trade ? (
        <div className="py-16 text-center border border-[#262626] p-8 font-bold">
          [TRADE #{ticket} NOT FOUND]
        </div>
      ) : (
        <div className="space-y-6">
          {/* Primary Result Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 border border-[#262626] bg-[#171717]">
            <div>
              <span className="text-zinc-100 font-bold block">Realized Profit / Loss</span>
              <span className={`text-2xl font-bold mt-1 block ${isProfit ? 'text-[#3ECF8E]' : 'text-rose-400'}`}>
                {formatCurrency(pnl)}
              </span>
            </div>
            <div>
              <span className="text-zinc-100 font-bold block">Compounded Return</span>
              <span className={`text-2xl font-bold mt-1 block ${isProfit ? 'text-[#3ECF8E]' : 'text-rose-400'}`}>
                {trade.returnPct != null ? formatPercentage(trade.returnPct) : '—'}
              </span>
            </div>
            <div>
              <span className="text-zinc-100 font-bold block">Execution Direction</span>
              <span className="text-2xl font-bold text-zinc-100 mt-1 block uppercase">
                [{trade.side || 'BUY'}]
              </span>
            </div>
            <div>
              <span className="text-zinc-100 font-bold block">Traded Symbol & Lot</span>
              <span className="text-2xl font-bold text-zinc-100 mt-1 block">
                {trade.symbol} • {trade.volume} Lot
              </span>
            </div>
          </div>

          {/* Pricing Ladder & Risk Parameters */}
          <div className="p-5 border border-[#262626] bg-[#171717] space-y-4">
            <h2 className="text-sm font-bold uppercase text-zinc-100">Price Execution Ladder & Guardrails</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 border border-[#262626]">
                <span className="block font-bold text-zinc-100 uppercase">Open Entry Price</span>
                <span className="text-base font-bold text-zinc-100 mt-1 block">
                  {trade.openPrice != null ? trade.openPrice.toFixed(2) : '—'}
                </span>
                <span className="text-[10px] text-zinc-100 block mt-1">
                  {trade.openTime ? formatTimestamp(trade.openTime) : '—'}
                </span>
              </div>

              <div className="p-3 border border-[#262626]">
                <span className="block font-bold text-zinc-100 uppercase">Close Exit Price</span>
                <span className="text-base font-bold text-zinc-100 mt-1 block">
                  {trade.closePrice != null ? trade.closePrice.toFixed(2) : '—'}
                </span>
                <span className="text-[10px] text-zinc-100 block mt-1">
                  {trade.closeTime ? formatTimestamp(trade.closeTime) : 'Open Position'}
                </span>
              </div>

              <div className="p-3 border border-[#262626]">
                <span className="block font-bold text-zinc-100 uppercase">Stop Loss Level</span>
                <span className="text-base font-bold text-rose-400 mt-1 block">
                  {trade.stopLoss != null ? trade.stopLoss.toFixed(2) : 'NONE'}
                </span>
                <span className="text-[10px] text-zinc-100 block mt-1">Hard Risk Cap</span>
              </div>

              <div className="p-3 border border-[#262626]">
                <span className="block font-bold text-zinc-100 uppercase">Take Profit Level</span>
                <span className="text-base font-bold text-[#3ECF8E] mt-1 block">
                  {trade.takeProfit != null ? trade.takeProfit.toFixed(2) : 'NONE'}
                </span>
                <span className="text-[10px] text-zinc-100 block mt-1">Target Boundary</span>
              </div>
            </div>
          </div>

          {/* Institutional Telemetry Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 border border-[#262626] bg-[#171717]">
              <span className="block font-bold text-zinc-100 uppercase">Holding Duration</span>
              <span className="text-lg font-bold text-zinc-100 mt-1 block">
                {trade.durationSeconds
                  ? `${trade.durationSeconds}s (${(trade.durationSeconds / 60).toFixed(1)}m)`
                  : '—'}
              </span>
              <span className="text-[10px] text-zinc-100 block mt-1">Elapsed In Market</span>
            </div>

            <div className="p-4 border border-[#262626] bg-[#171717]">
              <span className="block font-bold text-zinc-100 uppercase">Execution Slippage</span>
              <span className="text-lg font-bold text-zinc-100 mt-1 block">
                {trade.slippageTicks ?? 0.2} Ticks
              </span>
              <span className="text-[10px] text-zinc-100 block mt-1">Engine vs Broker Delta</span>
            </div>

            <div className="p-4 border border-[#262626] bg-[#171717]">
              <span className="block font-bold text-zinc-100 uppercase">Commission & Fees</span>
              <span className="text-lg font-bold text-zinc-100 mt-1 block">
                {formatCurrency(trade.commission ?? 0)}
              </span>
              <span className="text-[10px] text-zinc-100 block mt-1">Broker Settlement Fee</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
