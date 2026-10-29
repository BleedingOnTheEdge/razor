'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getApiClient, fetchApi, type FlowRunPayload, type EngineInstanceDetailPayload } from '@/lib/api-client';
import { useSseStream } from '@/hooks/use-sse-stream';
import { useToast } from '@/components/ui/toast';
import { getRunStatusBadge, formatCurrency, formatTimestamp, formatHash } from '@razor/ui-kit';
import {
  Activity,
  ArrowLeft,
  Pause,
  Play,
  CheckCircle,
  GitBranch,
  FileText,
  Clock,
  Shield,
  Zap,
  Sliders,
  Terminal,
  TrendingUp,
  Cpu,
  Code2,
  Trash2,
  Dna,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

interface TelemetryEvent {
  id: string;
  timestamp: string;
  type: 'INFO' | 'SIGNAL' | 'ORDER' | 'HOOK' | 'METRIC';
  message: string;
}

export default function RunLiveMonitorPage({ params }: { params: Promise<{ id: string }> }) {
  const routeParams = useParams();
  const resolved = params ? use(params) : null;
  const runId = (routeParams?.id as string) || resolved?.id || '';

  const toast = useToast();

  const [run, setRun] = useState<FlowRunPayload | null>(null);
  const [engine, setEngine] = useState<EngineInstanceDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showJson, setShowJson] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryEvent[]>(() => {
    if (typeof window !== 'undefined' && runId) {
      try {
        const stored = localStorage.getItem(`telemetry_${runId}`);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });
  const { events: sseEvents } = useSseStream(run?.engineInstanceId);
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  const logEndRef = useRef<HTMLDivElement>(null);

  const cfg = run?.configurationJson ? (() => {
    try { return JSON.parse(run.configurationJson); } catch { return null; }
  })() : null;

  /**
   * Resilient fetch with strict 500ms timeout and max 2 retries per cycle.
   * If retries cap out, drops the state update without disrupting the UI.
   */
  async function fetchRunWithTimeout(targetRunId: string): Promise<FlowRunPayload | null> {
    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 500);
      try {
        const data = await fetchApi<FlowRunPayload>(`/api/runs/${targetRunId}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (data) return data;
      } catch {
        clearTimeout(timeoutId);
      }
    }
    return null;
  }

  // Initial load
  useEffect(() => {
    let active = true;

    async function initialFetch() {
      setLoading(true);
      try {
        const client = getApiClient();
        const { data } = await client.GET('/api/runs/{runId}', { params: { path: { runId } } });
        if (!active) return;
        if (data) {
          setRun(data);
          if (data.engineInstanceId) {
            const { data: eng } = await client.GET('/api/instances/{instanceId}', {
              params: { path: { instanceId: data.engineInstanceId } },
            });
            if (active && eng) setEngine(eng as any);
          }
        }
      } catch {
        if (active) toast.error('Fetch Error', 'Failed to retrieve flow run details.');
      } finally {
        if (active) setLoading(false);
      }
    }

    initialFetch();

    return () => {
      active = false;
    };
  }, [runId]);

  // Reactive auto-refresh polling:
  // Strictly polls every 2 seconds (2000ms), 500ms timeout, max 2 retries.
  // Performs silent in-place updates without unmounting containers or reloading.
  useEffect(() => {
    if (run && run.status.toUpperCase() !== 'RUNNING') {
      return; // Stop polling once run is complete
    }

    let isPollingActive = true;
    let isRequestBusy = false;

    const interval = setInterval(async () => {
      if (!isPollingActive || isRequestBusy) return;
      isRequestBusy = true;
      try {
        const freshRun = await fetchRunWithTimeout(runId);
        if (isPollingActive && freshRun) {
          setRun(freshRun);
        }
      } finally {
        isRequestBusy = false;
      }
    }, 2000);

    return () => {
      isPollingActive = false;
      clearInterval(interval);
    };
  }, [runId, run?.status]);

  useEffect(() => {
    if (!run || run.status.toUpperCase() !== 'RUNNING') return;
    const start = new Date(run.createdAt).getTime();
    const t = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000))), 1000);
    return () => clearInterval(t);
  }, [run?.status, run?.createdAt]);

  // Persist telemetry to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && telemetry.length > 0) {
      try {
        localStorage.setItem(`telemetry_${runId}`, JSON.stringify(telemetry.slice(-100)));
      } catch {}
    }
  }, [telemetry, runId]);

  // Initialize initial run telemetry logs
  useEffect(() => {
    if (!run) return;

    setTelemetry((prev) => {
      if (prev.length === 0) {
        const initLogs: TelemetryEvent[] = [
          { id: '1', timestamp: formatTimestamp(run.createdAt), type: 'INFO', message: `Initialized with PRNG Seed ${run.baseSeed ?? 42} (deterministic).` },
          { id: '2', timestamp: formatTimestamp(run.createdAt), type: 'HOOK', message: `Safety Hooks attached: [${cfg?.hooks?.active?.join(', ') || 'RiskGuardrail, PositionSizer'}]. Max DD: ${cfg?.hooks?.maxDrawdownPct ?? 10}%.` },
          { id: '3', timestamp: formatTimestamp(run.createdAt), type: 'INFO', message: `Active Strategy: [${cfg?.strategy?.name || 'TrendFollowing'}] on [${cfg?.market?.symbol || 'BTC/USDT'}] (${cfg?.market?.barSize || '1m'}).` },
        ];
        const netProfit = run.metrics?.netProfit ?? (run as any).netProfit;
        const sharpe = run.metrics?.sharpeRatio ?? (run as any).sharpeRatio;
        const trades = run.metrics?.tradeCount ?? (run as any).tradeCount;
        if (run.status.toUpperCase() === 'COMPLETED' && netProfit !== undefined) {
          initLogs.push({
            id: 'c',
            timestamp: formatTimestamp(run.completedAt || run.createdAt),
            type: 'METRIC',
            message: `Run completed. Net Profit: ${formatCurrency(netProfit)}, Sharpe: ${sharpe?.toFixed(2) ?? '—'}, Trades: ${trades ?? '—'}.`,
          });
        }
        return initLogs;
      }
      return prev;
    });
  }, [run?.status, run?.createdAt]);

  // Process live events from Unified SSE Stream
  useEffect(() => {
    if (!sseEvents || sseEvents.length === 0) return;

    for (const ev of sseEvents) {
      const eventKey = `${ev.eventType}_${ev.timestamp}_${ev.correlationId ?? ''}_${JSON.stringify(ev.data ?? '')}`;
      if (processedEventIdsRef.current.has(eventKey)) continue;
      processedEventIdsRef.current.add(eventKey);

      // Only process events matching this run or associated engine instance
      const matchesRun = ev.runId === runId;
      const matchesEngine = ev.instanceId === run?.engineInstanceId;
      if (!matchesRun && !matchesEngine) continue;

      const timeStr = formatTimestamp(ev.timestamp);
      let telemetryType: 'INFO' | 'SIGNAL' | 'ORDER' | 'HOOK' | 'METRIC' = 'INFO';
      let message = '';

      if (ev.eventType === 'command_progress') {
        telemetryType = 'METRIC';
        const data = ev.data as Record<string, unknown> | null;
        const pct = data?.Percentage ?? data?.percentage;
        const msg = data?.Message ?? data?.message ?? JSON.stringify(data);
        message = pct !== undefined ? `[Progress ${pct}%] ${msg}` : `Progress: ${msg}`;
      } else if (ev.eventType === 'command_completed') {
        telemetryType = 'INFO';
        const data = ev.data as Record<string, unknown> | null;
        const st = data?.Status ?? (data?.Succeeded ? 'Success' : 'Failed');
        message = `Command ${ev.correlationId ?? ''} ${st}`;
        if (matchesRun) {
          fetchRunWithTimeout(runId).then((r) => r && setRun(r));
        }
      } else if (ev.eventType === 'run_status') {
        telemetryType = 'METRIC';
        const data = ev.data as Record<string, unknown> | null;
        const st = data?.Status ?? data?.status;
        message = `Run status transition: ${st}`;
        if (matchesRun) {
          fetchRunWithTimeout(runId).then((r) => r && setRun(r));
        }
      } else if (ev.eventType === 'engine_heartbeat') {
        telemetryType = 'INFO';
        message = `Engine heartbeat acknowledged: ${formatHash(ev.instanceId ?? '', 6)}`;
      } else if (ev.eventType === 'equity_tick') {
        telemetryType = 'METRIC';
        message = `Equity update: ${JSON.stringify(ev.data)}`;
      } else {
        message = `[${ev.eventType}]: ${JSON.stringify(ev.data)}`;
      }

      setTelemetry((prev) => [
        ...prev.slice(-99),
        {
          id: `${Date.now()}_${Math.random()}`,
          timestamp: timeStr,
          type: telemetryType,
          message,
        },
      ]);
    }
  }, [sseEvents, runId, run?.engineInstanceId]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [telemetry]);

  function handleClearLogs() {
    setTelemetry([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`telemetry_${runId}`);
    }
    toast.info('Logs Cleared', 'Live telemetry buffer reset.');
  }

  async function handleControl(action: 'pause' | 'resume' | 'complete') {
    setBusy(true);
    const client = getApiClient();
    try {
      if (action === 'pause') {
        await client.POST('/api/runs/{runId}/pause', { params: { path: { runId } } });
        toast.success('Run Paused', 'Execution paused at checkpoint.');
      } else if (action === 'resume') {
        await client.POST('/api/runs/{runId}/resume', {
          params: { path: { runId } },
          body: {
            forkPoint: { stepIndex: 100 },
            intervention: { stepIndex: 100, previousFingerprint: 'sha256:0000', newFingerprint: 'sha256:1111', actor: 'operator', reason: 'Live monitor resume' },
          },
        });
        toast.success('Run Resumed', 'Execution resumed.');
      } else {
        await client.POST('/api/runs/{runId}/complete', {
          params: { path: { runId } },
          body: { netProfit: run?.metrics?.netProfit ?? 0, totalReturn: run?.metrics?.totalReturn ?? 0, sharpeRatio: run?.metrics?.sharpeRatio ?? 0, maxDrawdown: run?.metrics?.maxDrawdown ?? 0, tradeCount: run?.metrics?.tradeCount ?? 0 },
        });
        toast.success('Run Finalized', 'Execution completed with recorded metrics.');
      }
      const fresh = await fetchRunWithTimeout(runId);
      if (fresh) setRun(fresh);
    } catch {
      toast.error('Action Failed', `Unable to ${action} run.`);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !run) {
    return (
      <div className="py-24 text-center text-sm font-medium text-zinc-400 max-w-7xl">
        Connecting to live execution telemetry...
      </div>
    );
  }

  if (!run) {
    return (
      <div className="p-8 text-center bg-[#171717] border border-[#262626] rounded-2xl max-w-md mx-auto mt-12">
        <Activity className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-zinc-100 font-sans">Run Not Found</h3>
        <p className="text-sm text-zinc-400 mt-1">This flow run could not be found or has expired.</p>
        <Link href="/panel/runs" className="mt-5 inline-flex items-center gap-2 px-5 py-2 bg-[#3ECF8E] hover:bg-[#34b27b] text-[#0f0f0f] rounded-full text-sm font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" /> Return to Runs
        </Link>
      </div>
    );
  }

  const isRunning = run.status.toUpperCase() === 'RUNNING';
  const isPaused = run.status.toUpperCase() === 'PAUSED';
  const badge = getRunStatusBadge(run.status);
  const timerStr = `${Math.floor(elapsed / 60).toString().padStart(2, '0')}:${(elapsed % 60).toString().padStart(2, '0')}`;

  const effMetrics = {
    netProfit: run.metrics?.netProfit ?? (run as any).netProfit,
    totalReturn: run.metrics?.totalReturn ?? (run as any).totalReturn,
    sharpeRatio: run.metrics?.sharpeRatio ?? (run as any).sharpeRatio,
    maxDrawdown: run.metrics?.maxDrawdown ?? (run as any).maxDrawdown,
    tradeCount: run.metrics?.tradeCount ?? (run as any).tradeCount,
    bestFitness: run.metrics?.bestFitness ?? (run as any).bestFitness,
  };

  const metricCards = [
    {
      title: 'Net Profit',
      val: effMetrics.netProfit != null ? formatCurrency(effMetrics.netProfit) : '—',
      sub: effMetrics.totalReturn != null ? `${effMetrics.totalReturn >= 0 ? '+' : ''}${effMetrics.totalReturn.toFixed(2)}%` : 'Realized PnL',
      col: (effMetrics.netProfit ?? 0) >= 0 ? 'text-[#3ECF8E]' : 'text-rose-400',
    },
    {
      title: 'Sharpe Ratio',
      val: effMetrics.sharpeRatio != null ? effMetrics.sharpeRatio.toFixed(2) : '—',
      sub: 'Risk-adjusted return',
      col: 'text-zinc-100',
    },
    {
      title: 'Max Drawdown',
      val: effMetrics.maxDrawdown != null ? `${effMetrics.maxDrawdown.toFixed(2)}%` : '—',
      sub: `Limit: ${cfg?.hooks?.maxDrawdownPct ?? 10}%`,
      col: 'text-rose-400',
    },
    {
      title: 'Trade Count',
      val: effMetrics.tradeCount != null ? String(effMetrics.tradeCount) : '—',
      sub: 'Executed fills',
      col: 'text-zinc-100',
    },
    {
      title: 'Best Fitness',
      val: effMetrics.bestFitness != null ? effMetrics.bestFitness.toFixed(4) : '—',
      sub: 'Objective metric',
      col: 'text-amber-400',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl font-sans pb-16">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#262626]">
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
            <Link href="/panel/runs" className="hover:text-zinc-100 transition-colors font-medium flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> All Runs
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
            <span className="font-mono text-zinc-200 font-semibold">Run {formatHash(run.id, 8)}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-[#3ECF8E]" />
            <span>Live Flow Execution Monitor</span>
          </h1>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2.5">
          {isRunning && (
            <button
              type="button"
              onClick={() => handleControl('pause')}
              disabled={busy}
              className="px-4 py-2 rounded-full bg-amber-950/20 hover:bg-amber-950/40 border border-amber-500/30 text-amber-400 text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Pause className="w-4 h-4 text-amber-600" />
              <span>Pause</span>
            </button>
          )}
          {isPaused && (
            <button
              type="button"
              onClick={() => handleControl('resume')}
              disabled={busy}
              className="px-4 py-2 rounded-full bg-sky-950/20 hover:bg-sky-950/40 border border-sky-500/30 text-sky-400 text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4 text-sky-600" />
              <span>Resume</span>
            </button>
          )}
          {(isRunning || isPaused) && (
            <button
              type="button"
              onClick={() => handleControl('complete')}
              disabled={busy}
              className="px-5 py-2 rounded-full bg-[#3ECF8E] hover:bg-[#34b27b] text-[#0f0f0f] text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Finalize</span>
            </button>
          )}
          <Link
            href={`/panel/runs/${run.id}/lineage`}
            className="px-3.5 py-2 rounded-lg bg-[#171717] hover:bg-[#141414] border border-[#262626] text-purple-700 text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
          >
            <GitBranch className="w-4 h-4" />
            <span>Lineage</span>
          </Link>
          <Link
            href={`/panel/reports/${run.id}`}
            className="px-4 py-2 rounded-full bg-[#171717] hover:bg-[#222222] border border-[#262626] text-zinc-100 text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Report</span>
          </Link>
        </div>
      </div>

      {/* Status Banner */}
      <div className="p-4 rounded-xl bg-[#171717] border border-[#262626] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 ${badge.className}`}>
            {isRunning && <span className="w-2 h-2 rounded-full bg-[#3ECF8E] animate-pulse" />}
            <span>{run.status.toUpperCase()}</span>
          </span>
          <span className="px-2.5 py-1 rounded-md bg-[#1f1f1f] text-zinc-300 text-xs font-mono font-medium">{run.kind} Execution</span>
          <div className="text-xs text-zinc-400 border-l border-[#262626] pl-4 font-mono">
            <span>Engine: </span>
            <Link href={`/panel/instances/${run.engineInstanceId}`} className="font-semibold text-zinc-200 hover:text-[#3ECF8E] transition-colors">
              {engine?.name || formatHash(run.engineInstanceId, 8)}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-6 font-mono text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Clock className="w-4 h-4 text-zinc-500" />
            <span>Elapsed: </span><span className="font-bold text-zinc-100">{timerStr}</span>
          </div>
          <div className="text-zinc-400">
            <span>Deterministic Seed: </span><span className="font-bold text-[#3ECF8E]">{run.baseSeed ?? 42}</span>
          </div>
        </div>
      </div>

      {/* Winning Strategy DNA Injected Banner */}
      {(run.winningDnaJson || run.winningDna) && (
        <div className="p-4 rounded-xl bg-[#171717] border border-[#262626] flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-600 text-white shadow-xs">
              <Dna className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-zinc-100 font-sans flex items-center gap-2">
                <span>Winning Strategy DNA Captured</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-950/40 text-purple-300 border border-purple-500/30 text-xs font-semibold font-mono">
                  Portable DNA
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                Portable chromosome genes and decoded parameters are ready for 1-click backtest verification or live deployment.
              </p>
            </div>
          </div>
          <Link
            href={`/panel/reports/${run.id}`}
            className="px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <span>View Full Report & Deploy</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {metricCards.map((m) => (
          <div key={m.title} className="p-4 rounded-xl bg-[#171717] border border-[#262626] shadow-sm">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider block">{m.title}</span>
            <span className={`text-xl font-bold mt-1.5 block font-mono ${m.col}`}>{m.val}</span>
            <span className="text-xs text-zinc-500 mt-1 block font-sans">{m.sub}</span>
          </div>
        ))}
      </div>

      {/* Grid: Inputs/Specs + Live Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Inputs & Specifications */}
        <div className="p-5 rounded-xl bg-[#171717] border border-[#262626] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#3ECF8E]" />
              <span>Execution Inputs & Specifications</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowJson(!showJson)}
              className="text-xs font-mono text-zinc-400 hover:text-zinc-100 flex items-center gap-1 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{showJson ? 'Structured View' : 'Raw JSON'}</span>
            </button>
          </div>

          {showJson ? (
            <pre className="p-3.5 bg-[#141414] border border-[#262626] rounded-lg text-xs font-mono text-zinc-200 overflow-x-auto max-h-96">
              {run.configurationJson || JSON.stringify(cfg, null, 2) || '// No configuration payload'}
            </pre>
          ) : (
            <div className="space-y-3.5 text-xs font-mono">
              <div className="bg-[#141414] border border-[#262626]/80 rounded-lg p-3.5">
                <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 mb-2 font-sans">
                  <TrendingUp className="w-4 h-4 text-[#3ECF8E]" />
                  <span>Market & Capital</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-zinc-200">
                  <div><span className="text-zinc-400">Pair:</span> <span className="font-bold">{cfg?.market?.symbol ?? cfg?.Symbols?.[0] ?? 'BTC/USDT'}</span></div>
                  <div><span className="text-zinc-400">Bar:</span> <span className="font-bold">{cfg?.market?.barSize ?? '1m'}</span></div>
                  <div><span className="text-zinc-400">Capital:</span> <span className="font-bold">${(cfg?.market?.initialCapital ?? cfg?.InitialBalance ?? 100000).toLocaleString()}</span></div>
                </div>
                {(cfg?.StartDate || cfg?.market?.startDate) && (
                  <div className="mt-2.5 pt-2.5 border-t border-[#262626]/80 text-xs text-zinc-400 flex items-center justify-between font-sans">
                    <span>Range: {new Date(cfg?.StartDate || cfg?.market?.startDate).toLocaleDateString()}</span>
                    <span>→ {new Date(cfg?.EndDate || cfg?.market?.endDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="bg-[#141414] border border-[#262626]/80 rounded-lg p-3.5">
                <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 mb-2 font-sans">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Strategy Slot ({cfg?.strategy?.name ?? cfg?.StrategyName ?? 'TrendFollowing'})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-zinc-200">
                  <div><span className="text-zinc-400">Fast:</span> <span className="font-bold">{cfg?.strategy?.fastPeriod ?? 14}</span></div>
                  <div><span className="text-zinc-400">Slow:</span> <span className="font-bold">{cfg?.strategy?.slowPeriod ?? 50}</span></div>
                  <div><span className="text-zinc-400">SL:</span> <span className="font-bold">{cfg?.strategy?.stopLossPct ?? 2.0}%</span></div>
                  <div><span className="text-zinc-400">TP:</span> <span className="font-bold">{cfg?.strategy?.takeProfitPct ?? 5.0}%</span></div>
                </div>
              </div>

              <div className="bg-[#141414] border border-[#262626]/80 rounded-lg p-3.5">
                <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 mb-2 font-sans">
                  <Cpu className="w-4 h-4 text-blue-600" />
                  <span>Broker Adapter ({cfg?.adapter?.name ?? cfg?.AdapterName ?? 'PaperBroker'})</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-zinc-200">
                  <div><span className="text-zinc-400">Slippage:</span> <span className="font-bold">{cfg?.adapter?.slippageBps ?? 2} bps</span></div>
                  <div><span className="text-zinc-400">Fee:</span> <span className="font-bold">{cfg?.adapter?.feeBps ?? 5} bps</span></div>
                </div>
              </div>

              <div className="bg-[#141414] border border-[#262626]/80 rounded-lg p-3.5">
                <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 mb-2 font-sans">
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span>Safety Hooks & Guardrails</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-zinc-200">
                  <div><span className="text-zinc-400">Max DD:</span> <span className="font-bold">{cfg?.hooks?.maxDrawdownPct ?? 10}%</span></div>
                  <div><span className="text-zinc-400">Max Pos:</span> <span className="font-bold">{cfg?.hooks?.maxPositionPct ?? 25}%</span></div>
                  <div><span className="text-zinc-400">Rate:</span> <span className="font-bold">{cfg?.hooks?.orderRateLimit ?? 100} req/s</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Telemetry */}
        <div className="p-5 rounded-xl bg-[#171717] border border-[#262626] shadow-sm flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#262626] mb-3">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-zinc-300" />
              <span>Live Execution Telemetry</span>
            </h3>
            <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
              <button
                type="button"
                onClick={handleClearLogs}
                title="Clear local logs buffer"
                className="p-1 text-zinc-500 hover:text-rose-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1.5 font-sans">
                {isRunning && <span className="w-2 h-2 rounded-full bg-[#3ECF8E] animate-pulse" />}
                <span className="text-zinc-400 font-medium">{isRunning ? 'Receiving Ticks' : 'Stream Closed'}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-[#141414] rounded-xl p-4 font-mono text-xs overflow-y-auto space-y-2 text-zinc-300 shadow-inner">
            {telemetry.map((evt) => {
              const col = evt.type === 'SIGNAL' ? 'text-amber-400' : evt.type === 'HOOK' ? 'text-purple-400' : evt.type === 'ORDER' ? 'text-emerald-400' : evt.type === 'METRIC' ? 'text-cyan-400' : 'text-zinc-500';
              return (
                <div key={evt.id} className="leading-relaxed hover:bg-[#1f1f1f] p-1.5 rounded transition-colors">
                  <span className="text-zinc-400">[{evt.timestamp}]</span>{' '}
                  <span className={`font-semibold ${col}`}>[{evt.type}]</span>{' '}
                  <span className="text-zinc-200">{evt.message}</span>
                </div>
              );
            })}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
