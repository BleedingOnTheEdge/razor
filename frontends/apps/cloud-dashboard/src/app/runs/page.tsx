'use client';

import { useState, useEffect } from 'react';
import { getApiClient } from '@/lib/api-client';
import {
  getRunStatusBadge,
  getRunRelationBadge,
  formatCurrency,
  formatPercentage,
  formatTimestamp,
  formatHash,
} from '@razor/ui-kit';
import { Activity, RefreshCw } from 'lucide-react';
import type { FlowRunPayload } from '@razor/api-client';

export default function RunsPage() {
  const [runs, setRuns] = useState<FlowRunPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRuns() {
    setLoading(true);
    setError(null);
    try {
      // In this setup, we can fetch all instances and their runs or direct runs endpoint
      const client = getApiClient();
      const { data: instances } = await client.GET('/api/instances', {});
      if (instances && instances.length > 0) {
        const allRuns: FlowRunPayload[] = [];
        for (const inst of instances) {
          const { data: instRuns } = await client.GET('/api/instances/{instanceId}/runs', {
            params: { path: { instanceId: inst.instanceId } },
          });
          if (instRuns) {
            allRuns.push(...instRuns);
          }
        }
        setRuns(allRuns);
      }
    } catch (e: any) {
      setError(e?.message || 'Error loading runs from Cloud API.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRuns();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Flow Runs & Lineage</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Track backtest, optimization, and walk-forward runs with branching lineage
          </p>
        </div>

        <button
          onClick={loadRuns}
          className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Runs</span>
        </button>
      </div>

      {loading && (
        <div className="py-12 text-center text-sm font-mono text-zinc-400">
          Loading flow runs and execution lineages...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-mono">
          {error}
        </div>
      )}

      {!loading && !error && runs.length === 0 && (
        <div className="py-16 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20">
          <div className="w-12 h-12 mx-auto rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-zinc-200">No Flow Runs Recorded</h3>
          <p className="mt-1 text-sm text-zinc-400">Initiate a backtest or optimization run via POST /api/runs.</p>
        </div>
      )}

      {!loading && runs.length > 0 && (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3">Run ID</th>
                <th className="px-6 py-3">Kind</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Relation</th>
                <th className="px-6 py-3">Net Profit</th>
                <th className="px-6 py-3">Sharpe</th>
                <th className="px-6 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {runs.map((run) => {
                const statusBadge = getRunStatusBadge(run.status);
                const relBadge = getRunRelationBadge(run.relation);
                return (
                  <tr key={run.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">
                      {formatHash(run.id, 6)}
                    </td>
                    <td className="px-6 py-4 text-zinc-300">
                      {run.kind}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusBadge.className}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${relBadge.className}`}>
                        {relBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-200">
                      {formatCurrency(run.metrics?.netProfit)}
                    </td>
                    <td className="px-6 py-4 text-zinc-200">
                      {run.metrics?.sharpeRatio != null ? run.metrics.sharpeRatio.toFixed(2) : '—'}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {formatTimestamp(run.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
