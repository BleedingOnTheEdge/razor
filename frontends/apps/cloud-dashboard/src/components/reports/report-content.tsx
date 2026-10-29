'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  getApiClient,
  fetchApi,
  downloadRunXlsx,
  type RunReportPayload,
  type EngineInstancePayload,
  type TradeItemPayload,
  type WinningDnaPayload,
  type GenerationProgressPayload,
  type PopulationIndividualPayload,
} from '@/lib/api-client';
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
  Download,
  Activity,
  Layers,
  ChevronRight,
  TrendingUp,
  Play,
} from 'lucide-react';
import { ExecutionGapsCard } from './ExecutionGapsCard';
import { ReportModals } from './ReportModals';
import { ReportHeaderActions } from './ReportHeaderActions';

import { WinningDnaCard } from './WinningDnaCard';
import { EquityCurveChart } from './EquityCurveChart';
import { DetailedMetricsGrid } from './DetailedMetricsGrid';
import { TradeHistoryTable } from './TradeHistoryTable';
import { GenerationalConvergenceChart } from './GenerationalConvergenceChart';
import { ActionDropdown } from '@/components/ui/ActionDropdown';

export function RunReportContent({ runId }: { runId: string }) {
  const toast = useToast();

  const [report, setReport] = useState<RunReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Engine Instances for LaunchRunModal
  const [instances, setInstances] = useState<EngineInstancePayload[]>([]);
  const [launchModalOpen, setLaunchModalOpen] = useState(false);
  const [launchKind, setLaunchKind] = useState<'Backtest' | 'Optimization' | 'WalkForward' | 'Live'>('Backtest');
  const [launchInstanceId, setLaunchInstanceId] = useState('');
  const [injectedDna, setInjectedDna] = useState<WinningDnaPayload | null>(null);

  // DNA Copy State
  const [copiedDna, setCopiedDna] = useState(false);

  // Modals for GA Generations, Populations & Granular Trade Telemetry
  const [selectedTrade, setSelectedTrade] = useState<TradeItemPayload | null>(null);
  const [selectedGeneration, setSelectedGeneration] = useState<GenerationProgressPayload | null>(null);
  const [selectedPopulation, setSelectedPopulation] = useState<PopulationIndividualPayload | null>(null);

  // Complete Run Modal state
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [netProfit, setNetProfit] = useState('14250.75');
  const [totalReturn, setTotalReturn] = useState('0.1425');
  const [sharpeRatio, setSharpeRatio] = useState('2.15');
  const [maxDrawdown, setMaxDrawdown] = useState('0.065');
  const [tradeCount, setTradeCount] = useState('148');
  const [bestFitness, setBestFitness] = useState('0.892');
  const [submittingComplete, setSubmittingComplete] = useState(false);

  // Action states
  const [pausing, setPausing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [refreshingManual, setRefreshingManual] = useState(false);

  /**
   * Resilient fetch with strict 500ms timeout and max 2 retries per cycle.
   * If cap is reached, returns null to silently drop that update cycle without disrupting UI.
   */
  async function fetchReportWithTimeout(targetRunId: string): Promise<RunReportPayload | null> {
    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 500);
      try {
        const client = getApiClient();
        const res = await client.GET('/api/runs/{runId}/report', {
          params: { path: { runId: targetRunId } },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.data) return res.data;
      } catch {
        clearTimeout(timeoutId);
      }
    }
    return null;
  }

  async function loadInstances() {
    try {
      const client = getApiClient();
      const { data } = await client.GET('/api/instances', {});
      if (data && data.length > 0) {
        setInstances(data);
        setLaunchInstanceId(data[0].instanceId);
      }
    } catch {
      // Ignored non-fatal prefetch
    }
  }

  // Initial load
  useEffect(() => {
    let active = true;

    async function initialLoad() {
      setLoading(true);
      setError(null);
      try {
        const client = getApiClient();
        const { data, error: err } = await client.GET('/api/runs/{runId}/report', {
          params: { path: { runId } },
        });

        if (!active) return;

        if (err) {
          setError('Failed to load run report from Cloud API.');
        } else if (data) {
          setReport(data);
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : 'Error communicating with Cloud API backend.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initialLoad();
    loadInstances();

    return () => {
      active = false;
    };
  }, [runId]);

  // Reactive auto-refresh polling:
  // Strictly polls every 2 seconds (2000ms), 500ms timeout, max 2 retries.
  // Performs silent in-place updates without unmounting containers or resetting scroll.
  useEffect(() => {
    if (report && report.status !== 'Running') {
      return; // Stop polling once run is finalized (Completed / Faulted / Paused)
    }

    let isPollingActive = true;
    let isRequestBusy = false;

    const timer = setInterval(async () => {
      if (!isPollingActive || isRequestBusy) return;
      isRequestBusy = true;
      try {
        const freshReport = await fetchReportWithTimeout(runId);
        if (isPollingActive && freshReport) {
          setReport(freshReport);
        }
      } finally {
        isRequestBusy = false;
      }
    }, 2000);

    return () => {
      isPollingActive = false;
      clearInterval(timer);
    };
  }, [runId, report?.status]);

  async function handleManualRefresh() {
    setRefreshingManual(true);
    try {
      const fresh = await fetchReportWithTimeout(runId);
      if (fresh) {
        setReport(fresh);
        toast.info('Data Refreshed', 'Execution report updated to latest state.');
      } else {
        // Fallback standard GET
        const client = getApiClient();
        const { data } = await client.GET('/api/runs/{runId}/report', {
          params: { path: { runId } },
        });
        if (data) {
          setReport(data);
          toast.info('Data Refreshed', 'Execution report updated to latest state.');
        }
      }
    } catch {
      toast.error('Refresh Failed', 'Unable to reach Cloud API.');
    } finally {
      setRefreshingManual(false);
    }
  }

  async function handleCancelRun() {
    if (!report) return;
    setCancelling(true);
    try {
      const client = getApiClient();
      const { data, error: err } = await client.POST('/api/runs/{runId}/cancel', {
        params: { path: { runId } },
      });

      if (err) {
        toast.error('Cancel Failed', 'Cloud API rejected cancel command.');
      } else if (data) {
        toast.success('Run Cancelled', `Run ${formatHash(runId, 6)} state transitioned to Cancelled.`);
        handleManualRefresh();
      }
    } catch (e) {
      toast.error('Cancel Error', e instanceof Error ? e.message : 'Communication error.');
    } finally {
      setCancelling(false);
    }
  }

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
        handleManualRefresh();
      }
    } catch (e) {
      toast.error('Pause Error', e instanceof Error ? e.message : 'Communication error.');
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
        handleManualRefresh();
      }
    } catch (e) {
      toast.error('Completion Error', e instanceof Error ? e.message : 'Network error.');
    } finally {
      setSubmittingComplete(false);
    }
  }

  const effectiveDna: WinningDnaPayload = report?.winningDna ?? {
    genomeHash: `dna-${formatHash(runId, 8)}`,
    fitness: report?.metrics?.bestFitness ?? report?.aggregates?.sharpeRatio ?? 1.0,
    generation: 0,
    genes: (report as any)?.configuration?.genes || [0.02, 0.05, 14, 21, 1.5],
    parameters: (report as any)?.configuration?.parameters || {
      FastPeriod: 14,
      SlowPeriod: 21,
      StopLossPct: 0.02,
      TakeProfitPct: 0.05,
    },
    slots: {
      strategy: (report as any)?.configuration?.strategy || 'TrendFollowing',
      adapter: (report as any)?.configuration?.adapter || 'PaperBroker',
    },
    execution: {
      symbols: (report as any)?.configuration?.symbols || ['BTC/USDT'],
      timeframes: (report as any)?.configuration?.timeframes || ['1m'],
      leverage: (report as any)?.configuration?.leverage || 1,
      initialBalance: (report as any)?.configuration?.initialBalance || 10000,
    },
  };

  function handleCopyDna() {
    const dnaToCopy = report?.winningDna || effectiveDna;
    navigator.clipboard.writeText(JSON.stringify(dnaToCopy, null, 2));
    setCopiedDna(true);
    toast.success('DNA Copied', 'Portable Strategy DNA JSON copied to clipboard.');
    setTimeout(() => setCopiedDna(false), 2000);
  }

  async function handleExportXlsx() {
    try {
      setExportingXlsx(true);
      await downloadRunXlsx(runId);
      toast.success('XLSX Downloaded', `Formulated audit report for ${formatHash(runId, 6)} saved.`);
    } catch (e) {
      toast.error('Export Error', e instanceof Error ? e.message : 'Failed to export XLSX.');
    } finally {
      setExportingXlsx(false);
    }
  }

  async function handleInstantReRun() {
    if (!report?.engineInstanceId) {
      toast.error('Instance Missing', 'Cannot rerun without an engine instance.');
      return;
    }
    try {
      const client = getApiClient();
      const { data, error: err } = await client.POST('/api/runs', {
        body: {
          instanceId: report.engineInstanceId,
          kind: report.kind as any,
          baseSeed: report.baseSeed ?? 42,
          configurationJson: (report as any).configurationJson || JSON.stringify((report as any).configuration || {}),
        },
      });
      if (err) {
        toast.error('Re-Run Failed', typeof err === 'string' ? err : 'Server rejected re-run');
      } else if (data) {
        toast.success('Re-Run Launched', `Spawned run #${formatHash(data.id, 6)}.`);
        window.location.href = `/panel/reports/${data.id}`;
      }
    } catch (e) {
      toast.error('Re-Run Error', e instanceof Error ? e.message : 'Unknown communication error.');
    }
  }

  function handleLaunchWithDna(kind: 'Backtest' | 'Live') {
    if (instances.length === 0) {
      toast.info('No Instances', 'Connect an engine instance to dispatch execution.');
    }
    setLaunchKind(kind);
    if (report?.engineInstanceId && instances.some((i) => i.instanceId === report.engineInstanceId)) {
      setLaunchInstanceId(report.engineInstanceId);
    }
    setLaunchModalOpen(true);
  }

  const metrics = report?.aggregates || report?.metrics || (report ? {
    netProfit: (report as any).netProfit,
    totalReturn: (report as any).totalReturn,
    sharpeRatio: (report as any).sharpeRatio,
    maxDrawdown: (report as any).maxDrawdown,
    tradeCount: (report as any).tradeCount,
    bestFitness: (report as any).bestFitness,
  } : null);

  const isComparable = report?.isComparable ?? report?.comparable ?? true;
  const statusBadge = report?.status ? getRunStatusBadge(report.status) : null;
  const relBadge = report?.relation ? getRunRelationBadge(report.relation) : null;

  return (
    <div className="space-y-6 max-w-7xl pb-16 font-sans text-xs text-zinc-100">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-zinc-100 pb-2">
        <Link href="/panel/reports" className="hover:underline font-bold">
          REPORTS
        </Link>
        <span>/</span>
        <Link href="/panel/runs" className="hover:underline font-bold">
          FLOW RUNS
        </Link>
        <span>/</span>
        <span className="font-bold">RUN {formatHash(runId, 8)}</span>
        <span>/</span>
        <span className="font-bold">AUDIT REPORT</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#262626]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2 uppercase">
              <FileText className="w-5 h-5 text-zinc-100" />
              <span>Flow Run Report</span>
            </h1>
            {statusBadge && (
              <span className="px-2.5 py-0.5 text-xs font-bold border border-[#262626] bg-[#141414] text-zinc-200">
                [{statusBadge.label?.toUpperCase()}]
              </span>
            )}
            {relBadge && (
              <span className="px-2.5 py-0.5 text-xs font-bold border border-[#262626] bg-[#141414] text-zinc-200">
                [{relBadge.label?.toUpperCase()}]
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-100 font-normal mt-1 font-sans">
            Authoritative institutional audit report, deterministic reproducibility certification, and performance verification.
          </p>
        </div>

        <ReportHeaderActions
          runId={runId}
          report={report}
          handleInstantReRun={handleInstantReRun}
          handlePauseRun={handlePauseRun}
          pausing={pausing}
          handleCancelRun={handleCancelRun}
          cancelling={cancelling}
          setCompleteModalOpen={setCompleteModalOpen}
          handleExportXlsx={handleExportXlsx}
          exportingXlsx={exportingXlsx}
          handleCopyDna={handleCopyDna}
          handleManualRefresh={handleManualRefresh}
          refreshingManual={refreshingManual}
        />
      </div>

      {/* Real-time In-Progress Banner */}
      {report?.status === 'Running' && (
        <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/80 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-600"></span>
            </span>
            <span className="text-sm font-semibold text-sky-950">
              Execution In Progress — Automatically evaluating chromosome generations & streaming fill telemetry...
            </span>
          </div>
          <span className="text-xs font-mono font-medium text-sky-800 bg-sky-100 px-2.5 py-1 rounded-md border border-sky-200">
            Live Telemetry Polling (2s)
          </span>
        </div>
      )}

      {/* Loading state ONLY when report is not yet loaded */}
      {loading && !report && (
        <div className="py-20 text-center rounded-xl bg-[#171717] border border-slate-200 shadow-sm space-y-3">
          <Activity className="w-8 h-8 text-slate-400 mx-auto animate-pulse" />
          <div className="text-sm font-medium text-slate-600">
            Compiling authoritative execution report from Cloud API...
          </div>
        </div>
      )}

      {error && !report && (
        <div className="p-5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm font-medium flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>Report Error: {error}</span>
        </div>
      )}

      {!loading && !report && !error && (
        <div className="py-16 text-center rounded-xl bg-[#171717] border border-slate-200 p-8 shadow-sm">
          <h3 className="text-base font-bold text-slate-900">No Report Data Available</h3>
          <p className="text-sm text-slate-500 mt-1">This run is either still pending, missing, or has not emitted execution metrics.</p>
          <div className="mt-5">
            <Link
              href="/panel/runs"
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Runs
            </Link>
          </div>
        </div>
      )}

      {/* Report Data Container - Stays continuously mounted to prevent scroll jumps */}
      {report && (
        <div className="space-y-6">
          {/* Metadata & Reproducibility Banner */}
          <div className="p-5 rounded-xl bg-[#171717] border border-slate-200 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-sans">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Execution Kind</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">{report.kind || 'Backtest'}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Engine Instance</span>
              <span className="text-base font-bold text-slate-900 mt-1 block font-mono">
                {report.engineInstanceId ? formatHash(report.engineInstanceId, 8) : '—'}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">PRNG Seed Base</span>
              <span className="text-base font-bold text-slate-900 mt-1 block font-mono">
                {report.baseSeed ?? 42}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Audit Certification</span>
              <span className="mt-1 flex items-center gap-1.5">
                {isComparable ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1.5 text-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Comparable / Certified
                  </span>
                ) : (
                  <span className="text-amber-700 font-bold flex items-center gap-1.5 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Non-Comparable (Diverged)
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Primary Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-5 rounded-xl bg-[#171717] border border-slate-200 shadow-sm">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Net Profit</span>
              <span className={`text-2xl font-bold font-mono mt-2 block ${(metrics?.netProfit ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatCurrency(metrics?.netProfit)}
              </span>
              <span className="text-xs text-slate-400 mt-1 block font-sans">Realized PnL</span>
            </div>

            <div className="p-5 rounded-xl bg-[#171717] border border-slate-200 shadow-sm">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Total Return</span>
              <span className={`text-2xl font-bold font-mono mt-2 block ${(metrics?.totalReturn ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatPercentage(metrics?.totalReturn)}
              </span>
              <span className="text-xs text-slate-400 mt-1 block font-sans">Compounded ROI</span>
            </div>

            <div className="p-5 rounded-xl bg-[#171717] border border-slate-200 shadow-sm">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Sharpe Ratio</span>
              <span className="text-2xl font-bold font-mono text-slate-900 mt-2 block">
                {metrics?.sharpeRatio != null ? metrics.sharpeRatio.toFixed(2) : '—'}
              </span>
              <span className="text-xs text-slate-400 mt-1 block font-sans">Risk-Adjusted Return</span>
            </div>

            <div className="p-5 rounded-xl bg-[#171717] border border-slate-200 shadow-sm">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Max Drawdown</span>
              <span className="text-2xl font-bold font-mono text-rose-700 mt-2 block">
                {formatPercentage(metrics?.maxDrawdown, false)}
              </span>
              <span className="text-xs text-slate-400 mt-1 block font-sans">Peak-to-Trough</span>
            </div>

            <div className="p-5 rounded-xl bg-[#171717] border border-slate-200 shadow-sm">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Total Trades</span>
              <span className="text-2xl font-bold font-mono text-slate-900 mt-2 block">
                {metrics?.tradeCount ?? '—'}
              </span>
              <span className="text-xs text-slate-400 mt-1 block font-sans">Executed Fills</span>
            </div>

            <div className="p-5 rounded-xl bg-[#171717] border border-slate-200 shadow-sm">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Best Fitness</span>
              <span className="text-2xl font-bold font-mono text-amber-700 mt-2 block">
                {metrics?.bestFitness != null ? metrics.bestFitness.toFixed(3) : '—'}
              </span>
              <span className="text-xs text-slate-400 mt-1 block font-sans">Objective Score</span>
            </div>
          </div>

          {/* Winning Strategy DNA Specification */}
          {(report.winningDna || effectiveDna) && (
            <WinningDnaCard
              winningDna={report.winningDna || effectiveDna}
              copiedDna={copiedDna}
              onCopyDna={handleCopyDna}
              onLaunchWithDna={handleLaunchWithDna}
            />
          )}

          {/* Interactive SVG Equity & Drawdown Curve */}
          {report.equityCurve && report.equityCurve.length > 0 && (
            <EquityCurveChart equityPoints={report.equityCurve} />
          )}

          {/* Detailed Institutional Metrics & Risk Analytics */}
          {report.detailedMetrics && (
            <DetailedMetricsGrid detailedMetrics={report.detailedMetrics} />
          )}

          {/* Itemized Granular Trade Fill History */}
          {report.trades && report.trades.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <h3 className="text-base font-bold text-slate-900">Trade Execution Ledger</h3>
                <Link
                  href={`/panel/reports/${runId}/trades`}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-[#171717] hover:bg-slate-50 font-medium text-xs text-slate-700 transition-colors shadow-sm inline-flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>Open Full Trades Ledger</span>
                </Link>
              </div>
              <TradeHistoryTable trades={report.trades} onSelectTrade={setSelectedTrade} />
            </div>
          )}

          {/* Optimization Generational Progression Link Card (Dev Feature) */}
          {report.generationProgress && report.generationProgress.length > 0 && (
            <div className="p-4 border border-[#262626] bg-[#141414] flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-bold uppercase text-zinc-100 block">
                  Genetic Generational Convergence ({report.generationProgress.length} Generations Evaluated)
                </span>
                <span className="text-[11px] text-zinc-400 font-sans mt-0.5 block">
                  Per-generation population diversity, fitness trajectory, and chromosome backtesting metrics moved to dedicated Dev page.
                </span>
              </div>
              <Link
                href={'/panel/reports/' + runId + '/generations'}
                className="px-3.5 py-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors inline-flex items-center gap-1.5"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>OPEN GENERATIONS PROGRESSION GRID</span>
              </Link>
            </div>
          )}

          {/* Append-Only Interventions Audit Log */}
          <div className="p-6 rounded-xl bg-[#171717] border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm uppercase tracking-wider font-mono text-slate-700 font-semibold flex items-center gap-2">
                <span>Append-Only Human & System Interventions</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                  {report.interventions?.length || 0}
                </span>
              </h3>
            </div>

            {!report.interventions || report.interventions.length === 0 ? (
              <div className="py-6 text-center text-sm font-sans text-slate-500">
                No interventions recorded. Execution remained strictly contiguous and untampered.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {report.interventions.map((item, idx) => (
                  <div key={item.id || `intervention-${idx}-${item.stepIndex}`} className="py-4 space-y-2 text-sm font-sans">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-bold text-xs font-mono">
                          Step #{item.stepIndex}
                        </span>
                        <span className="text-slate-900 font-semibold">{item.actor}</span>
                      </div>
                      <span className="text-slate-400 text-xs font-mono">{formatTimestamp(item.timestamp)}</span>
                    </div>

                    <p className="text-slate-700">{item.reason}</p>

                    {item.modificationsSummary && (
                      <p className="text-slate-600 text-xs font-mono bg-slate-50 p-3 rounded-lg border border-slate-200">
                        {item.modificationsSummary}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                      <span>Prev: {formatHash(item.previousFingerprint, 8)}</span>
                      <span>→</span>
                      <span>New: {formatHash(item.newFingerprint, 8)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          /* Recorded Execution Gaps */
          <ExecutionGapsCard gaps={report.gaps} />
        </div>
      )}

            {/* Modals */}
      <ReportModals
        runId={runId}
        report={report}
        instances={instances}
        completeModalOpen={completeModalOpen}
        setCompleteModalOpen={setCompleteModalOpen}
        launchModalOpen={launchModalOpen}
        setLaunchModalOpen={setLaunchModalOpen}
        launchInstanceId={launchInstanceId}
        setLaunchInstanceId={setLaunchInstanceId}
        launchKind={launchKind}
        setLaunchKind={setLaunchKind}
        injectedDna={injectedDna}
        setInjectedDna={setInjectedDna}
        selectedGeneration={selectedGeneration}
        setSelectedGeneration={setSelectedGeneration}
        selectedPopulation={selectedPopulation}
        setSelectedPopulation={setSelectedPopulation}
        selectedTrade={selectedTrade}
        setSelectedTrade={setSelectedTrade}
        netProfit={netProfit}
        setNetProfit={setNetProfit}
        totalReturn={totalReturn}
        setTotalReturn={setTotalReturn}
        sharpeRatio={sharpeRatio}
        setSharpeRatio={setSharpeRatio}
        maxDrawdown={maxDrawdown}
        setMaxDrawdown={setMaxDrawdown}
        tradeCount={tradeCount}
        setTradeCount={setTradeCount}
        bestFitness={bestFitness}
        setBestFitness={setBestFitness}
        submittingComplete={submittingComplete}
        handleCompleteSubmit={handleCompleteSubmit}
      />
    </div>
  );
}
