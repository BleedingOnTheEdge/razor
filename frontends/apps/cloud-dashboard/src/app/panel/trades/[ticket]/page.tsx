'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getApiBaseUrl, getAuthHeaders } from '@/lib/api-client';
import { formatCurrency, formatPercentage, formatTimestamp } from '@razor/ui-kit';

export default function GlobalTradeDetailPage() {
  const params = useParams();
  const ticket = params.ticket as string;

  const [trade, setTrade] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadTrade() {
    if (!ticket) return;
    setLoading(true);
    setError(null);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();
      const res = await fetch(`${baseUrl}/api/trades/${ticket}`, { headers });
      if (!res.ok) {
        throw new Error(`Cloud API returned ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      setTrade(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error resolving trade ticket.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrade();
  }, [ticket]);

  const pnl = trade?.pnl ?? 0;
  const isProfit = pnl >= 0;

  return (
    <div className="space-y-6 max-w-5xl font-mono text-xs">
      <div className="flex items-center gap-2 pb-2 border-b border-[#262626]">
        <Link href="/panel/reports" className="hover:underline font-bold">
          [REPORTS]
        </Link>
        <span>/</span>
        <span className="font-bold">[UNIVERSAL TRADE INSPECTOR]</span>
        <span>/</span>
        <span className="font-bold">#{ticket}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase text-zinc-100">
            Universal Trade Execution Telemetry — #{ticket}
          </h1>
          <p className="text-zinc-100 font-normal mt-1">
            Institutional fill audit, pricing ladder, slippage, and execution holding duration.
          </p>
        </div>

        <Link
          href="/panel/reports"
          className="px-3 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors"
        >
          [VIEW ALL REPORTS]
        </Link>
      </div>

      {loading ? (
        <div className="py-16 text-center text-zinc-100 font-bold border border-[#262626]">
          [RESOLVING TRADE TICKET #{ticket} FROM CLOUD API...]
        </div>
      ) : error ? (
        <div className="p-4 border border-[#262626] text-rose-400 font-bold">
          [ERROR]: {error}
        </div>
      ) : !trade ? (
        <div className="py-16 text-center border border-[#262626] p-8 font-bold">
          [TICKET #{ticket} NOT FOUND]
        </div>
      ) : (
        <div className="space-y-6">
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
        </div>
      )}
    </div>
  );
}
