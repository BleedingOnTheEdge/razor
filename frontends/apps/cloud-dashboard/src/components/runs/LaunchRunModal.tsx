'use client';

import React, { useState, useEffect } from 'react';
import { Play, Sliders, Shield, Zap, X, Calendar, Settings2 } from 'lucide-react';
import { formatHash } from '@razor/ui-kit';
import { getApiClient, type EngineInstancePayload, type FlowRunPayload } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';

export interface LaunchRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  instances: EngineInstancePayload[];
  launchInstanceId?: string;
  setLaunchInstanceId?: (id: string) => void;
  launchKind?: 'Backtest' | 'Optimization' | 'WalkForward';
  setLaunchKind?: (kind: 'Backtest' | 'Optimization' | 'WalkForward') => void;
  launchSeed?: number;
  setLaunchSeed?: (seed: number) => void;
  launching?: boolean;
  onSubmit?: (e: React.FormEvent) => Promise<void>;
  onRunLaunched?: (run: FlowRunPayload) => void;
}

const PRESETS = [
  { id: 'conservative', label: 'Conservative', desc: '1h • Slow 100 • 5% DD', cfg: { capital: 250000, bar: '1h', fast: 20, slow: 100, sl: 1.5, tp: 4.0, lev: 1.0, dd: 5.0, pos: 10, rate: 20 } },
  { id: 'momentum', label: 'Momentum', desc: '1m • Fast 9 • 10% DD', cfg: { capital: 50000, bar: '1m', fast: 9, slow: 21, sl: 2.0, tp: 5.0, lev: 2.0, dd: 10.0, pos: 25, rate: 100 } },
  { id: 'scalping', label: 'Scalping', desc: '1s • Fast 5 • 15% DD', cfg: { capital: 25000, bar: '1s', fast: 5, slow: 15, sl: 0.8, tp: 1.8, lev: 3.0, dd: 15.0, pos: 40, rate: 250 } },
];

