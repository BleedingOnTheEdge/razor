'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { getApiBaseUrl, getAuthHeaders } from '@/lib/api-client';
import { formatHash, formatCurrency } from '@razor/ui-kit';
import { useToast } from '@/components/ui/toast';
import { X, Dna, Layers } from 'lucide-react';

interface PopulationIndividual {
  id: string;
  individualIndex: number;
  fitness: number;
  diversity: number;
  genomeHash: string;
  genes: number[];
  parameters: Record<string, unknown>;
  netProfit?: number;
  sharpeRatio?: number;
}

interface GenerationDetail {
  generation: number;
  bestFitness: number;
  avgFitness: number;
  diversity: number;
  populationCount: number;
  populations: PopulationIndividual[];
}

export default function GenerationDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const toast = useToast();
  const runId = params.id as string;
  const genId = params.genId as string;
  const queryPopId = searchParams.get('popId');

  const [detail, setDetail] = useState<GenerationDetail | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<PopulationIndividual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadGenerationDetail() {
    if (!runId || !genId) return;
    setLoading(true);
    setError(null);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();
      const res = await fetch(`${baseUrl}/api/reports/${runId}/generations/${genId}`, { headers });
      if (!res.ok) {
        throw new Error(`Cloud API returned ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      setDetail(json);

      if (queryPopId && json.populations) {
        const found = json.populations.find((p: PopulationIndividual) => p.id === queryPopId || String(p.individualIndex) === queryPopId);
        if (found) {
          setSelectedCandidate(found);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching generation details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGenerationDetail();
  }, [runId, genId]);

  function handleCopyDna(ind: PopulationIndividual) {
    const dna = {
      genomeHash: ind.genomeHash || `dna-gen${genId}-ind${ind.id || ind.individualIndex}`,
      fitness: ind.fitness,
      generation: parseInt(genId, 10) || 0,
      genes: ind.genes || [],
      parameters: ind.parameters || {},
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
        <span className="font-bold">GEN {genId}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold uppercase text-zinc-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-zinc-100" />
            <span>Generation {genId} Population Analytics</span>
          </h1>
          <p className="text-zinc-400 font-sans mt-1">
            Granular candidate chromosome telemetry for Generation #{genId} in Flow Run {formatHash(runId, 8)}.
          </p>
        </div>

        <Link
          href={`/panel/reports/${runId}/generations`}
          className="px-3.5 py-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium font-bold transition-colors"
        >
          ALL GENERATIONS →
        </Link>
      </div>

      {loading ? (
        <div className="py-16 text-center text-zinc-100 font-bold border border-[#262626]">
          COMPILING GENERATION TELEMETRY FROM CLOUD API...
        </div>
      ) : error ? (
        <div className="p-4 border border-rose-800/40 bg-rose-950/20 text-rose-300 font-bold rounded-xl">
          ERROR: {error}
        </div>
      ) : !detail ? (
        <div className="py-16 text-center border border-[#262626] p-8 bg-[#141414] rounded-xl text-zinc-400 font-bold">
          GENERATION NOT FOUND
        </div>
      ) : (
        <div className="space-y-6">
          {/* Generation Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border border-[#262626] bg-[#171717] rounded-xl">
            <div>
              <span className="text-zinc-400 font-bold block text-[11px] uppercase">Best Fitness</span>
              <span className="text-xl font-bold text-[#3ECF8E] mt-1 block">
                {detail.bestFitness.toFixed(4)}
              </span>
            </div>
            <div>
              <span className="text-zinc-400 font-bold block text-[11px] uppercase">Average Fitness</span>
              <span className="text-xl font-bold text-zinc-100 mt-1 block">
                {detail.avgFitness.toFixed(4)}
              </span>
            </div>
            <div>
              <span className="text-zinc-400 font-bold block text-[11px] uppercase">Genetic Diversity</span>
              <span className="text-xl font-bold text-zinc-100 mt-1 block">
                {(detail.diversity * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-zinc-400 font-bold block text-[11px] uppercase">Candidate Count</span>
              <span className="text-xl font-bold text-zinc-100 mt-1 block">
                {detail.populationCount} Candidates
              </span>
            </div>
          </div>

          {/* Populations Table */}
          <div className="border border-[#262626] bg-[#171717] rounded-xl overflow-hidden">
            <div className="p-3 border-b border-[#262626] bg-[#1f1f1f] flex justify-between items-center">
              <span className="font-bold uppercase tracking-wider text-zinc-100">
                Generation #{genId} Candidate Roster ({detail.populations?.length || 0})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#262626] bg-[#141414] text-zinc-400 font-bold uppercase text-[10px]">
                    <th className="p-3">Rank / ID</th>
                    <th className="p-3">Genome Fingerprint</th>
                    <th className="p-3 text-right">Fitness</th>
                    <th className="p-3 text-right">Diversity</th>
                    <th className="p-3">Decoded Strategy Parameters</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {(detail.populations || []).map((pop, idx) => (
                    <tr key={pop.id || idx} className="hover:bg-[#141414] transition-colors">
                      <td className="p-3 font-bold text-zinc-100">
                        #{pop.individualIndex || idx + 1}
                      </td>
                      <td className="p-3 font-mono font-bold text-zinc-300">
                        <button
                          type="button"
                          onClick={() => setSelectedCandidate(pop)}
                          className="hover:underline text-left"
                        >
                          {pop.genomeHash ? formatHash(pop.genomeHash, 10) : `ind-${idx + 1}`}
                        </button>
                      </td>
                      <td className="p-3 text-right font-bold text-[#3ECF8E]">
                        {pop.fitness.toFixed(4)}
                      </td>
                      <td className="p-3 text-right font-bold text-zinc-100">
                        {pop.diversity != null ? `${(pop.diversity * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(pop.parameters || {}).slice(0, 4).map(([k, v]) => (
                            <span key={k} className="px-1.5 py-0.5 border border-[#262626] bg-[#141414] text-[10px] font-bold">
                              {k}: {typeof v === 'number' ? v.toFixed(2) : String(v)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedCandidate(pop)}
                          className="px-2.5 py-1 border border-[#262626] bg-[#141414] hover:bg-[#222222] text-zinc-200 rounded-full font-bold transition-colors"
                        >
                          INSPECT CANDIDATE →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Inspector Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div className="flex items-center gap-2">
                <Dna className="w-5 h-5 text-[#3ECF8E]" />
                <h2 className="text-base font-bold uppercase text-zinc-100">
                  Candidate #{selectedCandidate.individualIndex || selectedCandidate.id} Granular DNA
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="p-1 text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#171717] border border-[#262626] rounded-lg">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Fitness</span>
                <span className="text-lg font-bold text-[#3ECF8E] mt-0.5 block">{selectedCandidate.fitness.toFixed(4)}</span>
              </div>
              <div className="p-3 bg-[#171717] border border-[#262626] rounded-lg">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Diversity</span>
                <span className="text-lg font-bold text-zinc-100 mt-0.5 block">
                  {selectedCandidate.diversity != null ? `${(selectedCandidate.diversity * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="p-3 bg-[#171717] border border-[#262626] rounded-lg">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Genome Hash</span>
                <span className="text-xs font-mono font-bold text-zinc-200 mt-1 block truncate">
                  {selectedCandidate.genomeHash ? formatHash(selectedCandidate.genomeHash, 8) : '—'}
                </span>
              </div>
              <div className="p-3 bg-[#171717] border border-[#262626] rounded-lg">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Estimated Return</span>
                <span className="text-lg font-bold text-[#3ECF8E] mt-0.5 block">
                  {formatCurrency(selectedCandidate.netProfit ?? selectedCandidate.fitness * 2450)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase text-zinc-300 block">Fitted Strategy Parameters</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#171717] p-3 border border-[#262626] rounded-lg">
                {Object.entries(selectedCandidate.parameters || {}).map(([paramName, paramVal]) => (
                  <div key={paramName} className="p-1.5 border border-[#262626] bg-[#141414] rounded">
                    <span className="block text-[9px] font-bold text-zinc-400 uppercase truncate">{paramName}</span>
                    <span className="text-xs font-bold font-mono text-zinc-100 mt-0.5 block">
                      {typeof paramVal === 'number' ? paramVal.toFixed(2) : String(paramVal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {selectedCandidate.genes && selectedCandidate.genes.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase text-zinc-300 block">Chromosome Genes ({selectedCandidate.genes.length})</span>
                <div className="flex flex-wrap gap-1 bg-[#171717] p-2 border border-[#262626] rounded-lg">
                  {selectedCandidate.genes.map((g: number, idx: number) => (
                    <span key={idx} className="px-1.5 py-0.5 border border-[#262626] bg-[#141414] text-[10px] font-mono font-bold">
                      g[{idx}]: {g.toFixed(4)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#262626]">
              <button
                type="button"
                onClick={() => handleCopyDna(selectedCandidate)}
                className="px-4 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-bold transition-colors"
              >
                COPY CHROMOSOME DNA
              </button>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 bg-zinc-200 text-zinc-950 hover:bg-zinc-100 rounded-full font-bold transition-colors"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
