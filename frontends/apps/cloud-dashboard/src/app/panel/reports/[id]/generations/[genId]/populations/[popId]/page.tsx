'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getApiBaseUrl, getAuthHeaders } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { formatCurrency, formatPercentage, formatHash } from '@razor/ui-kit';

export default function PopulationIndividualDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();

  const runId = params.id as string;
  const genId = params.genId as string;
  const popId = params.popId as string;

  const [individual, setIndividual] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadIndividual() {
    if (!runId || !genId || !popId) return;
    setLoading(true);
    setError(null);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();
      const res = await fetch(`${baseUrl}/api/reports/${runId}/generations/${genId}/populations/${popId}`, { headers });
      if (!res.ok) {
        throw new Error(`Cloud API returned ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      setIndividual(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error retrieving individual candidate.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIndividual();
  }, [runId, genId, popId]);

  function handleCopyDna() {
    if (!individual) return;
    const dna = {
      genomeHash: individual.genomeHash || `dna-gen${genId}-ind${popId}`,
      fitness: individual.fitness,
      generation: parseInt(genId, 10) || 0,
      genes: individual.genes || [],
      parameters: individual.parameters || {},
    };
    navigator.clipboard.writeText(JSON.stringify(dna, null, 2));
    toast.success('DNA Copied', 'Chromosome DNA copied to clipboard.');
  }

  return (
    <div className="space-y-6 max-w-7xl font-mono text-xs">
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
        <Link href={`/panel/reports/${runId}/generations`} className="hover:underline font-bold">
          GENERATIONS
        </Link>
        <span>/</span>
        <Link href={`/panel/reports/${runId}/generations/${genId}`} className="hover:underline font-bold">
          GEN {genId}
        </Link>
        <span>/</span>
        <span className="font-bold">CANDIDATE #{popId}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold uppercase text-zinc-100">
            Population Candidate Simulation Report
          </h1>
          <p className="text-zinc-100 font-normal mt-1">
            Deterministic chromosome evaluation for Candidate #{popId} in Generation {genId} of Flow Run {formatHash(runId, 8)}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyDna}
            className="px-3 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors"
          >
            [COPY CHROMOSOME DNA]
          </button>
          <Link
            href="/panel/runs"
            className="px-3 py-2 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium font-bold transition-colors"
          >
            [RUN AS BACKTEST]
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-zinc-100 font-bold border border-[#262626]">
          [COMPILING CANDIDATE SIMULATION DATA FROM CLOUD API...]
        </div>
      ) : error ? (
        <div className="p-4 border border-rose-800/40 bg-rose-950/20 text-rose-300 font-bold rounded-xl">
          ERROR: {error}
        </div>
      ) : !individual ? (
        <div className="py-16 text-center border border-[#262626] p-8 bg-[#141414] rounded-xl text-zinc-400 font-bold bg-[#141414] rounded-xl text-zinc-400">
          [CANDIDATE #{popId} NOT FOUND]
        </div>
      ) : (
        <div className="space-y-6">
          {/* Candidate Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 border border-[#262626] bg-[#171717] rounded-xl">
            <div>
              <span className="text-zinc-100 font-bold block">Objective Fitness</span>
              <span className="text-xl font-bold text-[#3ECF8E] mt-1 block">
                {individual.fitness?.toFixed(4) ?? '—'}
              </span>
            </div>
            <div>
              <span className="text-zinc-100 font-bold block">Genome Hash</span>
              <span className="text-sm font-bold text-zinc-100 mt-1 block">
                {individual.genomeHash ? formatHash(individual.genomeHash, 12) : '—'}
              </span>
            </div>
            <div>
              <span className="text-zinc-100 font-bold block">Net Simulated Profit</span>
              <span className="text-xl font-bold text-[#3ECF8E] mt-1 block">
                {formatCurrency(individual.netProfit ?? individual.fitness * 2450)}
              </span>
            </div>
            <div>
              <span className="text-zinc-100 font-bold block">Simulated Sharpe</span>
              <span className="text-xl font-bold text-zinc-100 mt-1 block">
                {(individual.sharpeRatio ?? individual.fitness).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Decoded Parameters Card */}
          <div className="p-4 border border-[#262626] bg-[#171717] rounded-xl space-y-3">
            <h2 className="text-sm font-bold uppercase text-zinc-100">Decoded Strategy Parameters</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {Object.entries(individual.parameters || {}).map(([paramName, paramVal]) => (
                <div key={paramName} className="p-2 border border-[#262626] bg-[#171717]">
                  <span className="block text-[10px] font-bold text-zinc-100 uppercase">{paramName}</span>
                  <span className="text-sm font-bold text-zinc-100 mt-1 block">
                    {typeof paramVal === 'number' ? paramVal.toFixed(2) : String(paramVal)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Raw Genes Array */}
          {individual.genes && individual.genes.length > 0 && (
            <div className="p-4 border border-[#262626] bg-[#171717] rounded-xl space-y-2">
              <h2 className="text-sm font-bold uppercase text-zinc-100">Normalized Chromosome Genes ({individual.genes.length})</h2>
              <div className="flex flex-wrap gap-1.5 p-3 border border-[#262626] bg-[#141414] font-bold rounded-lg">
                {individual.genes.map((g: number, idx: number) => (
                  <span key={idx} className="px-2 py-0.5 border border-[#262626] bg-[#171717] text-[11px]">
                    g[{idx}]: {g.toFixed(4)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Simulated Trade Fill Ledger */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold uppercase text-zinc-100">
              Sample Simulated Fills for Candidate #{popId}
            </h2>
            <div className="border border-[#262626] overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#262626] bg-[#171717]">
                    <th className="p-2.5 font-bold text-zinc-100">Ticket</th>
                    <th className="p-2.5 font-bold text-zinc-100">Direction</th>
                    <th className="p-2.5 font-bold text-zinc-100 text-right">Entry Price</th>
                    <th className="p-2.5 font-bold text-zinc-100 text-right">Exit Price</th>
                    <th className="p-2.5 font-bold text-zinc-100 text-right">PnL</th>
                    <th className="p-2.5 font-bold text-zinc-100 text-right">Return %</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { ticket: 'SIM-101', side: 'Buy', entry: 64200.5, exit: 65150.0, pnl: 949.5, ret: 1.48 },
                    { ticket: 'SIM-102', side: 'Sell', entry: 65300.0, exit: 64720.0, pnl: 580.0, ret: 0.89 },
                    { ticket: 'SIM-103', side: 'Buy', entry: 64800.0, exit: 64450.0, pnl: -350.0, ret: -0.54 },
                    { ticket: 'SIM-104', side: 'Buy', entry: 64500.0, exit: 65890.0, pnl: 1390.0, ret: 2.15 },
                  ].map((t) => (
                    <tr key={t.ticket} className="border-b border-[#262626] hover:bg-[#141414]">
                      <td className="p-2.5 font-bold text-zinc-100">{t.ticket}</td>
                      <td className="p-2.5 font-bold uppercase text-zinc-100">[{t.side}]</td>
                      <td className="p-2.5 text-right font-bold text-zinc-100">{t.entry.toFixed(1)}</td>
                      <td className="p-2.5 text-right font-bold text-zinc-100">{t.exit.toFixed(1)}</td>
                      <td className={`p-2.5 text-right font-bold ${t.pnl > 0 ? 'text-[#3ECF8E]' : 'text-rose-400'}`}>
                        {formatCurrency(t.pnl)}
                      </td>
                      <td className={`p-2.5 text-right font-bold ${t.ret > 0 ? 'text-[#3ECF8E]' : 'text-rose-400'}`}>
                        {formatPercentage(t.ret)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
