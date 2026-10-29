'use client';

import React from 'react';
import Link from 'next/link';
import { Trophy, AlertTriangle, ArrowRight } from 'lucide-react';
import { formatHash, Button, Card, Badge } from '@razor/ui-kit';
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
    <div className="space-y-4 font-sans text-xs">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#171717] border border-[#262626] text-xs shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-zinc-400 font-medium">Instance Fleet:</label>
          <select
            value={rankingInstanceId}
            onChange={(e) => setRankingInstanceId(e.target.value)}
            className="px-3 py-1.5 bg-[#1f1f1f] border border-[#2e2e2e] rounded-lg text-zinc-200 font-mono focus:outline-none focus:border-[#3ECF8E]"
          >
            {instances.map((inst) => (
              <option key={inst.instanceId} value={inst.instanceId}>
                {inst.name || inst.engineId} ({formatHash(inst.instanceId, 6)})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-zinc-400 font-medium">Ranking Metric:</label>
          <select
            value={rankingMetric}
            onChange={(e) => setRankingMetric(e.target.value)}
            className="px-3 py-1.5 bg-[#1f1f1f] border border-[#2e2e2e] rounded-lg text-zinc-200 font-mono focus:outline-none focus:border-[#3ECF8E]"
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
        <div className="py-16 text-center text-sm font-mono text-zinc-500">
          Evaluating deterministic leaderboard…
        </div>
      )}

      {!loadingRanking && rankedRuns.length === 0 && (
        <div className="py-16 text-center rounded-xl border border-dashed border-[#262626] bg-[#141414]">
          <Trophy className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-zinc-200 font-sans">No Ranked Runs Available</h3>
          <p className="text-xs text-zinc-500 mt-1">This engine instance has no completed runs to evaluate for ranking.</p>
        </div>
      )}

      {!loadingRanking && rankedRuns.length > 0 && (
        <div className="rounded-xl border border-[#262626] bg-[#171717] overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#141414] text-zinc-400 uppercase tracking-wider border-b border-[#262626]">
              <tr>
                <th className="px-6 py-3 font-semibold">Rank</th>
                <th className="px-6 py-3 font-semibold">Run ID</th>
                <th className="px-6 py-3 font-semibold">Score</th>
                <th className="px-6 py-3 font-semibold">Relation</th>
                <th className="px-6 py-3 font-semibold">Comparability</th>
                <th className="px-6 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {rankedRuns.map((item) => (
                <tr key={item.runId} className="hover:bg-[#1f1f1f] transition-colors">
                  <td className="px-6 py-3.5 font-semibold text-zinc-100 flex items-center gap-2">
                    {item.rank === 1 && <Trophy className="w-4 h-4 text-amber-400 shrink-0" />}
                    {item.rank === 2 && <Trophy className="w-4 h-4 text-zinc-400 shrink-0" />}
                    {item.rank === 3 && <Trophy className="w-4 h-4 text-amber-700 shrink-0" />}
                    <span className="font-mono">#{item.rank}</span>
                  </td>
                  <td className="px-6 py-3.5 text-zinc-100 font-mono font-medium">
                    <Link href={`/reports/${item.runId}`} className="hover:text-[#3ECF8E] transition-colors">
                      {formatHash(item.runId, 8)}
                    </Link>
                  </td>
                  <td className="px-6 py-3.5 text-[#3ECF8E] font-mono font-semibold">
                    {item.score != null ? item.score.toFixed(4) : '—'} <span className="text-zinc-500 font-normal">({item.metric})</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="px-2 py-0.5 rounded text-[11px] bg-[#222222] border border-[#2e2e2e] text-zinc-300 font-mono">
                      {item.relation || 'Original'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    {item.comparable ? (
                      <span className="text-[#3ECF8E] text-[11px] font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E]" />
                        Certified Comparable
                      </span>
                    ) : (
                      <span className="text-amber-400 text-[11px] font-medium flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        Diverged: {item.divergenceReason || 'Untracked'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <Link href={`/reports/${item.runId}`}>
                      <Button variant="outline" size="sm" pill className="text-xs">
                        <span>View Report</span>
                        <ArrowRight className="w-3 h-3 ml-1 text-[#3ECF8E]" />
                      </Button>
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
