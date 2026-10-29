'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getApiBaseUrl, getAuthHeaders } from '@/lib/api-client';
import { ServerPagination } from '@/components/ui/ServerPagination';
import { formatHash } from '@razor/ui-kit';

interface GenerationItem {
  generation: number;
  bestFitness: number;
  avgFitness: number;
  diversity: number;
  populationCount: number;
  elapsedMs: number;
  evaluatedAt: string;
}

export default function GenerationsListingPage() {
  const params = useParams();
  const runId = params.id as string;

  const [generations, setGenerations] = useState<GenerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  async function loadGenerations() {
    if (!runId) return;
    setLoading(true);
    setError(null);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();
      const q = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      const res = await fetch(`${baseUrl}/api/reports/${runId}/generations?${q.toString()}`, { headers });
      if (!res.ok) {
        throw new Error(`Cloud API returned ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      if (Array.isArray(json)) {
        setGenerations(json);
        setTotalCount(json.length);
        setTotalPages(Math.max(1, Math.ceil(json.length / pageSize)));
      } else if (json && Array.isArray(json.items)) {
        setGenerations(json.items);
        setTotalCount(json.totalCount ?? json.items.length);
        setTotalPages(json.totalPages ?? 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve generations progression.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGenerations();
  }, [runId, page, pageSize]);

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
        <span className="font-bold">GENERATIONS PROGRESSION</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase text-zinc-100">
            Genetic Algorithm Generational Convergence
          </h1>
          <p className="text-zinc-100 font-normal mt-1">
            Historical population iterations, best vs. average fitness progression, and genetic diversity metrics for Run {formatHash(runId, 8)}.
          </p>
        </div>

        <Link
          href={`/panel/reports/${runId}`}
          className="px-3 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors"
        >
          RETURN TO REPORT
        </Link>
      </div>

      {loading ? (
        <div className="py-16 text-center text-zinc-100 font-bold border border-[#262626]">
          COMPILING GENERATIONS PROGRESSION FROM CLOUD API...
        </div>
      ) : error ? (
        <div className="p-4 border border-[#262626] text-rose-400 font-bold">
          ERROR: {error}
        </div>
      ) : generations.length === 0 ? (
        <div className="py-16 text-center border border-[#262626] p-8 font-bold">
          NO GENERATIONS RECORDED FOR THIS FLOW RUN
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-[#262626] overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#262626] bg-[#171717]">
                  <th className="p-3 font-bold text-zinc-100">Gen #</th>
                  <th className="p-3 font-bold text-zinc-100 text-right">Best Fitness</th>
                  <th className="p-3 font-bold text-zinc-100 text-right">Avg Fitness</th>
                  <th className="p-3 font-bold text-zinc-100 text-right">Diversity</th>
                  <th className="p-3 font-bold text-zinc-100 text-right">Pop Size</th>
                  <th className="p-3 font-bold text-zinc-100 text-right">Execution Time</th>
                  <th className="p-3 font-bold text-zinc-100 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {generations.map((g) => (
                  <tr key={g.generation} className="border-b border-[#262626] hover:bg-[#141414]">
                    <td className="p-3 font-bold text-zinc-100">
                      <Link
                        href={`/panel/reports/${runId}/generations/${g.generation}`}
                        className="hover:underline"
                      >
                        Gen {g.generation}
                      </Link>
                    </td>
                    <td className="p-3 text-right font-bold text-[#3ECF8E]">
                      {g.bestFitness.toFixed(4)}
                    </td>
                    <td className="p-3 text-right font-bold text-zinc-100">
                      {g.avgFitness.toFixed(4)}
                    </td>
                    <td className="p-3 text-right font-bold text-zinc-100">
                      {(g.diversity * 100).toFixed(1)}%
                    </td>
                    <td className="p-3 text-right font-bold text-zinc-100">
                      {g.populationCount || 50}
                    </td>
                    <td className="p-3 text-right text-zinc-100">
                      {g.elapsedMs ? `${g.elapsedMs} ms` : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/panel/reports/${runId}/generations/${g.generation}`}
                        className="px-2 py-1 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors"
                      >
                        [INSPECT POPULATIONS]
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ServerPagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
}
