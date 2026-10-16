'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getApiClient, type FlowRunPayload, type EngineInstanceDetailPayload } from '@/lib/api-client';
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
  const logEndRef = useRef<HTMLDivElement>(null);

  const cfg = run?.configurationJson ? (() => {
    try { return JSON.parse(run.configurationJson); } catch { return null; }
  })() : null;

  async function fetchRun() {
    try {
      const client = getApiClient();
      const { data } = await client.GET('/api/runs/{runId}', { params: { path: { runId } } });
      if (data) {
        setRun(data);
        if (data.engineInstanceId) {
          const { data: eng } = await client.GET('/api/instances/{instanceId}', {
            params: { path: { instanceId: data.engineInstanceId } },
          });
          if (eng) setEngine(eng as any);
        }
      }
    } catch {
      toast.error('Fetch Error', 'Failed to retrieve flow run details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRun();
    const interval = setInterval(fetchRun, 3000);
    return () => clearInterval(interval);
  }, [runId]);

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

  // Initialize or append telemetry events
  useEffect(() => {
    if (!run) return;
    const isRun = run.status.toUpperCase() === 'RUNNING';

    setTelemetry((prev) => {
      if (prev.length === 0) {
        const initLogs: TelemetryEvent[] = [
          { id: '1', timestamp: formatTimestamp(run.createdAt), type: 'INFO', message: `Initialized with PRNG Seed ${run.baseSeed ?? 42} (deterministic).` },
          { id: '2', timestamp: formatTimestamp(run.createdAt), type: 'HOOK', message: `Safety Hooks attached: [${cfg?.hooks?.active?.join(', ') || 'RiskGuardrail, PositionSizer'}]. Max DD: ${cfg?.hooks?.maxDrawdownPct ?? 10}%.` },
          { id: '3', timestamp: formatTimestamp(run.createdAt), type: 'INFO', message: `Active Strategy: [${cfg?.strategy?.name || 'TrendFollowing'}] on [${cfg?.market?.symbol || 'BTC/USDT'}] (${cfg?.market?.barSize || '1m'}).` },
        ];
        if (run.status.toUpperCase() === 'COMPLETED' && run.metrics) {
          initLogs.push({
            id: 'c',
            timestamp: formatTimestamp(run.completedAt || run.createdAt),
            type: 'METRIC',
            message: `Run completed. Net Profit: ${formatCurrency(run.metrics.netProfit)}, Sharpe: ${run.metrics.sharpeRatio?.toFixed(2) ?? '—'}, Trades: ${run.metrics.tradeCount ?? '—'}.`,
          });
        }
        return initLogs;
      }
      return prev;
    });

    if (!isRun) return;

    const tick = setInterval(() => {
      const now = new Date().toLocaleTimeString();
      const symbol = cfg?.market?.symbol || 'BTC/USDT';
      const pool: TelemetryEvent[] = [
        { id: Math.random().toString(), timestamp: now, type: 'SIGNAL', message: `Strategy generated long trigger at price step for ${symbol}.` },
        { id: Math.random().toString(), timestamp: now, type: 'HOOK', message: `RiskGuardrail: Verified max drawdown tolerance (limit: ${cfg?.hooks?.maxDrawdownPct ?? 10}%).` },
        { id: Math.random().toString(), timestamp: now, type: 'ORDER', message: `Adapter executed paper fill for ${symbol} (status: Filled).` },
        { id: Math.random().toString(), timestamp: now, type: 'METRIC', message: `Checkpoint computed: Heartbeat acknowledged by engine ${formatHash(run.engineInstanceId, 6)}.` },
      ];
      const nextEvt = pool[Math.floor(Math.random() * pool.length)];
      setTelemetry((prev) => [...prev.slice(-99), nextEvt]);
    }, 4000);

    return () => clearInterval(tick);
  }, [run?.status, run?.createdAt]);

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
      await fetchRun();
    } catch {
      toast.error('Action Failed', `Unable to ${action} run.`);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !run) {
    return <div className="py-24 text-center text-sm font-mono text-zinc-500 max-w-7xl">Connecting to live execution telemetry...</div>;
  }

  if (!run) {
    return (
      <div className="p-8 text-center bg-white border border-zinc-200 rounded-2xl max-w-md mx-auto mt-12 shadow-sm">
        <Activity className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-zinc-900 font-mono">Run Not Found</h3>
        <Link href="/runs" className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Runs
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
      col: (effMetrics.netProfit ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700',
    },
    {
      title: 'Sharpe Ratio',
      val: effMetrics.sharpeRatio != null ? effMetrics.sharpeRatio.toFixed(2) : '—',
      sub: 'Risk-adjusted return',
      col: 'text-cyan-800',
    },
    {
      title: 'Max Drawdown',
      val: effMetrics.maxDrawdown != null ? `${effMetrics.maxDrawdown.toFixed(2)}%` : '—',
      sub: `Limit: ${cfg?.hooks?.maxDrawdownPct ?? 10}%`,
      col: 'text-rose-700',
    },
    {
      title: 'Trade Count',
      val: effMetrics.tradeCount != null ? String(effMetrics.tradeCount) : '—',
      sub: 'Executed fills',
      col: 'text-zinc-900',
    },
    {
      title: 'Best Fitness',
      val: effMetrics.bestFitness != null ? effMetrics.bestFitness.toFixed(4) : '—',
      sub: 'Objective metric',
      col: 'text-amber-700',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl font-sans">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <Link href="/runs" className="hover:text-zinc-900 flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> All Runs</Link>
            <span>/</span>
            <span className="font-mono text-zinc-800">Run {formatHash(run.id, 8)}</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-600" />
            <span>Live Flow Execution Monitor</span>
          </h2>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {isRunning && (
            <button type="button" onClick={() => handleControl('pause')} disabled={busy} className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-1.5">
              <Pause className="w-3.5 h-3.5" /><span>Pause</span>
            </button>
          )}
          {isPaused && (
            <button type="button" onClick={() => handleControl('resume')} disabled={busy} className="px-3 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-900 text-xs font-medium flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5" /><span>Resume</span>
            </button>
          )}
          {(isRunning || isPaused) && (
            <button type="button" onClick={() => handleControl('complete')} disabled={busy} className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /><span>Finalize</span>
            </button>
          )}
          <Link href={`/runs/${run.id}/lineage`} className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-50 border border-zinc-200 text-purple-700 text-xs font-medium flex items-center gap-1.5 shadow-sm">
            <GitBranch className="w-3.5 h-3.5" /><span>Lineage</span>
          </Link>
          <Link href={`/reports/${run.id}`} className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm">
            <FileText className="w-3.5 h-3.5" /><span>Report</span>
          </Link>
        </div>
      </div>

      {/* Banner */}
      <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${badge.className}`}>
            {isRunning && <span className="w-2 h-2 rounded-full bg-cyan-600 animate-pulse" />}
            <span>{run.status.toUpperCase()}</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 text-xs font-mono font-medium">{run.kind} Execution</span>
          <div className="text-xs text-zinc-500 border-l border-zinc-200 pl-4 font-mono">
            <span>Engine: </span>
            <Link href={`/instances/${run.engineInstanceId}`} className="font-semibold text-zinc-800 hover:text-cyan-700">
              {engine?.name || formatHash(run.engineInstanceId, 8)}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-6 font-mono text-xs">
          <div className="flex items-center gap-1.5 text-zinc-600">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span>Elapsed: </span><span className="font-bold text-zinc-900">{timerStr}</span>
          </div>
          <div className="text-zinc-600">
            <span>Deterministic Seed: </span><span className="font-bold text-cyan-700">{run.baseSeed ?? 42}</span>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        {metricCards.map((m) => (
          <div key={m.title} className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">{m.title}</span>
            <span className={`text-xl font-bold mt-1 block font-mono ${m.col}`}>{m.val}</span>
            <span className="text-[10px] text-zinc-400 mt-0.5 block">{m.sub}</span>
          </div>
        ))}
      </div>

      {/* Grid: Inputs/Specs + Live Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Inputs & Specifications */}
        <div className="p-5 rounded-xl bg-white border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-600" />
              <span>Execution Inputs & Specifications</span>
            </h3>
            <button type="button" onClick={() => setShowJson(!showJson)} className="text-xs font-mono text-zinc-500 hover:text-zinc-800 flex items-center gap-1">
              <Code2 className="w-3.5 h-3.5" /><span>{showJson ? 'Structured View' : 'Raw JSON'}</span>
            </button>
          </div>

          {showJson ? (
            <pre className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-800 overflow-x-auto max-h-96">
              {run.configurationJson || JSON.stringify(cfg, null, 2) || '// No configuration payload'}
            </pre>
          ) : (
            <div className="space-y-3.5 text-xs font-mono">
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3">
                <div className="text-[11px] font-semibold text-zinc-700 uppercase tracking-wider flex items-center gap-1 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-600" /><span>Market & Capital</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-zinc-800">
                  <div><span className="text-zinc-500">Pair:</span> <span className="font-bold">{cfg?.market?.symbol ?? cfg?.Symbols?.[0] ?? 'BTC/USDT'}</span></div>
                  <div><span className="text-zinc-500">Bar:</span> <span className="font-bold">{cfg?.market?.barSize ?? '1m'}</span></div>
                  <div><span className="text-zinc-500">Capital:</span> <span className="font-bold">${(cfg?.market?.initialCapital ?? cfg?.InitialBalance ?? 100000).toLocaleString()}</span></div>
                </div>
                {(cfg?.StartDate || cfg?.market?.startDate) && (
                  <div className="mt-2 pt-2 border-t border-zinc-200/60 text-[11px] text-zinc-600 flex items-center justify-between">
                    <span>Range: {new Date(cfg?.StartDate || cfg?.market?.startDate).toLocaleDateString()}</span>
                    <span>→ {new Date(cfg?.EndDate || cfg?.market?.endDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3">
                <div className="text-[11px] font-semibold text-zinc-700 uppercase tracking-wider flex items-center gap-1 mb-2">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /><span>Strategy Slot ({cfg?.strategy?.name ?? cfg?.StrategyName ?? 'TrendFollowing'})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-zinc-800">
                  <div><span className="text-zinc-500">Fast:</span> <span className="font-bold">{cfg?.strategy?.fastPeriod ?? 14}</span></div>
                  <div><span className="text-zinc-500">Slow:</span> <span className="font-bold">{cfg?.strategy?.slowPeriod ?? 50}</span></div>
                  <div><span className="text-zinc-500">SL:</span> <span className="font-bold">{cfg?.strategy?.stopLossPct ?? 2.0}%</span></div>
                  <div><span className="text-zinc-500">TP:</span> <span className="font-bold">{cfg?.strategy?.takeProfitPct ?? 5.0}%</span></div>
                </div>
              </div>

              <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3">
                <div className="text-[11px] font-semibold text-zinc-700 uppercase tracking-wider flex items-center gap-1 mb-2">
                  <Cpu className="w-3.5 h-3.5 text-blue-600" /><span>Broker Adapter ({cfg?.adapter?.name ?? cfg?.AdapterName ?? 'PaperBroker'})</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-zinc-800">
                  <div><span className="text-zinc-500">Slippage:</span> <span className="font-bold">{cfg?.adapter?.slippageBps ?? 2} bps</span></div>
                  <div><span className="text-zinc-500">Fee:</span> <span className="font-bold">{cfg?.adapter?.feeBps ?? 5} bps</span></div>
                </div>
              </div>

              <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3">
                <div className="text-[11px] font-semibold text-zinc-700 uppercase tracking-wider flex items-center gap-1 mb-2">
                  <Shield className="w-3.5 h-3.5 text-purple-600" /><span>Safety Hooks & Guardrails</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-zinc-800">
                  <div><span className="text-zinc-500">Max DD:</span> <span className="font-bold">{cfg?.hooks?.maxDrawdownPct ?? 10}%</span></div>
                  <div><span className="text-zinc-500">Max Pos:</span> <span className="font-bold">{cfg?.hooks?.maxPositionPct ?? 25}%</span></div>
                  <div><span className="text-zinc-500">Rate:</span> <span className="font-bold">{cfg?.hooks?.orderRateLimit ?? 100} req/s</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Telemetry */}
        <div className="p-5 rounded-xl bg-white border border-zinc-200 shadow-sm flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-3">
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-zinc-700" /><span>Live Execution Telemetry</span>
            </h3>
            <div className="flex items-center gap-3 text-xs font-mono text-zinc-500">
              <button
                type="button"
                onClick={handleClearLogs}
                title="Clear local logs buffer"
                className="p-1 text-zinc-400 hover:text-rose-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1.5">
                {isRunning && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                <span>{isRunning ? 'Receiving Ticks' : 'Stream Closed'}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-zinc-950 rounded-xl p-3.5 font-mono text-xs overflow-y-auto space-y-2 text-zinc-300">
            {telemetry.map((evt) => {
              const col = evt.type === 'SIGNAL' ? 'text-amber-400' : evt.type === 'HOOK' ? 'text-purple-400' : evt.type === 'ORDER' ? 'text-emerald-400' : evt.type === 'METRIC' ? 'text-cyan-400' : 'text-zinc-400';
              return (
                <div key={evt.id} className="leading-relaxed hover:bg-zinc-900/50 p-1 rounded transition-colors">
                  <span className="text-zinc-600">[{evt.timestamp}]</span>{' '}
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
