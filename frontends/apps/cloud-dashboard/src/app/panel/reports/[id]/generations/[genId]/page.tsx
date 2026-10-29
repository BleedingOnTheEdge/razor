'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getApiBaseUrl, getAuthHeaders } from '@/lib/api-client';
import { formatHash } from '@razor/ui-kit';

interface PopulationIndividual {
  id: string;
  individualIndex: number;
  fitness: number;
  diversity: number;
  genomeHash: string;
  genes: number[];
  parameters: Record<string, any>;
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
  const runId = params.id as string;
  const genId = params.genId as string;

  const [detail, setDetail] = useState<GenerationDetail | null>(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching generation details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGenerationDetail();
  }, [runId, genId]);

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
          <h1 className="text-xl font-bold uppercase text-zinc-100">
            Generation {genId} Population Evaluation
          </h1>
          <p className="text-zinc-100 font-normal mt-1">
            Evaluated chromosomes, fitness rankings, and genetic parameter variations for Generation {genId}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/panel/reports/${runId}/generations`}
            className="px-3 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors"
          >
            ALL GENERATIONS
          </Link>
          <Link
            href={`/panel/reports/${runId}`}
            className="px-3 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors"
          >
            VIEW REPORT
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-zinc-100 font-bold border border-[#262626]">
          COMPILING GENERATION {genId} FROM CLOUD API...
        </div>
      ) : error ? (
        <div className="p-4 border border-[#262626] text-rose-400 font-bold">
          ERROR: {error}
        </div>
      ) : !detail ? (
        <div className="py-16 text-center border border-[#262626] p-8 font-bold">
          [GENERATION {genId} NOT FOUND]
        </div>
      ) : (
        <div className="space-y-6">
          {/* Metrics Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 border border-[#262626] bg-[#171717]">
            <div>
              <span className="text-zinc-100 font-bold block">Generation</span>
              <span className="text-lg font-bold text-zinc-100 mt-1 block">#{detail.generation}</span>
            </div>
            <div>
              <span className="text-zinc-100 font-bold block">Best Objective Fitness</span>
              <span className="text-lg font-bold text-[#3ECF8E] mt-1 block">
                {detail.bestFitness.toFixed(4)}
              </span>
            </div>
            <div>
              <span className="text-zinc-100 font-bold block">Average Fitness</span>
              <span className="text-lg font-bold text-zinc-100 mt-1 block">
                {detail.avgFitness.toFixed(4)}
              </span>
            </div>
            <div>
              <span className="text-zinc-100 font-bold block">Population Diversity</span>
              <span className="text-lg font-bold text-zinc-100 mt-1 block">
                {(detail.diversity * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Populations Table */}
          <div className="space-y-2">
            <h2 className="text-base font-bold text-zinc-100 uppercase">
              Evaluated Population Chromosomes ({detail.populations?.length || 0})
            </h2>

            <div className="border border-[#262626] overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#262626] bg-[#171717]">
                    <th className="p-3 font-bold text-zinc-100">Rank</th>
                    <th className="p-3 font-bold text-zinc-100">Individual</th>
                    <th className="p-3 font-bold text-zinc-100">Genome Hash</th>
                    <th className="p-3 font-bold text-zinc-100 text-right">Fitness Score</th>
                    <th className="p-3 font-bold text-zinc-100 text-right">Diversity</th>
                    <th className="p-3 font-bold text-zinc-100">Decoded Parameters</th>
                    <th className="p-3 font-bold text-zinc-100 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.populations || []).map((pop, idx) => (
                    <tr key={pop.id || idx} className="border-b border-[#262626] hover:bg-[#141414]">
                      <td className="p-3 font-bold text-zinc-100">#{idx + 1}</td>
                      <td className="p-3 font-bold text-zinc-100">Ind #{pop.individualIndex ?? idx + 1}</td>
                      <td className="p-3 font-bold text-zinc-100">
                        <Link
                          href={`/panel/reports/${runId}/generations/${genId}/populations/${pop.id || pop.individualIndex}`}
                          className="hover:underline"
                        >
                          {pop.genomeHash ? formatHash(pop.genomeHash, 10) : `ind-${idx + 1}`}
                        </Link>
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
                            <span key={k} className="px-1.5 py-0.5 border border-[#262626] bg-[#171717] text-[10px] font-bold">
                              {k}: {typeof v === 'number' ? v.toFixed(2) : String(v)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/panel/reports/${runId}/generations/${genId}/populations/${pop.id || pop.individualIndex}`}
                          className="px-2 py-1 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors"
                        >
                          [VIEW BACKTEST]
                        </Link>
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
