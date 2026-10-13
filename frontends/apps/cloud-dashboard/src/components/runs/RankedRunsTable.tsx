'use client';

import React from 'react';
import Link from 'next/link';
import { Trophy, AlertTriangle } from 'lucide-react';
import { formatHash } from '@razor/ui-kit';
import type { RankedRunResultPayload, EngineInstancePayload } from '@/lib/api-client';

export interface RankedRunsTableProps {
  instances: EngineInstancePayload[];
  rankingInstanceId: string;
  setRankingInstanceId: (id: string) => void;
  rankingMetric: string;
  setRankingMetric: (metric: string) => void;
  loadingRanking: boolean;
  rankedRuns: RankedRunResultPayload[];
}

export function RankedRunsTable({
  instances,
  rankingInstanceId,
  setRankingInstanceId,
  rankingMetric,
  setRankingMetric,
  loadingRanking,
  rankedRuns,
}: RankedRunsTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-xs font-mono">
        <div className="flex items-center gap-3">
          <label className="text-zinc-400 font-semibold">Instance Fleet:</label>
          <select
            value={rankingInstanceId}
            onChange={(e) => setRankingInstanceId(e.target.value)}
            className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            {instances.map((inst) => (
              <option key={inst.instanceId} value={inst.instanceId}>
                {inst.name || inst.engineId} ({formatHash(inst.instanceId, 6)})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-zinc-400 font-semibold">Ranking Metric:</label>
          <select
            value={rankingMetric}
            onChange={(e) => setRankingMetric(e.target.value)}
            className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="SharpeRatio">Sharpe Ratio</option>
            <option value="NetProfit">Net Profit</option>
            <option value="TotalReturn">Total Return</option>
            <option value="MaxDrawdown">Max Drawdown</option>
            <option value="Fitness">Objective Fitness</option>
          </select>
        </div>
      </div>

      {loadingRanking && (
        <div className="py-16 text-center text-sm font-mono text-zinc-400">
          Evaluating deterministic leaderboard...
        </div>
      )}

      {!loadingRanking && rankedRuns.length === 0 && (
        <div className="py-16 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20">
          <Trophy className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-200 font-mono">No Ranked Runs Available</h3>
          <p className="text-xs text-zinc-400 mt-1">This engine instance has no completed runs to evaluate for ranking.</p>
        </div>
      )}

      {!loadingRanking && rankedRuns.length > 0 && (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3">Rank</th>
                <th className="px-6 py-3">Run ID</th>
                <th className="px-6 py-3">Score</th>
                <th className="px-6 py-3">Relation</th>
                <th className="px-6 py-3">Comparability</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {rankedRuns.map((item) => (
                <tr key={item.runId} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                    {item.rank === 1 && <span className="text-amber-400 text-sm">🥇</span>}
                    {item.rank === 2 && <span className="text-zinc-300 text-sm">🥈</span>}
                    {item.rank === 3 && <span className="text-amber-600 text-sm">🥉</span>}
                    <span>#{item.rank}</span>
                  </td>
                  <td className="px-6 py-4 text-zinc-200 font-bold">
                    <Link href={`/reports/${item.runId}`} className="hover:text-cyan-400">
                      {formatHash(item.runId, 8)}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-cyan-400 font-bold">
                    {item.score.toFixed(4)} ({item.metric})
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300">
                      {item.relation || 'Original'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {item.comparable ? (
                      <span className="text-emerald-400 text-[11px] font-bold">Certified Comparable</span>
                    ) : (
                      <span className="text-amber-400 text-[11px] font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Diverged: {item.divergenceReason || 'Untracked'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/reports/${item.runId}`}
                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-400 text-xs transition-colors"
                    >
                      View Report
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
