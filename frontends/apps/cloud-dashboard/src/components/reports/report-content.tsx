'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiClient, type RunReportPayload } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import {
  getRunStatusBadge,
  getRunRelationBadge,
  formatCurrency,
  formatPercentage,
  formatTimestamp,
  formatHash,
} from '@razor/ui-kit';
import {
  FileText,
  ArrowLeft,
  RefreshCw,
  GitBranch,
  Pause,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

export function RunReportContent({ runId }: { runId: string }) {
  const toast = useToast();

  const [report, setReport] = useState<RunReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Complete Run Modal state
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [netProfit, setNetProfit] = useState('14250.75');
  const [totalReturn, setTotalReturn] = useState('0.1425');
  const [sharpeRatio, setSharpeRatio] = useState('2.15');
  const [maxDrawdown, setMaxDrawdown] = useState('0.065');
  const [tradeCount, setTradeCount] = useState('148');
  const [bestFitness, setBestFitness] = useState('0.892');
  const [submittingComplete, setSubmittingComplete] = useState(false);

  // Pause action state
  const [pausing, setPausing] = useState(false);

  async function loadReport() {
    setLoading(true);
    setError(null);
    try {
      const client = getApiClient();
      const { data, error: err } = await client.GET('/api/runs/{runId}/report', {
        params: { path: { runId } },
      });

      if (err) {
        setError('Failed to load run report from Cloud API.');
      } else if (data) {
        setReport(data);
      }
    } catch (e: any) {
      setError(e?.message || 'Error communicating with Cloud API backend.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [runId]);

  async function handlePauseRun() {
    if (!report) return;
    setPausing(true);
    try {
      const client = getApiClient();
      const { data, error: err } = await client.POST('/api/runs/{runId}/pause', {
        params: { path: { runId } },
      });

      if (err) {
        toast.error('Pause Failed', 'Cloud API rejected pause command.');
      } else if (data) {
        toast.success('Run Paused', `Run ${formatHash(runId, 6)} state transitioned to Paused.`);
        await loadReport();
      }
    } catch (e: any) {
      toast.error('Pause Error', e?.message || 'Communication error.');
    } finally {
      setPausing(false);
    }
  }

  async function handleCompleteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingComplete(true);
    try {
      const client = getApiClient();
      const { data, error: err } = await client.POST('/api/runs/{runId}/complete', {
        params: { path: { runId } },
        body: {
          netProfit: Number(netProfit),
          totalReturn: Number(totalReturn),
          sharpeRatio: Number(sharpeRatio),
          maxDrawdown: Number(maxDrawdown),
          tradeCount: Number(tradeCount),
          bestFitness: Number(bestFitness),
        },
      });

      if (err) {
        toast.error('Completion Failed', 'Cloud API rejected the completion payload.');
      } else if (data) {
        toast.success('Run Completed', `Run ${formatHash(runId, 6)} marked Completed with audited metrics.`);
        setCompleteModalOpen(false);
        await loadReport();
      }
    } catch (e: any) {
      toast.error('Completion Error', e?.message || 'Network error.');
    } finally {
      setSubmittingComplete(false);
    }
  }

  const statusBadge = report ? getRunStatusBadge(report.status) : null;
  const relBadge = report ? getRunRelationBadge(report.relation) : null;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
        <Link href="/runs" className="hover:text-zinc-200 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Runs</span>
        </Link>
        <span>/</span>
        <span className="text-zinc-300">Run {formatHash(runId, 6)}</span>
        <span>/</span>
        <span className="text-cyan-400">Performance & Audit Report</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-cyan-400" />
              <span>Flow Run Report</span>
            </h2>
            {statusBadge && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
            )}
            {relBadge && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium ${relBadge.className}`}>
                {relBadge.label}
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-400 mt-1 font-sans">
            Authoritative institutional execution report, deterministic reproducibility certification, and intervention audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {report && (
            <>
              {report.status === 'Running' && (
                <button
                  onClick={handlePauseRun}
                  disabled={pausing}
                  className="px-3 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 text-xs font-mono transition-colors flex items-center gap-1.5"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>{pausing ? 'Pausing...' : 'Pause Run'}</span>
                </button>
              )}

              {report.status !== 'Completed' && (
                <button
                  onClick={() => setCompleteModalOpen(true)}
                  className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs font-mono transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Complete Run</span>
                </button>
              )}

              <Link
                href={`/runs/${runId}/lineage`}
                className="px-3 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-mono transition-colors flex items-center gap-1.5"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Lineage Tree</span>
              </Link>
            </>
          )}

          <button
            onClick={loadReport}
            className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-16 text-center text-sm font-mono text-zinc-400">
          Compiling execution report from Cloud API...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-mono">
          {error}
        </div>
      )}

      {!loading && report && (
        <div className="space-y-6">
          {/* Metadata & Reproducibility Banner */}
          <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-zinc-400 block">Execution Kind</span>
              <span className="text-sm font-bold text-white mt-1 block">{report.kind}</span>
            </div>
            <div>
              <span className="text-zinc-400 block">Engine Instance</span>
              <span className="text-sm font-bold text-white mt-1 block font-mono">
                {formatHash(report.engineInstanceId, 8)}
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block">PRNG Seed Base</span>
              <span className="text-sm font-bold text-white mt-1 block font-mono">
                {report.baseSeed ?? '—'}
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block">Audit Certification</span>
              <span className="mt-1 flex items-center gap-1.5">
                {report.comparable ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    Comparable / Certified
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    Non-Comparable (Diverged)
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Primary Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <span className="text-xs font-mono text-zinc-400 block">Net Profit</span>
              <span className="text-2xl font-bold text-emerald-400 mt-2 block font-mono">
                {formatCurrency(report.metrics?.netProfit)}
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 block font-mono">Realized PnL</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <span className="text-xs font-mono text-zinc-400 block">Total Return</span>
              <span className="text-2xl font-bold text-white mt-2 block font-mono">
                {formatPercentage(report.metrics?.totalReturn)}
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 block font-mono">Compounded ROI</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <span className="text-xs font-mono text-zinc-400 block">Sharpe Ratio</span>
              <span className="text-2xl font-bold text-cyan-400 mt-2 block font-mono">
                {report.metrics?.sharpeRatio != null ? report.metrics.sharpeRatio.toFixed(2) : '—'}
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 block font-mono">Risk-Adjusted</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <span className="text-xs font-mono text-zinc-400 block">Max Drawdown</span>
              <span className="text-2xl font-bold text-rose-400 mt-2 block font-mono">
                {formatPercentage(report.metrics?.maxDrawdown, false)}
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 block font-mono">Peak-to-Trough</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <span className="text-xs font-mono text-zinc-400 block">Total Trades</span>
              <span className="text-2xl font-bold text-white mt-2 block font-mono">
                {report.metrics?.tradeCount ?? '—'}
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 block font-mono">Executed Fills</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <span className="text-xs font-mono text-zinc-400 block">Best Fitness</span>
              <span className="text-2xl font-bold text-amber-400 mt-2 block font-mono">
                {report.metrics?.bestFitness != null ? report.metrics.bestFitness.toFixed(3) : '—'}
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 block font-mono">Objective Score</span>
            </div>
          </div>

          {/* Append-Only Interventions Audit Log */}
          <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-wider font-mono text-zinc-200 font-semibold flex items-center gap-2">
                <span>Append-Only Human & System Interventions</span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px]">
                  {report.interventions?.length || 0}
                </span>
              </h3>
            </div>

            {!report.interventions || report.interventions.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-zinc-400">
                No interventions recorded. Execution remained strictly contiguous and untampered.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {report.interventions.map((item) => (
                  <div key={item.id} className="py-4 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-bold">
                          Step #{item.stepIndex}
                        </span>
                        <span className="text-zinc-200 font-semibold">{item.actor}</span>
                      </div>
                      <span className="text-zinc-400">{formatTimestamp(item.timestamp)}</span>
                    </div>

                    <p className="text-zinc-300 font-sans">{item.reason}</p>

                    {item.modificationsSummary && (
                      <p className="text-zinc-400 text-[11px] bg-zinc-950/60 p-2 rounded border border-zinc-800/40">
                        {item.modificationsSummary}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-[11px] text-zinc-400">
                      <span>Prev: {formatHash(item.previousFingerprint, 8)}</span>
                      <span>→</span>
                      <span>New: {formatHash(item.newFingerprint, 8)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recorded Execution Gaps */}
          <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-wider font-mono text-zinc-200 font-semibold flex items-center gap-2">
                <span>Recorded Execution Gaps</span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px]">
                  {report.gaps?.length || 0}
                </span>
              </h3>
            </div>

            {!report.gaps || report.gaps.length === 0 ? (
              <div className="py-6 text-center text-xs font-mono text-zinc-400">
                No execution gaps detected. Run executed in full contiguity.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {report.gaps.map((gap) => (
                  <div key={gap.id} className="py-3 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300">
                        Steps {gap.startStep} – {gap.endStep}
                      </span>
                      <span className="text-zinc-300 font-sans">{gap.reason}</span>
                    </div>
                    <span className="text-zinc-400">{formatTimestamp(gap.recordedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Complete Run Modal */}
      {completeModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="complete-modal-title"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 id="complete-modal-title" className="text-base font-bold text-white font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Submit Final Run Metrics</span>
              </h3>
              <button
                onClick={() => setCompleteModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 text-xs font-mono"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1 font-semibold">Net Profit ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={netProfit}
                    onChange={(e) => setNetProfit(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 mb-1 font-semibold">Total Return (Ratio)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={totalReturn}
                    onChange={(e) => setTotalReturn(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1 font-semibold">Sharpe Ratio</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sharpeRatio}
                    onChange={(e) => setSharpeRatio(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 mb-1 font-semibold">Max Drawdown (Ratio)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={maxDrawdown}
                    onChange={(e) => setMaxDrawdown(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1 font-semibold">Trade Count</label>
                  <input
                    type="number"
                    value={tradeCount}
                    onChange={(e) => setTradeCount(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 mb-1 font-semibold">Best Fitness</label>
                  <input
                    type="number"
                    step="0.001"
                    value={bestFitness}
                    onChange={(e) => setBestFitness(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCompleteModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingComplete}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-zinc-950 font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{submittingComplete ? 'Completing...' : 'Confirm & Complete Run'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
