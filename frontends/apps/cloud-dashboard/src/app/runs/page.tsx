'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiClient, type FlowRunPayload, type RankedRunResultPayload } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import {
  getRunStatusBadge,
  getRunRelationBadge,
  formatCurrency,
  formatTimestamp,
  formatHash,
} from '@razor/ui-kit';
import {
  Activity,
  RefreshCw,
  Plus,
  GitBranch,
  FileText,
  Search,
  Filter,
  Trophy,
  ListOrdered,
  AlertTriangle,
  Play,
} from 'lucide-react';

export default function RunsPage() {
  const toast = useToast();

  const [runs, setRuns] = useState<FlowRunPayload[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [kindFilter, setKindFilter] = useState('ALL');

  // Launch Run Modal state
  const [launchModalOpen, setLaunchModalOpen] = useState(false);
  const [launchInstanceId, setLaunchInstanceId] = useState('');
  const [launchKind, setLaunchKind] = useState<'Backtest' | 'Optimization' | 'WalkForward'>('Backtest');
  const [launchSeed, setLaunchSeed] = useState(42);
  const [launching, setLaunching] = useState(false);

  // Tab: All Runs vs Ranked Runs
  const [activeTab, setActiveTab] = useState<'all' | 'ranking'>('all');
  const [rankedRuns, setRankedRuns] = useState<RankedRunResultPayload[]>([]);
  const [rankingInstanceId, setRankingInstanceId] = useState('');
  const [rankingMetric, setRankingMetric] = useState('SharpeRatio');
  const [loadingRanking, setLoadingRanking] = useState(false);

  async function loadRuns() {
    setLoading(true);
    setError(null);
    try {
      const client = getApiClient();
      const { data: instList } = await client.GET('/api/instances', {});
      if (instList && instList.length > 0) {
        setInstances(instList);
        if (!launchInstanceId) {
          setLaunchInstanceId(instList[0].instanceId);
        }
        if (!rankingInstanceId) {
          setRankingInstanceId(instList[0].instanceId);
        }

        const allRuns: FlowRunPayload[] = [];
        for (const inst of instList) {
          const { data: instRuns } = await client.GET('/api/instances/{instanceId}/runs', {
            params: { path: { instanceId: inst.instanceId } },
          });
          if (instRuns) {
            allRuns.push(...instRuns);
          }
        }
        setRuns(allRuns);
      } else {
        setRuns([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading flow runs from Cloud API.');
    } finally {
      setLoading(false);
    }
  }

  async function loadRanking(instId: string, metric: string) {
    if (!instId) return;
    setLoadingRanking(true);
    try {
      const client = getApiClient();
      const { data, error: err } = await client.GET('/api/instances/{instanceId}/runs/ranking', {
        params: {
          path: { instanceId: instId },
          query: { metric, includeDiverged: true },
        },
      });
      if (data) {
        setRankedRuns(data);
      }
    } catch {
      // ranking fallback
    } finally {
      setLoadingRanking(false);
    }
  }

  useEffect(() => {
    loadRuns();
  }, []);

  useEffect(() => {
    if (activeTab === 'ranking' && rankingInstanceId) {
      loadRanking(rankingInstanceId, rankingMetric);
    }
  }, [activeTab, rankingInstanceId, rankingMetric]);

  async function handleLaunchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!launchInstanceId) {
      toast.error('Missing Engine Instance', 'Select an engine instance to run on.');
      return;
    }

    setLaunching(true);
    try {
      const client = getApiClient();
      const { data, error: err } = await client.POST('/api/runs', {
        body: {
          instanceId: launchInstanceId,
          kind: launchKind,
          baseSeed: Number(launchSeed),
        },
      });

      if (err) {
        toast.error('Launch Failed', 'Backend rejected run initiation.');
      } else if (data) {
        toast.success('Flow Run Initiated', `Launched ${launchKind} run #${formatHash(data.id, 6)}`);
        setLaunchModalOpen(false);
        await loadRuns();
      }
    } catch (e) {
      toast.error('Launch Error', e instanceof Error ? e.message : 'Network communication error.');
    } finally {
      setLaunching(false);
    }
  }

  const filteredRuns = runs.filter((run) => {
    const matchesSearch =
      run.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      run.engineInstanceId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || run.status.toUpperCase() === statusFilter;
    const matchesKind = kindFilter === 'ALL' || run.kind.toUpperCase() === kindFilter.toUpperCase();
    return matchesSearch && matchesStatus && matchesKind;
  });

  const runningCount = runs.filter((r) => r.status === 'Running').length;
  const completedCount = runs.filter((r) => r.status === 'Completed').length;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            <span>Flow Runs & Lineage Control</span>
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Supervise backtests, optimizations, and walk-forward executions across deterministic PRNG seeds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLaunchModalOpen(true)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold rounded-lg text-xs font-mono transition-colors flex items-center gap-2 shadow-lg shadow-cyan-950/20"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Launch Flow Run</span>
          </button>

          <button
            onClick={loadRuns}
            className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 font-mono">
          <span className="text-xs text-zinc-400 uppercase tracking-wider block">Total Executions</span>
          <span className="text-2xl font-bold text-white mt-1 block">{runs.length} runs</span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 font-mono">
          <span className="text-xs text-zinc-400 uppercase tracking-wider block">Actively Running</span>
          <span className="text-2xl font-bold text-cyan-400 mt-1 block flex items-center gap-2">
            <span>{runningCount} runs</span>
            {runningCount > 0 && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 font-mono">
          <span className="text-xs text-zinc-400 uppercase tracking-wider block">Completed Runs</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1 block">{completedCount} runs</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'all'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" />
          <span>All Executions ({runs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ranking')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'ranking'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>Deterministic Run Rankings</span>
        </button>
      </div>

      {/* Tab 1: All Runs Table */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by Run ID or Engine hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">Kind:</span>
                {['ALL', 'Backtest', 'Optimization', 'WalkForward'].map((k) => (
                  <button
                    key={k}
                    onClick={() => setKindFilter(k)}
                    className={`px-2 py-0.5 rounded text-[11px] ${
                      kindFilter === k
                        ? 'bg-zinc-800 text-white font-bold border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 border-l border-zinc-800 pl-3">
                <span className="text-zinc-400">Status:</span>
                {['ALL', 'RUNNING', 'COMPLETED', 'PAUSED', 'FAILED'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2 py-0.5 rounded text-[11px] ${
                      statusFilter === s
                        ? 'bg-zinc-800 text-white font-bold border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading && (
            <div className="py-16 text-center text-sm font-mono text-zinc-400">
              Loading flow runs and execution lineages...
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-mono">
              {error}
            </div>
          )}

          {!loading && !error && filteredRuns.length === 0 && (
            <div className="py-16 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20">
              <Activity className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-zinc-200 font-mono">No Flow Runs Recorded</h3>
              <p className="text-xs text-zinc-400 mt-1">Initiate a backtest or optimization run to populate execution records.</p>
            </div>
          )}

          {!loading && filteredRuns.length > 0 && (
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
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredRuns.map((run) => {
                    const statusBadge = getRunStatusBadge(run.status);
                    const relBadge = getRunRelationBadge(run.relation);
                    return (
                      <tr key={run.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">
                          <Link href={`/reports/${run.id}`} className="hover:text-cyan-400 transition-colors">
                            {formatHash(run.id, 8)}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-zinc-300 font-semibold">{run.kind}</td>
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
                        <td className="px-6 py-4 text-emerald-400 font-bold">
                          {formatCurrency(run.metrics?.netProfit)}
                        </td>
                        <td className="px-6 py-4 text-cyan-300 font-bold">
                          {run.metrics?.sharpeRatio != null ? run.metrics.sharpeRatio.toFixed(2) : '—'}
                        </td>
                        <td className="px-6 py-4 text-zinc-400">{formatTimestamp(run.createdAt)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/runs/${run.id}/lineage`}
                              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-purple-400 text-xs transition-colors flex items-center gap-1"
                              title="Lineage DAG"
                            >
                              <GitBranch className="w-3.5 h-3.5" />
                              <span>Lineage</span>
                            </Link>

                            <Link
                              href={`/reports/${run.id}`}
                              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-400 text-xs transition-colors flex items-center gap-1"
                              title="Performance Report"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Report</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Deterministic Run Rankings */}
      {activeTab === 'ranking' && (
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
      )}

      {/* Modal: Launch Flow Run */}
      {launchModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="launch-modal-title"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 id="launch-modal-title" className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Play className="w-4 h-4 text-cyan-400" />
                <span>Launch New Flow Run</span>
              </h3>
              <button
                onClick={() => setLaunchModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 text-xs font-mono"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleLaunchSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Target Engine Instance</label>
                <select
                  value={launchInstanceId}
                  onChange={(e) => setLaunchInstanceId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  {instances.map((inst) => (
                    <option key={inst.instanceId} value={inst.instanceId}>
                      {inst.name || inst.engineId} ({formatHash(inst.instanceId, 6)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Run Kind</label>
                <select
                  value={launchKind}
                  onChange={(e) => setLaunchKind(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Backtest">Backtest (Historical Simulation)</option>
                  <option value="Optimization">Optimization (Parameter Search)</option>
                  <option value="WalkForward">Walk-Forward (Out-of-sample Window)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Base PRNG Seed</label>
                <input
                  type="number"
                  value={launchSeed}
                  onChange={(e) => setLaunchSeed(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Seed used to initialize deterministic pseudo-random number generator.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setLaunchModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={launching}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-zinc-950 font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{launching ? 'Launching...' : 'Start Execution'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
