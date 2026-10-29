'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getApiClient, type FlowRunPayload, type RankedRunResultPayload, type EngineInstancePayload } from '@/lib/api-client';
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
  Play,
  GitBranch,
  FileText,
  Search,
  Trophy,
  ListOrdered,
  Eye,
} from 'lucide-react';
import { LaunchRunModal } from '@/components/runs/LaunchRunModal';
import { RankedRunsTable } from '@/components/runs/RankedRunsTable';

export default function RunsPage() {
  const toast = useToast();
  const router = useRouter();

  const [runs, setRuns] = useState<FlowRunPayload[]>([]);
  const [instances, setInstances] = useState<EngineInstancePayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [kindFilter, setKindFilter] = useState('ALL');

  // Launch Run Modal state
  const [launchModalOpen, setLaunchModalOpen] = useState(false);
  const [launchInstanceId, setLaunchInstanceId] = useState('');
  const [launchKind, setLaunchKind] = useState<'Backtest' | 'Optimization' | 'WalkForward' | 'Live'>('Backtest');
  const [launchSeed, setLaunchSeed] = useState(42);

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
        if (!launchInstanceId) setLaunchInstanceId(instList[0].instanceId);
        if (!rankingInstanceId) setRankingInstanceId(instList[0].instanceId);

        const allRuns: FlowRunPayload[] = [];
        for (const inst of instList) {
          const { data: instRuns } = await client.GET('/api/instances/{instanceId}/runs', {
            params: { path: { instanceId: inst.instanceId } },
          });
          if (instRuns) allRuns.push(...instRuns);
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
      const { data } = await client.GET('/api/instances/{instanceId}/runs/ranking', {
        params: {
          path: { instanceId: instId },
          query: { metric, includeDiverged: true },
        },
      });
      if (data) setRankedRuns(data);
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
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-600" />
            <span>Flow Runs & Lineage Control</span>
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Supervise deterministic executions, inspect active slot parameters, and track live flow telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLaunchModalOpen(true)}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-lg text-xs font-mono transition-colors flex items-center gap-2 shadow-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Launch Flow Run</span>
          </button>

          <button
            onClick={loadRuns}
            className="px-3 py-2 rounded-lg bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-mono text-zinc-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-zinc-200 font-mono shadow-sm">
          <span className="text-xs text-zinc-500 uppercase tracking-wider block">Total Executions</span>
          <span className="text-2xl font-bold text-zinc-900 mt-1 block">{runs.length} runs</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-zinc-200 font-mono shadow-sm">
          <span className="text-xs text-zinc-500 uppercase tracking-wider block">Actively Running</span>
          <span className="text-2xl font-bold text-cyan-700 mt-1 block flex items-center gap-2">
            <span>{runningCount} runs</span>
            {runningCount > 0 && <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-zinc-200 font-mono shadow-sm">
          <span className="text-xs text-zinc-500 uppercase tracking-wider block">Completed Runs</span>
          <span className="text-2xl font-bold text-emerald-700 mt-1 block">{completedCount} runs</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'all'
              ? 'bg-zinc-200 text-zinc-900'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" />
          <span>All Executions ({runs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ranking')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'ranking'
              ? 'bg-zinc-200 text-zinc-900'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>Deterministic Run Rankings</span>
        </button>
      </div>

      {/* Tab 1: All Runs Table */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white border border-zinc-200 shadow-sm">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by Run ID or Engine hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-cyan-500 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">Kind:</span>
                {['ALL', 'Backtest', 'Optimization', 'WalkForward', 'Live'].map((k) => (
                  <button
                    key={k}
                    onClick={() => setKindFilter(k)}
                    className={`px-2 py-0.5 rounded text-[11px] ${
                      kindFilter === k
                        ? 'bg-zinc-900 text-white font-semibold'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 border-l border-zinc-200 pl-3">
                <span className="text-zinc-500">Status:</span>
                {['ALL', 'RUNNING', 'COMPLETED', 'PAUSED', 'FAILED'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2 py-0.5 rounded text-[11px] ${
                      statusFilter === s
                        ? 'bg-zinc-900 text-white font-semibold'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading && (
            <div className="py-16 text-center text-sm font-mono text-zinc-500">
              Loading flow runs and execution lineages...
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-mono">
              {error}
            </div>
          )}

          {!loading && !error && filteredRuns.length === 0 && (
            <div className="py-16 text-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50">
              <Activity className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-zinc-800 font-mono">No Flow Runs Recorded</h3>
              <p className="text-xs text-zinc-500 mt-1">Initiate a backtest or optimization run to populate execution records.</p>
            </div>
          )}

          {!loading && filteredRuns.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-50 text-zinc-600 uppercase tracking-wider border-b border-zinc-200">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Run ID</th>
                    <th className="px-5 py-3 font-semibold">Kind</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Relation</th>
                    <th className="px-5 py-3 font-semibold">Net Profit</th>
                    <th className="px-5 py-3 font-semibold">Sharpe</th>
                    <th className="px-5 py-3 font-semibold">Created</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredRuns.map((run) => {
                    const statusBadge = getRunStatusBadge(run.status);
                    const relBadge = getRunRelationBadge(run.relation);
                    const isRunning = run.status.toUpperCase() === 'RUNNING';
                    return (
                      <tr key={run.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-zinc-900">
                          <Link href={`/runs/${run.id}`} className="hover:text-cyan-700 transition-colors flex items-center gap-1.5">
                            {isRunning && <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />}
                            <span>{formatHash(run.id, 8)}</span>
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-zinc-800 font-medium">{run.kind}</td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusBadge.className}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${relBadge.className}`}>
                            {relBadge.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-emerald-700 font-bold">
                          {formatCurrency(run.metrics?.netProfit ?? (run as any).netProfit)}
                        </td>
                        <td className="px-5 py-3.5 text-cyan-800 font-bold">
                          {(run.metrics?.sharpeRatio ?? (run as any).sharpeRatio) != null ? (run.metrics?.sharpeRatio ?? (run as any).sharpeRatio).toFixed(2) : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-zinc-500">{formatTimestamp(run.createdAt)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/runs/${run.id}`}
                              className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-white text-xs transition-colors flex items-center gap-1 font-sans font-medium"
                              title="Live Monitor & Specifications"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Monitor</span>
                            </Link>

                            <Link
                              href={`/runs/${run.id}/lineage`}
                              className="px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-purple-700 text-xs transition-colors flex items-center gap-1 font-sans"
                              title="Lineage DAG"
                            >
                              <GitBranch className="w-3.5 h-3.5" />
                              <span>DAG</span>
                            </Link>

                            <Link
                              href={`/reports/${run.id}`}
                              className="px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-cyan-700 text-xs transition-colors flex items-center gap-1 font-sans"
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
        <RankedRunsTable
          instances={instances}
          rankingInstanceId={rankingInstanceId}
          setRankingInstanceId={setRankingInstanceId}
          rankingMetric={rankingMetric}
          setRankingMetric={setRankingMetric}
          loadingRanking={loadingRanking}
          rankedRuns={rankedRuns}
        />
      )}

      {/* Modal: Launch Flow Run */}
      <LaunchRunModal
        isOpen={launchModalOpen}
        onClose={() => setLaunchModalOpen(false)}
        instances={instances}
        launchInstanceId={launchInstanceId}
        setLaunchInstanceId={setLaunchInstanceId}
        launchKind={launchKind}
        setLaunchKind={setLaunchKind}
        launchSeed={launchSeed}
        setLaunchSeed={setLaunchSeed}
        onRunLaunched={(newRun) => {
          loadRuns();
          router.push(`/runs/${newRun.id}`);
        }}
      />
    </div>
  );
}