export function LaunchRunModal({
  isOpen,
  onClose,
  instances,
  launchInstanceId: extInstId,
  setLaunchInstanceId: extSetInstId,
  launchKind: extKind,
  setLaunchKind: extSetKind,
  launchSeed: extSeed,
  setLaunchSeed: extSetSeed,
  launching: extLaunching,
  onSubmit: extOnSubmit,
  onRunLaunched,
}: LaunchRunModalProps) {
  const toast = useToast();

  const [selectedInstanceId, setSelectedInstanceId] = useState<string>(
    extInstId || (instances.length > 0 ? instances[0].instanceId : '')
  );
  const [runKind, setRunKind] = useState<'Backtest' | 'Optimization' | 'WalkForward'>(extKind || 'Backtest');
  const [seed, setSeed] = useState<number>(extSeed ?? 42);
  const [submitting, setSubmitting] = useState(false);

  // Active extension profile
  const [detectedStrategy, setDetectedStrategy] = useState<string>('TrendFollowing');
  const [detectedAdapter, setDetectedAdapter] = useState<string>('PaperBroker');
  const [detectedHooks, setDetectedHooks] = useState<string[]>(['RiskGuardrail', 'PositionSizer']);

  // Date range
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState<string>(thirtyDaysAgo);
  const [endDate, setEndDate] = useState<string>(today);

  // Market & Capital specifications
  const [symbol, setSymbol] = useState<string>('BTC/USDT');
  const [barSize, setBarSize] = useState<string>('1m');
  const [initialCapital, setInitialCapital] = useState<number>(100000);

  // Strategy slot parameters
  const [fastPeriod, setFastPeriod] = useState<number>(14);
  const [slowPeriod, setSlowPeriod] = useState<number>(50);
  const [stopLossPct, setStopLossPct] = useState<number>(2.0);
  const [takeProfitPct, setTakeProfitPct] = useState<number>(5.0);
  const [leverage, setLeverage] = useState<number>(1.0);

  // Kind-specific knobs
  const [generations, setGenerations] = useState<number>(10);
  const [populationSize, setPopulationSize] = useState<number>(40);
  const [mutationRate, setMutationRate] = useState<number>(0.05);
  const [objectiveMetric, setObjectiveMetric] = useState<string>('SharpeRatio');
  const [inSamplePct, setInSamplePct] = useState<number>(70);
  const [outOfSamplePct, setOutOfSamplePct] = useState<number>(30);
  const [windowSplits, setWindowSplits] = useState<number>(5);

  // Hook safety guardrails
  const [maxDrawdownPct, setMaxDrawdownPct] = useState<number>(10.0);
  const [maxPositionPct, setMaxPositionPct] = useState<number>(25.0);
  const [orderRateLimit, setOrderRateLimit] = useState<number>(100);

  useEffect(() => {
    if (extInstId) setSelectedInstanceId(extInstId);
  }, [extInstId]);

  useEffect(() => {
    if (instances.length > 0 && !selectedInstanceId) {
      setSelectedInstanceId(instances[0].instanceId);
    }
  }, [instances, selectedInstanceId]);

  useEffect(() => {
    if (!selectedInstanceId || !isOpen) return;
    let active = true;
    getApiClient()
      .GET('/api/instances/{instanceId}', { params: { path: { instanceId: selectedInstanceId } } })
      .then(({ data }) => {
        if (!active || !data) return;
        const d = data as any;
        if (d.activeSelections?.strategy) setDetectedStrategy(d.activeSelections.strategy);
        if (d.activeSelections?.adapter) setDetectedAdapter(d.activeSelections.adapter);
        if (Array.isArray(d.activeSelections?.hookPlugins) && d.activeSelections.hookPlugins.length > 0) {
          setDetectedHooks(d.activeSelections.hookPlugins);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [selectedInstanceId, isOpen]);

  function applyPreset(p: typeof PRESETS[number]) {
    setInitialCapital(p.cfg.capital);
    setBarSize(p.cfg.bar);
    setFastPeriod(p.cfg.fast);
    setSlowPeriod(p.cfg.slow);
    setStopLossPct(p.cfg.sl);
    setTakeProfitPct(p.cfg.tp);
    setLeverage(p.cfg.lev);
    setMaxDrawdownPct(p.cfg.dd);
    setMaxPositionPct(p.cfg.pos);
    setOrderRateLimit(p.cfg.rate);
    toast.info('Preset Loaded', `${p.label} configuration active.`);
  }

  function setDateDaysAgo(days: number) {
    const end = new Date();
    const start = new Date(Date.now() - days * 86400000);
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInstanceId) {
      toast.error('Engine Required', 'Select a target engine instance.');
      return;
    }

    const startIso = new Date(startDate + 'T00:00:00Z').toISOString();
    const endIso = new Date(endDate + 'T23:59:59Z').toISOString();

    const config = {
      // Top-level fields for engine configuration parser
      StartDate: startIso,
      EndDate: endIso,
      Symbols: [symbol],
      AdapterName: detectedAdapter,
      StrategyName: detectedStrategy,
      InitialBalance: Number(initialCapital),
      Leverage: Number(leverage),
      ExecutionKind: runKind,
      MasterSeed: Number(seed),
      Generations: Number(generations),
      PopulationSize: Number(populationSize),
      MutationRate: Number(mutationRate),
      // Structured sections
      market: { symbol, barSize, initialCapital: Number(initialCapital), startDate: startIso, endDate: endIso },
      strategy: { name: detectedStrategy, fastPeriod: Number(fastPeriod), slowPeriod: Number(slowPeriod), stopLossPct: Number(stopLossPct), takeProfitPct: Number(takeProfitPct), leverage: Number(leverage) },
      adapter: { name: detectedAdapter, slippageBps: 2, feeBps: 5 },
      hooks: { active: detectedHooks, maxDrawdownPct: Number(maxDrawdownPct), maxPositionPct: Number(maxPositionPct), orderRateLimit: Number(orderRateLimit) },
      optimization: runKind === 'Optimization' ? { generations: Number(generations), populationSize: Number(populationSize), mutationRate: Number(mutationRate), objectiveMetric } : undefined,
      walkForward: runKind === 'WalkForward' ? { inSamplePct: Number(inSamplePct), outOfSamplePct: Number(outOfSamplePct), windowSplits: Number(windowSplits) } : undefined,
      seed: Number(seed),
    };

    setSubmitting(true);
    try {
      const { data, error } = await getApiClient().POST('/api/runs', {
        body: {
          instanceId: selectedInstanceId,
          kind: runKind,
          baseSeed: Number(seed),
          configurationJson: JSON.stringify(config, null, 2),
        },
      });

      if (error) {
        toast.error('Launch Rejected', 'Cloud rejected execution request.');
      } else if (data) {
        toast.success('Run Initiated', `Launched ${runKind} #${formatHash(data.id, 6)} with active slots.`);
        if (onRunLaunched) onRunLaunched(data);
        else if (extOnSubmit) await extOnSubmit(e);
        onClose();
      }
    } catch (err) {
      toast.error('Launch Error', err instanceof Error ? err.message : 'Network execution failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;
  const busy = extLaunching || submitting;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-zinc-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Play className="w-4 h-4 text-cyan-600 fill-current" />
              <span>Launch Deterministic Flow Run</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">Configure execution kind parameters, dates, broker adapter, and safety hooks.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-2.5">
          <div className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>1-Click Configuration Presets</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" onClick={() => applyPreset(p)} className="px-2.5 py-1.5 rounded-lg bg-white border border-zinc-200 hover:border-zinc-300 text-left hover:bg-zinc-50 transition-colors">
                <div className="text-xs font-semibold text-zinc-800">{p.label}</div>
                <div className="text-[10px] text-zinc-400">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Target & Kind & Seed */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Target Engine</label>
              <select value={selectedInstanceId} onChange={(e) => { setSelectedInstanceId(e.target.value); extSetInstId?.(e.target.value); }} required className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white text-xs font-mono">
                {instances.map((i) => (
                  <option key={i.instanceId} value={i.instanceId}>{i.name || i.engineId} ({formatHash(i.instanceId, 4)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Execution Kind</label>
              <select value={runKind} onChange={(e) => { const v = e.target.value as any; setRunKind(v); extSetKind?.(v); }} className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white text-xs font-semibold">
                <option value="Backtest">Backtest (Historical Sim)</option>
                <option value="Optimization">Optimization (Parameter Tuning)</option>
                <option value="WalkForward">Walk-Forward (Out-of-sample)</option>
              </select>
            </div>
            <div>
              <label className="block text-zinc-700 font-semibold mb-1">PRNG Base Seed</label>
              <input type="number" value={seed} onChange={(e) => { const v = Number(e.target.value); setSeed(v); extSetSeed?.(v); }} required className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white text-xs font-mono" />
            </div>
          </div>

          {/* Date Range Selection with Presets */}
          <div className="border-t border-zinc-100 pt-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Simulation Date Range</span>
              </h4>
              <div className="flex items-center gap-1 font-mono text-[10px]">
                <button type="button" onClick={() => setDateDaysAgo(7)} className="px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600">7D</button>
                <button type="button" onClick={() => setDateDaysAgo(30)} className="px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600">30D</button>
                <button type="button" onClick={() => setDateDaysAgo(90)} className="px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600">90D</button>
                <button type="button" onClick={() => setDateDaysAgo(365)} className="px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600">1Y</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-zinc-600 text-[11px] mb-1">Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 text-xs font-mono" />
              </div>
              <div>
                <label className="block text-zinc-600 text-[11px] mb-1">End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 text-xs font-mono" />
              </div>
            </div>
          </div>

          {/* Execution Kind Specific Knobs */}
          {runKind === 'Optimization' && (
            <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-200 space-y-2">
              <h4 className="text-xs font-semibold text-purple-900 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-purple-700" />
                <span>Genetic Algorithm Tuning Parameters</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-purple-800 text-[10px] mb-0.5">Generations</label>
                  <input type="number" value={generations} onChange={(e) => setGenerations(Number(e.target.value))} className="w-full px-2 py-1 bg-white border border-purple-200 rounded-lg text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-purple-800 text-[10px] mb-0.5">Population</label>
                  <input type="number" value={populationSize} onChange={(e) => setPopulationSize(Number(e.target.value))} className="w-full px-2 py-1 bg-white border border-purple-200 rounded-lg text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-purple-800 text-[10px] mb-0.5">Mutation Rate</label>
                  <input type="number" step="0.01" value={mutationRate} onChange={(e) => setMutationRate(Number(e.target.value))} className="w-full px-2 py-1 bg-white border border-purple-200 rounded-lg text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-purple-800 text-[10px] mb-0.5">Objective</label>
                  <select value={objectiveMetric} onChange={(e) => setObjectiveMetric(e.target.value)} className="w-full px-1.5 py-1 bg-white border border-purple-200 rounded-lg text-xs">
                    <option value="SharpeRatio">Sharpe Ratio</option>
                    <option value="NetProfit">Net Profit</option>
                    <option value="SortinoRatio">Sortino Ratio</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {runKind === 'WalkForward' && (
            <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2">
              <h4 className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-blue-700" />
                <span>Walk-Forward Cross-Validation Windows</span>
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-blue-800 text-[10px] mb-0.5">In-Sample (%)</label>
                  <input type="number" value={inSamplePct} onChange={(e) => setInSamplePct(Number(e.target.value))} className="w-full px-2 py-1 bg-white border border-blue-200 rounded-lg text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-blue-800 text-[10px] mb-0.5">Out-Sample (%)</label>
                  <input type="number" value={outOfSamplePct} onChange={(e) => setOutOfSamplePct(Number(e.target.value))} className="w-full px-2 py-1 bg-white border border-blue-200 rounded-lg text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-blue-800 text-[10px] mb-0.5">Window Splits</label>
                  <input type="number" value={windowSplits} onChange={(e) => setWindowSplits(Number(e.target.value))} className="w-full px-2 py-1 bg-white border border-blue-200 rounded-lg text-xs font-mono" />
                </div>
              </div>
            </div>
          )}

          {/* Profile Badge */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-zinc-50 border border-zinc-200 text-[11px]">
            <span className="font-semibold text-zinc-600">Active Profile:</span>
            <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 font-mono">Strategy: {detectedStrategy}</span>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">Adapter: {detectedAdapter}</span>
            {detectedHooks.map((h) => (
              <span key={h} className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-mono">Hook: {h}</span>
            ))}
          </div>

          {/* Market & Capital */}
          <div className="border-t border-zinc-100 pt-2.5">
            <h4 className="text-xs font-semibold text-zinc-900 mb-1.5 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-600" />
              <span>Market & Capital Specifications</span>
            </h4>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-zinc-600 mb-1">Symbol</label>
                <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 text-xs">
                  <option value="BTC/USDT">BTC/USDT (Crypto)</option>
                  <option value="ETH/USDT">ETH/USDT (Crypto)</option>
                  <option value="SOL/USDT">SOL/USDT (Crypto)</option>
                  <option value="SPY">SPY (Equities)</option>
                  <option value="EUR/USD">EUR/USD (Forex)</option>
                </select>
              </div>
              <div>
                <label className="block text-zinc-600 mb-1">Bar Granularity</label>
                <select value={barSize} onChange={(e) => setBarSize(e.target.value)} className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 text-xs">
                  <option value="1s">1 Second</option>
                  <option value="1m">1 Minute</option>
                  <option value="5m">5 Minutes</option>
                  <option value="15m">15 Minutes</option>
                  <option value="1h">1 Hour</option>
                  <option value="1d">1 Day</option>
                </select>
              </div>
              <div>
                <label className="block text-zinc-600 mb-1">Initial Capital ($)</label>
                <input type="number" value={initialCapital} onChange={(e) => setInitialCapital(Number(e.target.value))} step={1000} className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 text-xs font-mono" />
              </div>
            </div>
          </div>

          {/* Strategy Slot Parameters */}
          <div className="border-t border-zinc-100 pt-2.5">
            <h4 className="text-xs font-semibold text-zinc-900 mb-1.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Strategy Slot Knobs ({detectedStrategy})</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div>
                <label className="block text-zinc-600 text-[10px] mb-1">Fast Period</label>
                <input type="number" value={fastPeriod} onChange={(e) => setFastPeriod(Number(e.target.value))} className="w-full px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 text-xs font-mono" />
              </div>
              <div>
                <label className="block text-zinc-600 text-[10px] mb-1">Slow Period</label>
                <input type="number" value={slowPeriod} onChange={(e) => setSlowPeriod(Number(e.target.value))} className="w-full px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 text-xs font-mono" />
              </div>
              <div>
                <label className="block text-zinc-600 text-[10px] mb-1">Stop Loss %</label>
                <input type="number" step="0.1" value={stopLossPct} onChange={(e) => setStopLossPct(Number(e.target.value))} className="w-full px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 text-xs font-mono" />
              </div>
              <div>
                <label className="block text-zinc-600 text-[10px] mb-1">Take Profit %</label>
                <input type="number" step="0.1" value={takeProfitPct} onChange={(e) => setTakeProfitPct(Number(e.target.value))} className="w-full px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 text-xs font-mono" />
              </div>
              <div>
                <label className="block text-zinc-600 text-[10px] mb-1">Leverage</label>
                <input type="number" step="0.5" value={leverage} onChange={(e) => setLeverage(Number(e.target.value))} className="w-full px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 text-xs font-mono" />
              </div>
            </div>
          </div>

          {/* Hooks Guardrails */}
          <div className="border-t border-zinc-100 pt-2.5">
            <h4 className="text-xs font-semibold text-zinc-900 mb-1.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              <span>Safety Hook Guardrails</span>
            </h4>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-zinc-600 text-[11px] mb-1">Max DD Limit (%)</label>
                <input type="number" step="0.5" value={maxDrawdownPct} onChange={(e) => setMaxDrawdownPct(Number(e.target.value))} className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 text-xs font-mono" />
              </div>
              <div>
                <label className="block text-zinc-600 text-[11px] mb-1">Max Position (%)</label>
                <input type="number" step="1" value={maxPositionPct} onChange={(e) => setMaxPositionPct(Number(e.target.value))} className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 text-xs font-mono" />
              </div>
              <div>
                <label className="block text-zinc-600 text-[11px] mb-1">Throttle (req/s)</label>
                <input type="number" value={orderRateLimit} onChange={(e) => setOrderRateLimit(Number(e.target.value))} className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 text-xs font-mono" />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-end gap-2.5">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-lg text-xs">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center gap-2 text-xs shadow-sm">
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{busy ? 'Launching...' : 'Start Execution'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
