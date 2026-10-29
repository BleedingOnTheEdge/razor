'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Play,
  ArrowLeft,
  Dna,
  ClipboardPaste,
  Check,
  Calendar,
  Shield,
  Layers,
  Settings2,
  Trash2,
  Server,
  Zap,
} from 'lucide-react';
import { formatHash } from '@razor/ui-kit';
import { NewRunWalkForwardSection } from './NewRunWalkForwardSection';
import { NewRunRiskSection } from './NewRunRiskSection';

import { getApiBaseUrl, getAuthHeaders, getApiClient, type EngineInstancePayload, type WinningDnaPayload } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';

interface StrategyGeneDef {
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  description: string;
}

const STRATEGY_GENES: Record<string, StrategyGeneDef[]> = {
  TrendFollowing: [
    { name: 'fastPeriod', label: 'Fast Period (Ticks/Bars)', min: 2, max: 100, step: 1, defaultValue: 14, description: 'Short-term EMA window' },
    { name: 'slowPeriod', label: 'Slow Period (Ticks/Bars)', min: 5, max: 300, step: 1, defaultValue: 50, description: 'Long-term EMA trend baseline' },
    { name: 'stopLossPct', label: 'Stop Loss %', min: 0.1, max: 15.0, step: 0.1, defaultValue: 2.0, description: 'Protective stop boundary from entry' },
    { name: 'takeProfitPct', label: 'Take Profit %', min: 0.1, max: 30.0, step: 0.1, defaultValue: 5.0, description: 'Deterministic profit target' },
    { name: 'leverage', label: 'Leverage Multiple', min: 1, max: 50, step: 0.5, defaultValue: 1.0, description: 'Portfolio margin multiplier' },
  ],
  MeanRevertingPairs: [
    { name: 'lookbackPeriod', label: 'Lookback Period (Ticks/Bars)', min: 5, max: 100, step: 1, defaultValue: 20, description: 'Rolling z-score mean calculation window' },
    { name: 'entryDeviation', label: 'Entry Deviation (Sigma)', min: 0.5, max: 4.0, step: 0.1, defaultValue: 2.0, description: 'Statistical standard deviation threshold' },
    { name: 'stopLossPct', label: 'Stop Loss %', min: 0.1, max: 10.0, step: 0.1, defaultValue: 2.0, description: 'Adverse reversion stop percentage' },
    { name: 'takeProfitPct', label: 'Take Profit %', min: 0.1, max: 15.0, step: 0.1, defaultValue: 3.0, description: 'Mean reversion profit target' },
    { name: 'leverage', label: 'Leverage Multiple', min: 1, max: 50, step: 0.5, defaultValue: 1.0, description: 'Portfolio margin multiplier' },
  ],
};

function NewRunForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cloneFromId = searchParams.get('cloneFrom');
  const toast = useToast();

  const [instances, setInstances] = useState<EngineInstancePayload[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(true);
  const [cloning, setCloning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [runKind, setRunKind] = useState<'Backtest' | 'Optimization' | 'WalkForward'>('Backtest');
  const [seed, setSeed] = useState<number>(42);

  // Strategy & Adapter Slot Selection
  const [strategyName, setStrategyName] = useState<string>('TrendFollowing');
  const [adapterName, setAdapterName] = useState<string>('PaperBroker');

  // DNA Drawer & state
  const [activeDna, setActiveDna] = useState<WinningDnaPayload | null>(null);
  const [isDnaDrawerOpen, setIsDnaDrawerOpen] = useState(false);
  const [rawDnaText, setRawDnaText] = useState('');

  // Date range
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState<string>(thirtyDaysAgo);
  const [endDate, setEndDate] = useState<string>(today);

  // Market & Capital specifications
  const [symbol, setSymbol] = useState<string>('BTC/USDT');
  const [barSize, setBarSize] = useState<string>('Tick');
  const [initialCapital, setInitialCapital] = useState<number>(100000);

  // Dynamic Strategy Gene values
  const [strategyGenes, setStrategyGenes] = useState<Record<string, number>>({
    fastPeriod: 14,
    slowPeriod: 50,
    stopLossPct: 2.0,
    takeProfitPct: 5.0,
    leverage: 1.0,
    lookbackPeriod: 20,
    entryDeviation: 2.0,
  });

  // Adapter gene values
  const [slippageBps, setSlippageBps] = useState<number>(2);
  const [feeBps, setFeeBps] = useState<number>(5);

  // Optimization knobs
  const [generations, setGenerations] = useState<number>(10);
  const [populationSize, setPopulationSize] = useState<number>(40);
  const [mutationRate, setMutationRate] = useState<number>(0.05);
  const [objectiveMetric, setObjectiveMetric] = useState<string>('SharpeRatio');

  // Walk-forward knobs
  const [inSamplePct, setInSamplePct] = useState<number>(70);
  const [outOfSamplePct, setOutOfSamplePct] = useState<number>(30);
  const [windowSplits, setWindowSplits] = useState<number>(5);

  // Hook safety guardrails
  const [maxDrawdownPct, setMaxDrawdownPct] = useState<number>(10.0);
  const [maxPositionPct, setMaxPositionPct] = useState<number>(25.0);
  const [orderRateLimit, setOrderRateLimit] = useState<number>(100);

  // Load instances
  useEffect(() => {
    async function fetchInstances() {
      setLoadingInstances(true);
      try {
        const baseUrl = getApiBaseUrl();
        const headers = getAuthHeaders();
        const res = await fetch(`${baseUrl}/api/instances`, { headers });
        if (res.ok) {
          const raw = await res.json();
          const items: EngineInstancePayload[] = Array.isArray(raw) ? raw : raw.items || [];
          setInstances(items);
          if (items.length > 0 && !selectedInstanceId) {
            setSelectedInstanceId(items[0].instanceId);
          }
        }
      } catch {
        // Non-fatal instance fetch
      } finally {
        setLoadingInstances(false);
      }
    }
    fetchInstances();
  }, []);

  // Handle cloneFrom if specified in query params
  useEffect(() => {
    if (!cloneFromId) return;

    async function fetchCloneSource() {
      setCloning(true);
      try {
        const baseUrl = getApiBaseUrl();
        const headers = getAuthHeaders();
        const [runRes, reportRes] = await Promise.all([
          fetch(`${baseUrl}/api/runs/${cloneFromId}`, { headers }),
          fetch(`${baseUrl}/api/reports/${cloneFromId}`, { headers }),
        ]);

        if (runRes.ok) {
          const run = await runRes.json();
          if (run.kind) setRunKind(run.kind);
          if (run.engineInstanceId) setSelectedInstanceId(run.engineInstanceId);
          if (run.baseSeed) setSeed(run.baseSeed);

          if (run.configurationJson) {
            try {
              const cfg = JSON.parse(run.configurationJson);
              if (cfg.market?.symbol) setSymbol(cfg.market.symbol);
              if (cfg.market?.barSize) setBarSize(cfg.market.barSize);
              if (cfg.market?.initialCapital) setInitialCapital(cfg.market.initialCapital);
              if (cfg.StrategyName) setStrategyName(cfg.StrategyName);
              if (cfg.strategy?.name) setStrategyName(cfg.strategy.name);
              if (cfg.strategy) {
                setStrategyGenes((prev) => ({ ...prev, ...cfg.strategy }));
              }
              if (cfg.hooks?.maxDrawdownPct) setMaxDrawdownPct(cfg.hooks.maxDrawdownPct);
              if (cfg.hooks?.maxPositionPct) setMaxPositionPct(cfg.hooks.maxPositionPct);
              if (cfg.hooks?.orderRateLimit) setOrderRateLimit(cfg.hooks.orderRateLimit);
              if (cfg.WinningDna) setActiveDna(cfg.WinningDna);
            } catch {
              // Ignore json parse error
            }
          }
        }

        if (reportRes.ok) {
          const report = await reportRes.json();
          if (report.winningDna) {
            setActiveDna(report.winningDna);
            applyDnaPayload(report.winningDna);
          }
        }

        toast.info('Configuration Loaded', `Cloned parameters from run ${formatHash(cloneFromId, 8)}`);
      } catch {
        toast.error('Clone Error', 'Could not load parameters from source run.');
      } finally {
        setCloning(false);
      }
    }

    fetchCloneSource();
  }, [cloneFromId]);

  function applyDnaPayload(dna: WinningDnaPayload) {
    setActiveDna(dna);
    if (dna.parameters) {
      setStrategyGenes((prev) => ({ ...prev, ...dna.parameters }));
    }
    toast.success('DNA Injected', `Loaded chromosome ${dna.id || dna.genomeHash || 'WinningDNA'} into strategy knobs.`);
  }

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
      toast.error('Parse Error', err instanceof Error ? err.message : 'Failed to parse JSON.');
    }
  }

  function handleApplyRawDna() {
    try {
      if (!rawDnaText.trim()) {
        toast.error('Empty DNA', 'Paste DNA JSON first.');
        return;
      }
      const parsed = JSON.parse(rawDnaText);
      applyDnaPayload(parsed);
    } catch {
      toast.error('Invalid JSON', 'Please verify your DNA JSON structure.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInstanceId) {
      toast.error('Engine Required', 'Please select a target engine node.');
      return;
    }

    if (runKind === 'WalkForward') {
      if (Number(inSamplePct) + Number(outOfSamplePct) !== 100) {
        toast.error('Validation Error', 'In-Sample % and Out-of-Sample % must sum to exactly 100%.');
        return;
      }
      const startMs = new Date(startDate).getTime();
      const endMs = new Date(endDate).getTime();
      if (endMs <= startMs) {
        toast.error('Validation Error', 'End Date must be after Start Date.');
        return;
      }
    }

    const startIso = new Date(startDate + 'T00:00:00Z').toISOString();
    const endIso = new Date(endDate + 'T23:59:59Z').toISOString();

    const currentGenes = STRATEGY_GENES[strategyName] || STRATEGY_GENES.TrendFollowing;
    const activeParams: Record<string, number> = {};
    for (const g of currentGenes) {
      activeParams[g.name] = strategyGenes[g.name] ?? g.defaultValue;
    }

    const config = {
      StartDate: startIso,
      EndDate: endIso,
      Symbols: [symbol],
      AdapterName: adapterName,
      StrategyName: strategyName,
      InitialBalance: Number(initialCapital),
      Leverage: Number(strategyGenes.leverage ?? 1.0),
      ExecutionKind: runKind,
      MasterSeed: Number(seed),
      Generations: Number(generations),
      PopulationSize: Number(populationSize),
      MutationRate: Number(mutationRate),
      Genes: activeDna?.genes || Object.values(activeParams),
      WinningDna: activeDna || undefined,
      market: { symbol, barSize, initialCapital: Number(initialCapital), startDate: startIso, endDate: endIso },
      strategy: {
        name: strategyName,
        ...activeParams,
        genes: activeDna?.genes,
        parameters: activeDna?.parameters,
      },
      adapter: { name: adapterName, slippageBps: Number(slippageBps), feeBps: Number(feeBps) },
      hooks: {
        active: ['RiskGuardrail', 'PositionSizer'],
        maxDrawdownPct: Number(maxDrawdownPct),
        maxPositionPct: Number(maxPositionPct),
        orderRateLimit: Number(orderRateLimit),
      },
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
        toast.error('Launch Rejected', 'Cloud backend rejected the execution request.');
      } else if (data) {
        toast.success('Run Launched', `Flow Run #${formatHash(data.id, 6)} initiated.`);
        router.push(`/panel/reports/${data.id}`);
      }
    } catch (err) {
      toast.error('Launch Error', err instanceof Error ? err.message : 'Network execution failed.');
    } finally {
      setSubmitting(false);
    }
  }

  const activeGeneDefs = STRATEGY_GENES[strategyName] || STRATEGY_GENES.TrendFollowing;

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans text-xs text-zinc-100">
      {/* Back Link */}
      <div className="flex items-center gap-2">
        <Link href="/panel/runs" className="hover:underline flex items-center gap-1 font-bold">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK TO RUNS</span>
        </Link>
        <span>/</span>
        <span className="font-bold">Launch Flow Run</span>
        {cloneFromId && (
          <span className="border border-[#262626] px-2 py-0.5 bg-[#141414] font-bold">
            CLONED FROM: {formatHash(cloneFromId, 8)}
          </span>
        )}
      </div>

      {/* Header */}
      <div className="pb-4 border-b border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2 uppercase">
            <Play className="w-5 h-5 text-zinc-100" />
            <span>Launch Deterministic Flow Run</span>
          </h1>
          <p className="text-xs text-zinc-100 font-normal mt-1 font-sans">
            Configure algorithmic parameters, chromosomes, genetic optimization, and execution risk guardrails.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Target Engine & Execution Kind */}
        <div className="p-5 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b border-[#262626] pb-2">
            <Server className="w-4 h-4 text-zinc-100" />
            <span>1. Target Engine & Flow Mode</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-zinc-100 font-bold uppercase mb-1">
                Target Engine Instance
              </label>
              <select
                value={selectedInstanceId}
                onChange={(e) => setSelectedInstanceId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 font-mono focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
              >
                {instances.map((inst) => (
                  <option key={inst.instanceId} value={inst.instanceId}>
                    {inst.name || inst.engineId} ({formatHash(inst.instanceId, 6)}) — {inst.isConnected ? 'Connected' : 'Offline'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-100 font-bold uppercase mb-1">
                Flow Mode (Kind)
              </label>
              <select
                value={runKind}
                onChange={(e) => setRunKind(e.target.value as any)}
                className="w-full px-3 py-2 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 font-mono font-bold focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
              >
                <option value="Backtest">Backtest (Deterministic Single Run)</option>
                <option value="Optimization">Optimization (GA Genetic Evolution)</option>
                <option value="WalkForward">Walk-Forward (Sliding Out-of-Sample)</option>
              </select>
              <div className="mt-1 text-[10px] text-zinc-400 font-sans">
                Looking for Real-Time Execution? Live trading is decoupled from flow runs and managed directly in the{' '}
                <Link href="/panel/live" className="font-bold underline text-zinc-100">
                  Live Trading Manager →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: DNA & Chromosome Injection */}
        <div className="p-5 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#262626] pb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Dna className="w-4 h-4 text-zinc-100" />
              <span>2. Strategy DNA & Chromosome Seed</span>
            </h2>
            <button
              type="button"
              onClick={() => setIsDnaDrawerOpen(!isDnaDrawerOpen)}
              className="text-xs font-bold text-zinc-100 hover:underline"
            >
              {isDnaDrawerOpen ? 'HIDE DNA PASTE' : 'PASTE CUSTOM DNA'}
            </button>
          </div>

          {activeDna ? (
            <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-zinc-100 block">
                  ACTIVE CHROMOSOME: {activeDna.id || activeDna.genomeHash || 'Custom DNA'} (Gen {activeDna.generation ?? 0})
                </span>
                <span className="text-[11px] text-zinc-400 font-sans block mt-0.5">
                  Fitness: {(activeDna as any).fitnessScore?.toFixed(3) || activeDna.fitness?.toFixed(3) || '1.000'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveDna(null);
                  toast.info('DNA Cleared', 'Reverted to manual parameter inputs.');
                }}
                className="px-3 py-1 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-bold"
              >
                CLEAR DNA
              </button>
            </div>
          ) : (
            <p className="text-zinc-400 font-sans text-xs">
              No DNA injected. Default algorithmic parameter values are active below. You can paste a Winning DNA JSON from any previous backtest or report.
            </p>
          )}

          {isDnaDrawerOpen && (
            <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase text-zinc-100">Paste Winning DNA (JSON)</span>
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="px-2.5 py-0.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-bold text-[11px] flex items-center gap-1"
                >
                  <ClipboardPaste className="w-3 h-3" />
                  <span>PASTE FROM CLIPBOARD</span>
                </button>
              </div>
              <textarea
                value={rawDnaText}
                onChange={(e) => setRawDnaText(e.target.value)}
                rows={3}
                placeholder='{"id":"dna-01","genes":{"fastPeriod":12,"slowPeriod":26,"stopLossPct":1.5}}'
                className="w-full p-2 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 font-mono focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
              />
              <button
                type="button"
                onClick={handleApplyRawDna}
                className="px-3 py-1 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-bold"
              >
                INJECT DNA INTO FORM
              </button>
            </div>
          )}
        </div>

        {/* SECTION 3: Strategy & Extension Slots */}
        <div className="p-5 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b border-[#262626] pb-2">
            <Settings2 className="w-4 h-4 text-zinc-100" />
            <span>3. Extension Slots & Configured Genes</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-100 font-bold uppercase mb-1">Strategy Extension Slot</label>
              <select
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 font-mono font-bold focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
              >
                <option value="TrendFollowing">TrendFollowing (Moving Average Crossover)</option>
                <option value="MeanRevertingPairs">MeanRevertingPairs (Statistical Deviation)</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-100 font-bold uppercase mb-1">Broker Adapter Slot</label>
              <select
                value={adapterName}
                onChange={(e) => setAdapterName(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 font-mono font-bold focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
              >
                <option value="PaperBroker">PaperBroker (Built-in Simulated Execution)</option>
              </select>
            </div>
          </div>

          {/* Strategy Genes Listing */}
          <div className="pt-2 border-t border-[#262626] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase text-zinc-100 text-xs">Strategy Genes & Parameter Boundaries</span>
              <span className="text-[11px] text-zinc-500 font-sans">Validated boundaries strictly enforced</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {activeGeneDefs.map((gene) => (
                <div key={gene.name} className="p-3 border border-[#262626] bg-[#141414] rounded-lg space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-zinc-100 uppercase text-[11px]">{gene.label}</label>
                    <span className="text-[10px] text-zinc-500 font-mono">[{gene.min} - {gene.max}]</span>
                  </div>
                  <input
                    type="number"
                    min={gene.min}
                    max={gene.max}
                    step={gene.step}
                    value={strategyGenes[gene.name] ?? gene.defaultValue}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setStrategyGenes((prev) => ({ ...prev, [gene.name]: val }));
                    }}
                    className="w-full px-2 py-1.5 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 font-mono font-bold focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
                  />
                  <p className="text-[10px] text-zinc-400 font-sans">{gene.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Adapter Genes Listing */}
          <div className="pt-2 border-t border-[#262626] space-y-3">
            <span className="font-bold uppercase text-zinc-100 text-xs">Adapter Cost & Execution Genes</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-zinc-100 uppercase text-[11px]">Slippage (Basis Points)</label>
                  <span className="text-[10px] text-zinc-500 font-mono">[0 - 50 bps]</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={1}
                  value={slippageBps}
                  onChange={(e) => setSlippageBps(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 font-mono font-bold focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
                />
                <p className="text-[10px] text-zinc-400 font-sans">Simulated execution slippage per fill</p>
              </div>

              <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-zinc-100 uppercase text-[11px]">Exchange Fee (Basis Points)</label>
                  <span className="text-[10px] text-zinc-500 font-mono">[0 - 100 bps]</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={feeBps}
                  onChange={(e) => setFeeBps(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 font-mono font-bold focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
                />
                <p className="text-[10px] text-zinc-400 font-sans">Per-trade taker/maker fee</p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Market Specifications */}
        <div className="p-5 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b border-[#262626] pb-2">
            <Calendar className="w-4 h-4 text-zinc-100" />
            <span>4. Market Specifications & Date Boundaries</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-zinc-100 font-bold uppercase mb-1">Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 font-mono focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
              />
            </div>

            <div>
              <label className="block text-zinc-100 font-bold uppercase mb-1">Bar Size</label>
              <select
                value={barSize}
                onChange={(e) => setBarSize(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 font-mono font-bold focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
              >
                <option value="Tick">Tick (Native Real-Time Execution)</option>
                <option value="1s">1 Second</option>
                <option value="1m">1 Minute</option>
                <option value="5m">5 Minutes</option>
                <option value="15m">15 Minutes</option>
                <option value="1h">1 Hour</option>
                <option value="4h">4 Hours</option>
                <option value="1d">1 Day</option>
                <option value="1w">1 Week</option>
                <option value="1M">1 Month</option>
                <option value="1y">1 Year</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-100 font-bold uppercase mb-1">Initial Capital ($)</label>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
                min={100}
                required
                className="w-full px-3 py-2 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 font-mono focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
              />
            </div>

            <div>
              <label className="block text-zinc-100 font-bold uppercase mb-1">Master Random Seed</label>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value))}
                required
                className="w-full px-3 py-2 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 font-mono focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#262626]">
            <div>
              <label className="block text-zinc-100 font-bold uppercase mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 font-mono focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
              />
            </div>

            <div>
              <label className="block text-zinc-100 font-bold uppercase mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 font-mono focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: Mode-Specific Optimization / WalkForward Knobs */}
        {runKind === 'Optimization' && (
          <div className="p-5 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b border-[#262626] pb-2">
              <Zap className="w-4 h-4 text-zinc-100" />
              <span>5. Genetic Algorithm Evolution Parameters</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-zinc-100 font-bold uppercase mb-1">Generations</label>
                <input
                  type="number"
                  value={generations}
                  onChange={(e) => setGenerations(Number(e.target.value))}
                  min={1}
                  max={500}
                  className="w-full px-3 py-2 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 font-mono focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
                />
              </div>

              <div>
                <label className="block text-zinc-100 font-bold uppercase mb-1">Population Size</label>
                <input
                  type="number"
                  value={populationSize}
                  onChange={(e) => setPopulationSize(Number(e.target.value))}
                  min={10}
                  max={500}
                  className="w-full px-3 py-2 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 font-mono focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
                />
              </div>

              <div>
                <label className="block text-zinc-100 font-bold uppercase mb-1">Mutation Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={mutationRate}
                  onChange={(e) => setMutationRate(Number(e.target.value))}
                  min={0.01}
                  max={0.5}
                  className="w-full px-3 py-2 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 font-mono focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
                />
              </div>

              <div>
                <label className="block text-zinc-100 font-bold uppercase mb-1">Objective KPI</label>
                <select
                  value={objectiveMetric}
                  onChange={(e) => setObjectiveMetric(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-[#171717] border border-[#262626] text-zinc-100 font-mono font-bold focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
                >
                  <option value="SharpeRatio">Sharpe Ratio</option>
                  <option value="SortinoRatio">Sortino Ratio</option>
                  <option value="NetProfit">Total Net Profit</option>
                  <option value="ProfitFactor">Profit Factor</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {runKind === 'WalkForward' && (
          <NewRunWalkForwardSection
            inSamplePct={inSamplePct}
            setInSamplePct={setInSamplePct}
            outOfSamplePct={outOfSamplePct}
            setOutOfSamplePct={setOutOfSamplePct}
            windowSplits={windowSplits}
            setWindowSplits={setWindowSplits}
          />
        )}

        <NewRunRiskSection
          maxDrawdownPct={maxDrawdownPct}
          setMaxDrawdownPct={setMaxDrawdownPct}
          maxPositionPct={maxPositionPct}
          setMaxPositionPct={setMaxPositionPct}
          orderRateLimit={orderRateLimit}
          setOrderRateLimit={setOrderRateLimit}
        />

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || loadingInstances}
            className="w-full py-3 border border-[#262626] bg-[#3ECF8E] hover:bg-[#34b27b] text-[#0f0f0f] rounded-full disabled:opacity-50 font-bold text-sm uppercase transition-colors flex items-center justify-center gap-2 select-none shadow-lg shadow-[#3ECF8E]/10"
          >
            <Play className="w-4 h-4" />
            <span>{submitting ? 'TRANSMITTING WIRE CONFIGURATION...' : `TRANSMIT & LAUNCH ${runKind.toUpperCase()} →`}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewRunPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-mono font-bold text-zinc-100">LOADING RUN LAUNCHER...</div>}>
      <NewRunForm />
    </Suspense>
  );
}
