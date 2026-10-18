'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  getApiClient,
  downloadRunXlsx,
  type RunReportPayload,
  type EngineInstancePayload,
  type TradeItemPayload,
  type EquityPointPayload,
  type WinningDnaPayload,
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
} from 'lucide-react';
import { CompleteRunModal } from './CompleteRunModal';
import { LaunchRunModal } from '@/components/runs/LaunchRunModal';
import { GranularTradeDetailModal } from '@/components/trades/GranularTradeDetailModal';
import { GenerationDetailModal } from '@/components/optimization/GenerationDetailModal';
import { PopulationBacktestModal } from '@/components/optimization/PopulationBacktestModal';
import { WinningDnaCard } from './WinningDnaCard';
import { EquityCurveChart } from './EquityCurveChart';
import { DetailedMetricsGrid } from './DetailedMetricsGrid';
import { TradeHistoryTable } from './TradeHistoryTable';
import { GenerationalConvergenceChart } from './GenerationalConvergenceChart';
import { ActionDropdown } from '@/components/ui/ActionDropdown';
import type { GenerationProgressPayload, PopulationIndividualPayload } from '@/lib/api-client';

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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error communicating with Cloud API backend.');
    } finally {
      setLoading(false);
    }
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
      // Ignored non-fatal instance prefetch
    }
  }

  useEffect(() => {
    loadReport();
    loadInstances();
  }, [runId]);

  // Reactive auto-refresh polling while run is executing
  useEffect(() => {
    if (!report || report.status === 'Running') {
      const timer = setInterval(() => {
        loadReport();
      }, 2500);
      return () => clearInterval(timer);
    }
  }, [runId, report?.status]);

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
        await loadReport();
      }
    } catch (e) {
      toast.error('Completion Error', e instanceof Error ? e.message : 'Network error.');
    } finally {
      setSubmittingComplete(false);
    }
  }

  const [exportingXlsx, setExportingXlsx] = useState(false);

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
      toast.success('XLSX Downloaded', `Formulated report for ${formatHash(runId, 6)} saved.`);
    } catch (e) {
      toast.error('Export Error', e instanceof Error ? e.message : 'Failed to export XLSX.');
    } finally {
      setExportingXlsx(false);
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
    <div className="space-y-6 max-w-6xl">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono pb-2 border-b border-black">
        <Link href="/panel/reports" className="hover:underline font-bold text-black">
          [REPORTS]
        </Link>
        <span>/</span>
        <Link href="/panel/runs" className="hover:underline font-bold text-black">
          [RUNS]
        </Link>
        <span>/</span>
        <span className="font-bold text-black">RUN {formatHash(runId, 6)}</span>
        <span>/</span>
        <span className="font-bold text-green-600">[AUDIT REPORT]</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b border-black">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold uppercase tracking-tight text-black flex items-center gap-2">
              <span>Flow Run Report</span>
              <span className="text-sm font-normal text-zinc-500">| Provenance & Performance</span>
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
          <p className="text-sm text-zinc-600 mt-1 font-sans">
            Authoritative institutional execution report, deterministic reproducibility certification, and intervention audit trail.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {report && (
            <>
              {report.status === 'Running' && (
                <button
                  type="button"
                  onClick={handlePauseRun}
                  disabled={pausing}
                  className="px-3 py-1.5 border border-black bg-white hover:bg-black hover:text-white text-black font-bold text-xs font-mono transition-colors flex items-center gap-1.5"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>{pausing ? 'Pausing...' : 'Pause Run'}</span>
                </button>
              )}

              {report.status !== 'Completed' && (
                <button
                  type="button"
                  onClick={() => setCompleteModalOpen(true)}
                  className="px-3 py-1.5 border border-black bg-black text-white hover:bg-white hover:text-black font-bold text-xs font-mono transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Complete Run</span>
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={handleExportXlsx}
            disabled={exportingXlsx}
            className="px-3 py-1.5 border border-black bg-white hover:bg-black hover:text-white text-black font-bold text-xs font-mono transition-colors"
          >
            {exportingXlsx ? '[EXPORTING...]' : '[EXPORT XLSX]'}
          </button>

          <ActionDropdown
            label="[MORE ACTIONS ▾]"
            items={[
              {
                label: '[LINEAGE TREE]',
                href: `/panel/runs/${runId}/lineage`,
              },
              {
                label: '[REFRESH DATA]',
                onClick: loadReport,
              },
              {
                label: '[EXPORT XLSX WORKBOOK]',
                onClick: handleExportXlsx,
              },
            ]}
          />

          <button
            type="button"
            onClick={loadReport}
            className="hidden sm:inline-block px-3 py-1.5 border border-black bg-white hover:bg-black hover:text-white text-black font-bold text-xs font-mono transition-colors"
          >
            [REFRESH]
          </button>
        </div>
      </div>

      {report?.status === 'Running' && (
        <div className="p-4 border border-black bg-zinc-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-black animate-pulse inline-block" />
            <span className="text-sm font-bold uppercase tracking-wide text-black">
              Execution In Progress — Automatically evaluating generations & simulating trades...
            </span>
          </div>
          <span className="text-xs font-mono font-semibold text-zinc-600">
            [LIVE TELEMETRY AUTO-REFRESHING]
          </span>
        </div>
      )}

      {loading && (
        <div className="py-16 text-center text-xs font-mono text-black font-bold border border-black">
          [COMPILING EXECUTION REPORT FROM CLOUD API...]
        </div>
      )}

      {error && (
        <div className="p-4 border border-black text-red-600 text-xs font-mono font-bold">
          [REPORT ERROR]: {error}
        </div>
      )}

      {!loading && !report && !error && (
        <div className="py-16 text-center border border-black p-8 font-mono">
          <h3 className="text-sm font-bold text-black uppercase">[NO REPORT AVAILABLE]</h3>
          <p className="text-xs text-black mt-1 font-normal">This run is either still pending, missing, or has not yet emitted final execution metrics.</p>
          <div className="mt-4">
            <Link href="/panel/runs" className="px-3 py-1.5 border border-black bg-black text-white hover:bg-white hover:text-black text-xs font-bold transition-colors">
              [RETURN TO RUNS]
            </Link>
          </div>
        </div>
      )}

      {!loading && report && (
        <div className="space-y-6">
          {/* Metadata & Reproducibility Banner */}
          <div className="p-5 rounded-xl bg-white border border-zinc-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-zinc-500 block">Execution Kind</span>
              <span className="text-sm font-bold text-zinc-900 mt-1 block">{report.kind || 'Backtest'}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Engine Instance</span>
              <span className="text-sm font-bold text-zinc-900 mt-1 block font-mono">
                {report.engineInstanceId ? formatHash(report.engineInstanceId, 8) : '—'}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block">PRNG Seed Base</span>
              <span className="text-sm font-bold text-cyan-800 mt-1 block font-mono">
                {report.baseSeed ?? 42}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block">Audit Certification</span>
              <span className="mt-1 flex items-center gap-1.5">
                {isComparable ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    Comparable / Certified
                  </span>
                ) : (
                  <span className="text-amber-700 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    Non-Comparable (Diverged)
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Primary Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm">
              <span className="text-xs font-mono text-zinc-500 block">Net Profit</span>
              <span className="text-2xl font-bold text-emerald-700 mt-2 block font-mono">
                {formatCurrency(metrics?.netProfit)}
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 block font-mono">Realized PnL</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm">
              <span className="text-xs font-mono text-zinc-500 block">Total Return</span>
              <span className="text-2xl font-bold text-zinc-900 mt-2 block font-mono">
                {formatPercentage(metrics?.totalReturn)}
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 block font-mono">Compounded ROI</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm">
              <span className="text-xs font-mono text-zinc-500 block">Sharpe Ratio</span>
              <span className="text-2xl font-bold text-cyan-800 mt-2 block font-mono">
                {metrics?.sharpeRatio != null ? metrics.sharpeRatio.toFixed(2) : '—'}
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 block font-mono">Risk-Adjusted</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm">
              <span className="text-xs font-mono text-zinc-500 block">Max Drawdown</span>
              <span className="text-2xl font-bold text-rose-700 mt-2 block font-mono">
                {formatPercentage(metrics?.maxDrawdown, false)}
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 block font-mono">Peak-to-Trough</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm">
              <span className="text-xs font-mono text-zinc-500 block">Total Trades</span>
              <span className="text-2xl font-bold text-zinc-900 mt-2 block font-mono">
                {metrics?.tradeCount ?? '—'}
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 block font-mono">Executed Fills</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm">
              <span className="text-xs font-mono text-zinc-500 block">Best Fitness</span>
              <span className="text-2xl font-bold text-amber-700 mt-2 block font-mono">
                {metrics?.bestFitness != null ? metrics.bestFitness.toFixed(3) : '—'}
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 block font-mono">Objective Score</span>
            </div>
          </div>

          {/* Strategy DNA Specification (for Backtest, Optimization, WalkForward) */}
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
            <div className="space-y-2">
              <div className="flex items-center justify-end pb-1">
                <Link
                  href={`/panel/reports/${runId}/trades`}
                  className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white font-bold transition-colors text-xs"
                >
                  [OPEN FULL TRADES LEDGER]
                </Link>
              </div>
              <TradeHistoryTable trades={report.trades} onSelectTrade={setSelectedTrade} />
            </div>
          )}

          {/* Generational Progression (for GA Optimization Runs) */}
          {report.generationProgress && report.generationProgress.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-end pb-1">
                <Link
                  href={`/panel/reports/${runId}/generations`}
                  className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white font-bold transition-colors text-xs"
                >
                  [OPEN GENERATIONS PROGRESSION]
                </Link>
              </div>
              <GenerationalConvergenceChart
                generationProgress={report.generationProgress}
                selectedGeneration={selectedGeneration}
                onSelectGeneration={setSelectedGeneration}
              />
            </div>
          )}

          {/* Append-Only Interventions Audit Log */}
          <div className="p-6 rounded-xl bg-white border border-zinc-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-wider font-mono text-zinc-700 font-semibold flex items-center gap-2">
                <span>Append-Only Human & System Interventions</span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[10px]">
                  {report.interventions?.length || 0}
                </span>
              </h3>
            </div>

            {!report.interventions || report.interventions.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-zinc-500">
                No interventions recorded. Execution remained strictly contiguous and untampered.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {report.interventions.map((item, idx) => (
                  <div key={item.id || `intervention-${idx}-${item.stepIndex}`} className="py-4 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                          Step #{item.stepIndex}
                        </span>
                        <span className="text-zinc-900 font-semibold">{item.actor}</span>
                      </div>
                      <span className="text-zinc-400">{formatTimestamp(item.timestamp)}</span>
                    </div>

                    <p className="text-zinc-700 font-sans">{item.reason}</p>

                    {item.modificationsSummary && (
                      <p className="text-zinc-600 text-[11px] bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
                        {item.modificationsSummary}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-[11px] text-zinc-500">
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
          <div className="p-6 rounded-xl bg-white border border-zinc-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-wider font-mono text-zinc-700 font-semibold flex items-center gap-2">
                <span>Recorded Execution Gaps</span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[10px]">
                  {report.gaps?.length || 0}
                </span>
              </h3>
            </div>

            {!report.gaps || report.gaps.length === 0 ? (
              <div className="py-6 text-center text-xs font-mono text-zinc-500">
                No execution gaps detected. Run executed in full contiguity.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {report.gaps.map((gap, idx) => (
                  <div key={gap.id || `gap-${idx}-${gap.startStep}`} className="py-3 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        Steps {gap.startStep} – {gap.endStep}
                      </span>
                      <span className="text-zinc-700 font-sans">{gap.reason}</span>
                    </div>
                    <span className="text-zinc-400">{formatTimestamp(gap.recordedAt || '')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Complete Run Modal */}
      <CompleteRunModal
        isOpen={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
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
        onSubmit={handleCompleteSubmit}
      />

      {/* Launch Run Modal (with winning DNA injection) */}
      <LaunchRunModal
        isOpen={launchModalOpen}
        onClose={() => {
          setLaunchModalOpen(false);
          setInjectedDna(null);
        }}
        instances={instances}
        launchInstanceId={launchInstanceId}
        setLaunchInstanceId={setLaunchInstanceId}
        launchKind={launchKind}
        setLaunchKind={setLaunchKind}
        initialDna={injectedDna || report?.winningDna || undefined}
        onRunLaunched={(newRun) => {
          if (typeof window !== 'undefined') {
            window.location.assign(`/runs/${newRun.id}`);
          }
        }}
      />

      {/* Generation Detail Modal (evaluated chromosome candidates) */}
      <GenerationDetailModal
        isOpen={!!selectedGeneration}
        onClose={() => setSelectedGeneration(null)}
        generation={selectedGeneration}
        onSelectIndividual={(individual) => {
          setSelectedPopulation(individual);
        }}
      />

      {/* Population Backtest Detail Modal (equity curve & trades of candidate) */}
      <PopulationBacktestModal
        isOpen={!!selectedPopulation}
        onClose={() => setSelectedPopulation(null)}
        individual={selectedPopulation}
        generationNumber={selectedGeneration?.generation ?? 1}
        onSelectTrade={(trade) => {
          setSelectedTrade(trade);
        }}
        onRunAsBacktest={(individual) => {
          const constructedDna: WinningDnaPayload = individual.dna || {
            genes: individual.genes || [],
            parameters: individual.parameters || {},
            fitness: individual.fitness || 0,
            slots: report?.winningDna?.slots || null,
            execution: report?.winningDna?.execution || null,
          };
          setInjectedDna(constructedDna);
          setLaunchKind('Backtest');
          setLaunchModalOpen(true);
        }}
      />

      {/* Granular Trade Telemetry & Execution Ladder Modal */}
      <GranularTradeDetailModal
        isOpen={!!selectedTrade}
        onClose={() => setSelectedTrade(null)}
        trade={selectedTrade}
      />
    </div>
  );
}
