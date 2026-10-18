'use client';

import React, { useState, useEffect } from 'react';
import { Play, Sliders, Shield, Zap, X, Calendar, Settings2, Dna, ClipboardPaste, Trash2, Check } from 'lucide-react';
import { formatHash } from '@razor/ui-kit';
import { getApiClient, type EngineInstancePayload, type FlowRunPayload, type WinningDnaPayload } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';

export interface LaunchRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  instances: EngineInstancePayload[];
  launchInstanceId?: string;
  setLaunchInstanceId?: (id: string) => void;
  launchKind?: 'Backtest' | 'Optimization' | 'WalkForward' | 'Live';
  setLaunchKind?: (kind: 'Backtest' | 'Optimization' | 'WalkForward' | 'Live') => void;
  launchSeed?: number;
  setLaunchSeed?: (seed: number) => void;
  initialDna?: WinningDnaPayload;
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
  initialDna,
  launching: extLaunching,
  onSubmit: extOnSubmit,
  onRunLaunched,
}: LaunchRunModalProps) {
  const toast = useToast();

  const [selectedInstanceId, setSelectedInstanceId] = useState<string>(
    extInstId || (instances.length > 0 ? instances[0].instanceId : '')
  );
  const [runKind, setRunKind] = useState<'Backtest' | 'Optimization' | 'WalkForward' | 'Live'>(extKind || 'Backtest');
  const [seed, setSeed] = useState<number>(extSeed ?? 42);
  const [submitting, setSubmitting] = useState(false);

  // Active DNA state & direct paste
  const [activeDna, setActiveDna] = useState<WinningDnaPayload | null>(initialDna || null);
  const [isDnaDrawerOpen, setIsDnaDrawerOpen] = useState(false);
  const [rawDnaText, setRawDnaText] = useState('');

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
        if (d.activeSelections?.strategy && !initialDna?.slots?.strategy) setDetectedStrategy(d.activeSelections.strategy);
        if (d.activeSelections?.adapter && !initialDna?.slots?.adapter) setDetectedAdapter(d.activeSelections.adapter);
        if (Array.isArray(d.activeSelections?.hookPlugins) && d.activeSelections.hookPlugins.length > 0) {
          setDetectedHooks(d.activeSelections.hookPlugins);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [selectedInstanceId, isOpen, initialDna]);

  function applyDnaPayload(dnaInput: any) {
    const d: WinningDnaPayload = dnaInput?.winningDna || dnaInput?.dna || dnaInput;
    if (!d || typeof d !== 'object') {
      throw new Error('Input is not a valid JSON object.');
    }
    if (!d.genes && !d.parameters && !d.slots) {
      throw new Error('DNA object must contain genes, parameters, or slots.');
    }

    setRunKind('Backtest');
    extSetKind?.('Backtest');

    if (d.slots?.strategy) {
      setDetectedStrategy(d.slots.strategy);
    }
    if (d.slots?.adapter) {
      setDetectedAdapter(d.slots.adapter);
    }
    const params = d.parameters || {};
    if (params.FastPeriod != null || params.fastPeriod != null) {
      setFastPeriod(Number(params.FastPeriod ?? params.fastPeriod));
    }
    if (params.SlowPeriod != null || params.slowPeriod != null) {
      setSlowPeriod(Number(params.SlowPeriod ?? params.slowPeriod));
    }
    if (params.StopLossPct != null || params.stopLossPct != null) {
      setStopLossPct(Number(params.StopLossPct ?? params.stopLossPct));
    }
    if (params.TakeProfitPct != null || params.takeProfitPct != null) {
      setTakeProfitPct(Number(params.TakeProfitPct ?? params.takeProfitPct));
    }
    if (params.Leverage != null || params.leverage != null) {
      setLeverage(Number(params.Leverage ?? params.leverage));
    }
    if (d.execution) {
      if (d.execution.symbols && d.execution.symbols.length > 0) {
        setSymbol(d.execution.symbols[0]);
      }
      if (d.execution.timeframes && d.execution.timeframes.length > 0) {
        setBarSize(d.execution.timeframes[0]);
      }
      if (d.execution.initialBalance) {
        setInitialCapital(Number(d.execution.initialBalance));
      }
      if (d.execution.leverage) {
        setLeverage(Number(d.execution.leverage));
      }
    }

    const foundSeed = (d as any).seed ?? (d as any).baseSeed ?? (d as any).masterSeed ?? (d as any).geneticSeed ?? (d as any).execution?.seed;
    if (foundSeed != null && !isNaN(Number(foundSeed))) {
      const s = Number(foundSeed);
      setSeed(s);
      extSetSeed?.(s);
    }

    setActiveDna(d);
    setIsDnaDrawerOpen(false);
    setRawDnaText('');
    toast.success('Strategy DNA Applied', `Imported ${d.slots?.strategy || 'TrendFollowing'} with ${d.genes?.length || 0} genes. Auto-configured for Backtest.`);
  }

  useEffect(() => {
    if (!initialDna || !isOpen) return;
    try {
      applyDnaPayload(initialDna);
    } catch {
      // Fallback
      setActiveDna(initialDna);
    }
  }, [initialDna, isOpen]);

  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        toast.error('Clipboard Empty', 'No text found in system clipboard.');
        return;
      }
      setRawDnaText(text);
      const parsed = JSON.parse(text);
      applyDnaPayload(parsed);
    } catch (err) {
      toast.error('Clipboard / Parse Error', err instanceof Error ? err.message : 'Failed to parse JSON from clipboard.');
    }
  }

  function handleApplyRawDna() {
    try {
      if (!rawDnaText.trim()) {
        toast.error('Empty DNA', 'Paste DNA JSON into the textarea first.');
        return;
      }
      const parsed = JSON.parse(rawDnaText);
      applyDnaPayload(parsed);
    } catch (err) {
      toast.error('Invalid JSON', err instanceof Error ? err.message : 'Please check your JSON format.');
    }
  }

  function handleClearDna() {
    setActiveDna(null);
    toast.info('DNA Cleared', 'Active winning DNA removed. Standard strategy parameters active.');
  }

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
      Genes: activeDna?.genes || undefined,
      WinningDna: activeDna || undefined,
      // Structured sections
      market: { symbol, barSize, initialCapital: Number(initialCapital), startDate: startIso, endDate: endIso },
      strategy: {
        name: detectedStrategy,
        fastPeriod: Number(fastPeriod),
        slowPeriod: Number(slowPeriod),
        stopLossPct: Number(stopLossPct),
        takeProfitPct: Number(takeProfitPct),
        leverage: Number(leverage),
        genes: activeDna?.genes,
        parameters: activeDna?.parameters,
      },
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
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 font-mono text-xs">
      <div className="bg-white border border-black max-w-2xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto text-black">
        <div className="flex items-center justify-between pb-3 border-b border-black">
          <div>
            <h3 className="text-base font-bold text-black uppercase">
              Launch Deterministic Flow Run
            </h3>
            <p className="text-xs text-zinc-600 mt-0.5">Configure execution kind parameters, dates, broker adapter, and safety hooks.</p>
          </div>
          <button type="button" onClick={onClose} className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white font-bold transition-colors">
            [CLOSE]
          </button>
        </div>

        {/* DNA Injected Banner */}
        {activeDna && (
          <div className="p-3 bg-white border border-black flex items-start justify-between gap-3">
            <div className="text-xs font-mono">
              <div className="font-bold text-black uppercase flex items-center gap-2">
                <span>Strategy DNA Injected for Exact Backtest</span>
                <span className="px-1.5 py-0.5 border border-black bg-white text-black text-[10px]">
                  Fitness {activeDna.fitness != null ? activeDna.fitness.toFixed(3) : '—'}
                </span>
              </div>
              <p className="text-zinc-700 text-[11px] mt-0.5">
                Strategy <strong>{detectedStrategy}</strong> & broker <strong>{detectedAdapter}</strong> with {activeDna.genes?.length ?? 0} chromosome genes loaded.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClearDna}
              className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white text-xs font-bold transition-colors"
              title="Remove injected DNA"
            >
              [CLEAR]
            </button>
          </div>
        )}

        {/* Live Execution Mode Banner */}
        {runKind === 'Live' && (
          <div className="p-2.5 bg-white border border-black text-green-600 font-bold text-xs flex items-center gap-2">
            <span>[LIVE EXECUTION] Real-time orders will be dispatched to broker adapter: <strong>{detectedAdapter}</strong>.</span>
          </div>
        )}

        {/* Direct DNA Paste Section */}
        <div className="border border-black bg-white p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-black uppercase tracking-wider">
              Winning Strategy DNA Loader
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white text-[11px] font-bold transition-colors"
                title="Paste Winning DNA JSON from clipboard"
              >
                [LOAD FROM CLIPBOARD]
              </button>
              <button
                type="button"
                onClick={() => setIsDnaDrawerOpen(!isDnaDrawerOpen)}
                className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white text-[11px] font-bold transition-colors"
              >
                {isDnaDrawerOpen ? '[CLOSE JSON INPUT]' : '[PASTE RAW JSON]'}
              </button>
            </div>
          </div>

          {isDnaDrawerOpen && (
            <div className="pt-2 border-t border-black space-y-2">
              <textarea
                value={rawDnaText}
                onChange={(e) => setRawDnaText(e.target.value)}
                placeholder='Paste Winning DNA JSON e.g. { "genes": [14, 48, 0.02, 0.05, 1.0], "parameters": { "FastPeriod": 14, ... }, "slots": { "strategy": "TrendFollowing" } }'
                className="w-full h-24 p-2 bg-white border border-black text-xs font-mono text-black placeholder-zinc-500 focus:outline-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDnaDrawerOpen(false)}
                  className="px-2.5 py-1 border border-black bg-white hover:bg-black hover:text-white text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyRawDna}
                  className="px-3 py-1 border border-black bg-black text-white hover:bg-white hover:text-black text-xs font-bold"
                >
                  Apply DNA to Backtest
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Presets */}
        <div className="border border-black bg-white p-2.5">
          <div className="text-[11px] font-bold text-black uppercase tracking-wider mb-1.5">
            1-Click Configuration Presets
          </div>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" onClick={() => applyPreset(p)} className="px-2.5 py-1.5 border border-black bg-white hover:bg-zinc-100 text-left transition-colors">
                <div className="text-xs font-bold text-black">{p.label}</div>
                <div className="text-[10px] text-zinc-600">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Target & Kind & Seed */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-black font-bold mb-1">Target Engine</label>
              <select value={selectedInstanceId} onChange={(e) => { setSelectedInstanceId(e.target.value); extSetInstId?.(e.target.value); }} required className="w-full px-2.5 py-1.5 bg-white border border-black text-black focus:outline-none text-xs font-mono">
                {instances.map((i) => (
                  <option key={i.instanceId} value={i.instanceId}>{i.name || i.engineId} ({formatHash(i.instanceId, 4)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-black font-bold mb-1">Execution Kind</label>
              <select value={runKind} onChange={(e) => { const v = e.target.value as any; setRunKind(v); extSetKind?.(v); }} className="w-full px-2.5 py-1.5 bg-white border border-black text-black focus:outline-none text-xs font-bold">
                <option value="Backtest">Backtest (Historical Sim)</option>
                <option value="Optimization">Optimization (Parameter Tuning)</option>
                <option value="WalkForward">Walk-Forward (Out-of-sample)</option>
                <option value="Live">Live (Real-Time Automated Trading)</option>
              </select>
            </div>
            <div>
              <label className="block text-black font-bold mb-1">PRNG Base Seed</label>
              <input type="number" value={seed} onChange={(e) => { const v = Number(e.target.value); setSeed(v); extSetSeed?.(v); }} required className="w-full px-2.5 py-1.5 bg-white border border-black text-black focus:outline-none text-xs font-mono" />
            </div>
          </div>

          {/* Date Range Selection with Presets */}
          <div className="border-t border-black pt-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-xs font-bold text-black uppercase">
                Simulation Date Range
              </h4>
              <div className="flex items-center gap-1 font-mono text-[10px]">
                <button type="button" onClick={() => setDateDaysAgo(7)} className="px-1.5 py-0.5 border border-black bg-white hover:bg-black hover:text-white font-bold">7D</button>
                <button type="button" onClick={() => setDateDaysAgo(30)} className="px-1.5 py-0.5 border border-black bg-white hover:bg-black hover:text-white font-bold">30D</button>
                <button type="button" onClick={() => setDateDaysAgo(90)} className="px-1.5 py-0.5 border border-black bg-white hover:bg-black hover:text-white font-bold">90D</button>
                <button type="button" onClick={() => setDateDaysAgo(365)} className="px-1.5 py-0.5 border border-black bg-white hover:bg-black hover:text-white font-bold">1Y</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-black text-[11px] font-bold mb-1">Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="w-full px-2 py-1.5 bg-white border border-black text-black text-xs font-mono focus:outline-none" />
              </div>
              <div>
                <label className="block text-black text-[11px] font-bold mb-1">End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="w-full px-2 py-1.5 bg-white border border-black text-black text-xs font-mono focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Execution Kind Specific Knobs */}
          {runKind === 'Optimization' && (
            <div className="p-2.5 border border-black bg-white space-y-2">
              <h4 className="text-xs font-bold text-black uppercase">
                Genetic Algorithm Tuning Parameters
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-black text-[10px] font-bold mb-0.5">Generations</label>
                  <input type="number" value={generations} onChange={(e) => setGenerations(Number(e.target.value))} className="w-full px-2 py-1 bg-white border border-black text-black text-xs font-mono focus:outline-none" />
                </div>
                <div>
                  <label className="block text-black text-[10px] font-bold mb-0.5">Population</label>
                  <input type="number" value={populationSize} onChange={(e) => setPopulationSize(Number(e.target.value))} className="w-full px-2 py-1 bg-white border border-black text-black text-xs font-mono focus:outline-none" />
                </div>
                <div>
                  <label className="block text-black text-[10px] font-bold mb-0.5">Mutation Rate</label>
                  <input type="number" step="0.01" value={mutationRate} onChange={(e) => setMutationRate(Number(e.target.value))} className="w-full px-2 py-1 bg-white border border-black text-black text-xs font-mono focus:outline-none" />
                </div>
                <div>
                  <label className="block text-black text-[10px] font-bold mb-0.5">Objective</label>
                  <select value={objectiveMetric} onChange={(e) => setObjectiveMetric(e.target.value)} className="w-full px-1.5 py-1 bg-white border border-black text-black text-xs focus:outline-none font-bold">
                    <option value="SharpeRatio">Sharpe Ratio</option>
                    <option value="NetProfit">Net Profit</option>
                    <option value="SortinoRatio">Sortino Ratio</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {runKind === 'WalkForward' && (
            <div className="p-2.5 border border-black bg-white space-y-2">
              <h4 className="text-xs font-bold text-black uppercase">
                Walk-Forward Cross-Validation Windows
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-black text-[10px] font-bold mb-0.5">In-Sample (%)</label>
                  <input type="number" value={inSamplePct} onChange={(e) => setInSamplePct(Number(e.target.value))} className="w-full px-2 py-1 bg-white border border-black text-black text-xs font-mono focus:outline-none" />
                </div>
                <div>
                  <label className="block text-black text-[10px] font-bold mb-0.5">Out-Sample (%)</label>
                  <input type="number" value={outOfSamplePct} onChange={(e) => setOutOfSamplePct(Number(e.target.value))} className="w-full px-2 py-1 bg-white border border-black text-black text-xs font-mono focus:outline-none" />
                </div>
                <div>
                  <label className="block text-black text-[10px] font-bold mb-0.5">Window Splits</label>
                  <input type="number" value={windowSplits} onChange={(e) => setWindowSplits(Number(e.target.value))} className="w-full px-2 py-1 bg-white border border-black text-black text-xs font-mono focus:outline-none" />
                </div>
              </div>
            </div>
          )}

          {/* Profile Badge */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 border border-black bg-white text-[11px]">
            <span className="font-bold text-black">Active Profile:</span>
            <span className="px-2 py-0.5 border border-black bg-white text-black font-mono font-bold">Strategy: {detectedStrategy}</span>
            <span className="px-2 py-0.5 border border-black bg-white text-black font-mono font-bold">Adapter: {detectedAdapter}</span>
            {detectedHooks.map((h) => (
              <span key={h} className="px-2 py-0.5 border border-black bg-white text-black font-mono font-bold">Hook: {h}</span>
            ))}
          </div>

          {/* Market & Capital */}
          <div className="border-t border-black pt-2.5">
            <h4 className="text-xs font-bold text-black mb-1.5 uppercase">
              Market & Capital Specifications
            </h4>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-black font-bold mb-1">Symbol</label>
                <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-black text-black text-xs focus:outline-none">
                  <option value="BTC/USDT">BTC/USDT (Crypto)</option>
                  <option value="ETH/USDT">ETH/USDT (Crypto)</option>
                  <option value="SOL/USDT">SOL/USDT (Crypto)</option>
                  <option value="SPY">SPY (Equities)</option>
                  <option value="EUR/USD">EUR/USD (Forex)</option>
                </select>
              </div>
              <div>
                <label className="block text-black font-bold mb-1">Bar Granularity</label>
                <select value={barSize} onChange={(e) => setBarSize(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-black text-black text-xs focus:outline-none">
                  <option value="1s">1 Second</option>
                  <option value="1m">1 Minute</option>
                  <option value="5m">5 Minutes</option>
                  <option value="15m">15 Minutes</option>
                  <option value="1h">1 Hour</option>
                  <option value="1d">1 Day</option>
                </select>
              </div>
              <div>
                <label className="block text-black font-bold mb-1">Initial Capital ($)</label>
                <input type="number" value={initialCapital} onChange={(e) => setInitialCapital(Number(e.target.value))} step={1000} className="w-full px-2 py-1.5 bg-white border border-black text-black text-xs font-mono focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Strategy Slot Parameters */}
          <div className="border-t border-black pt-2.5">
            <h4 className="text-xs font-bold text-black mb-1.5 uppercase">
              Strategy Slot Knobs ({detectedStrategy})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div>
                <label className="block text-black text-[10px] font-bold mb-1">Fast Period</label>
                <input type="number" value={fastPeriod} onChange={(e) => setFastPeriod(Number(e.target.value))} className="w-full px-2 py-1 bg-white border border-black text-black text-xs font-mono focus:outline-none" />
              </div>
              <div>
                <label className="block text-black text-[10px] font-bold mb-1">Slow Period</label>
                <input type="number" value={slowPeriod} onChange={(e) => setSlowPeriod(Number(e.target.value))} className="w-full px-2 py-1 bg-white border border-black text-black text-xs font-mono focus:outline-none" />
              </div>
              <div>
                <label className="block text-black text-[10px] font-bold mb-1">Stop Loss %</label>
                <input type="number" step="0.1" value={stopLossPct} onChange={(e) => setStopLossPct(Number(e.target.value))} className="w-full px-2 py-1 bg-white border border-black text-black text-xs font-mono focus:outline-none" />
              </div>
              <div>
                <label className="block text-black text-[10px] font-bold mb-1">Take Profit %</label>
                <input type="number" step="0.1" value={takeProfitPct} onChange={(e) => setTakeProfitPct(Number(e.target.value))} className="w-full px-2 py-1 bg-white border border-black text-black text-xs font-mono focus:outline-none" />
              </div>
              <div>
                <label className="block text-black text-[10px] font-bold mb-1">Leverage</label>
                <input type="number" step="0.5" value={leverage} onChange={(e) => setLeverage(Number(e.target.value))} className="w-full px-2 py-1 bg-white border border-black text-black text-xs font-mono focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Hooks Guardrails */}
          <div className="border-t border-black pt-2.5">
            <h4 className="text-xs font-bold text-black mb-1.5 uppercase">
              Safety Hook Guardrails
            </h4>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-black text-[11px] font-bold mb-1">Max DD Limit (%)</label>
                <input type="number" step="0.5" value={maxDrawdownPct} onChange={(e) => setMaxDrawdownPct(Number(e.target.value))} className="w-full px-2 py-1.5 bg-white border border-black text-black text-xs font-mono focus:outline-none" />
              </div>
              <div>
                <label className="block text-black text-[11px] font-bold mb-1">Max Position (%)</label>
                <input type="number" step="1" value={maxPositionPct} onChange={(e) => setMaxPositionPct(Number(e.target.value))} className="w-full px-2 py-1.5 bg-white border border-black text-black text-xs font-mono focus:outline-none" />
              </div>
              <div>
                <label className="block text-black text-[11px] font-bold mb-1">Throttle (req/s)</label>
                <input type="number" value={orderRateLimit} onChange={(e) => setOrderRateLimit(Number(e.target.value))} className="w-full px-2 py-1.5 bg-white border border-black text-black text-xs font-mono focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-black flex items-center justify-end gap-2.5">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-black bg-white hover:bg-black hover:text-white text-black font-bold text-xs transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="px-4 py-2 border border-black bg-black hover:bg-white hover:text-black text-white font-bold text-xs transition-colors disabled:opacity-50">
              <span>{busy ? '[LAUNCHING...]' : '[START EXECUTION]'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
