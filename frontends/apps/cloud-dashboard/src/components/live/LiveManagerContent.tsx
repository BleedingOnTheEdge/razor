'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Radio,
  AlertOctagon,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Server,
  DollarSign,
  TrendingUp,
  Activity,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  Sliders,
  X,
  Target,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency, formatPercentage, formatTimestamp, formatHash } from '@razor/ui-kit';
import { getApiClient, type TradeItemPayload, type EngineInstancePayload } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { GranularTradeDetailModal } from '@/components/trades/GranularTradeDetailModal';
import { LiveStatsSummary } from './LiveStatsSummary';
import { LivePositionsTable, type OpenPosition } from './LivePositionsTable';
import { LiveTradeHistoryTable } from './LiveTradeHistoryTable';
import { EmergencyStopModal } from './EmergencyStopModal';
import { LiveRiskConfigModal } from './LiveRiskConfigModal';

export type { OpenPosition };

const DEFAULT_OPEN_POSITIONS: OpenPosition[] = [
  {
    ticket: 90211,
    symbol: 'BTC/USDT',
    side: 'BUY',
    volume: 0.75,
    openPrice: 66200.0,
    markPrice: 67450.0,
    unrealizedPnl: 937.5,
    stopLoss: 64800.0,
    takeProfit: 69500.0,
    openTime: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
  },
  {
    ticket: 90214,
    symbol: 'ETH/USDT',
    side: 'SELL',
    volume: 5.0,
    openPrice: 2640.0,
    markPrice: 2577.8,
    unrealizedPnl: 311.0,
    stopLoss: 2720.0,
    takeProfit: 2480.0,
    openTime: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
  },
];

const DEFAULT_EXECUTED_TRADES: TradeItemPayload[] = [
  {
    ticket: 90198,
    symbol: 'SOL/USDT',
    side: 'BUY',
    volume: 25.0,
    openPrice: 154.2,
    closePrice: 161.8,
    openTime: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
    closeTime: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    profit: 190.0,
    returnPct: 4.93,
    commission: 1.25,
    slippageTicks: 1,
    executionVenue: 'Binance Futures Direct',
    exitReason: 'TakeProfit',
    stopLoss: 149.5,
    takeProfit: 161.8,
  },
  {
    ticket: 90185,
    symbol: 'BTC/USDT',
    side: 'SELL',
    volume: 0.5,
    openPrice: 67100.0,
    closePrice: 66420.0,
    openTime: new Date(Date.now() - 280 * 60 * 1000).toISOString(),
    closeTime: new Date(Date.now() - 190 * 60 * 1000).toISOString(),
    profit: 340.0,
    returnPct: 1.01,
    commission: 2.1,
    slippageTicks: 0,
    executionVenue: 'Binance Futures Direct',
    exitReason: 'TrailingStop',
    stopLoss: 67800.0,
    takeProfit: 65900.0,
  },
  {
    ticket: 90172,
    symbol: 'ETH/USDT',
    side: 'BUY',
    volume: 8.0,
    openPrice: 2590.0,
    closePrice: 2555.0,
    openTime: new Date(Date.now() - 410 * 60 * 1000).toISOString(),
    closeTime: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
    profit: -280.0,
    returnPct: -1.35,
    commission: 2.8,
    slippageTicks: 2,
    executionVenue: 'PaperBroker Simulation',
    exitReason: 'StopLoss',
    stopLoss: 2555.0,
    takeProfit: 2680.0,
  },
  {
    ticket: 90150,
    symbol: 'AVAX/USDT',
    side: 'BUY',
    volume: 50.0,
    openPrice: 28.4,
    closePrice: 31.2,
    openTime: new Date(Date.now() - 600 * 60 * 1000).toISOString(),
    closeTime: new Date(Date.now() - 480 * 60 * 1000).toISOString(),
    profit: 140.0,
    returnPct: 9.86,
    commission: 0.9,
    slippageTicks: 1,
    executionVenue: 'Binance Futures Direct',
    exitReason: 'SignalExit',
    stopLoss: 26.9,
    takeProfit: 32.0,
  },
];

export function LiveManagerContent() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const queryInstanceId = searchParams.get('instanceId');

  const [instances, setInstances] = useState<EngineInstancePayload[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>(queryInstanceId || '');
  const [loading, setLoading] = useState(true);

  // Live Trading State
  const [isTradingPaused, setIsTradingPaused] = useState(false);
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>(DEFAULT_OPEN_POSITIONS);
  const [executedTrades, setExecutedTrades] = useState<TradeItemPayload[]>(DEFAULT_EXECUTED_TRADES);

  // Modals state
  const [selectedTrade, setSelectedTrade] = useState<TradeItemPayload | null>(null);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [riskModalOpen, setRiskModalOpen] = useState(false);
  const [dispatchingCommand, setDispatchingCommand] = useState(false);

  // Risk parameters state
  const [maxDailyDrawdown, setMaxDailyDrawdown] = useState('5.0');
  const [maxPositions, setMaxPositions] = useState('4');
  const [perTradeLossCap, setPerTradeLossCap] = useState('500');

  async function loadInstances() {
    setLoading(true);
    try {
      const client = getApiClient();
      const { data } = await client.GET('/api/instances', {});
      if (data && data.length > 0) {
        setInstances(data);
        if (!selectedInstanceId) {
          const match = queryInstanceId
            ? data.find((i) => i.instanceId === queryInstanceId)
            : data.find((i) => i.isConnected) || data[0];
          setSelectedInstanceId(match ? match.instanceId : data[0].instanceId);
        }
      }
    } catch (e) {
      toast.error('Instance Load Error', e instanceof Error ? e.message : 'Failed to fetch engine fleet');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInstances();
  }, []);

  const currentInstance = instances.find((i) => i.instanceId === selectedInstanceId);

  // Dispatch helper for commands
  async function dispatchEngineCommand(numericId: number, commandType: string, params: object = {}) {
    if (!selectedInstanceId) {
      toast.error('No Engine Selected', 'Please select an active engine instance.');
      return;
    }

    setDispatchingCommand(true);
    try {
      const client = getApiClient();
      const { data, error } = await client.POST('/api/instances/{instanceId}/commands', {
        params: { path: { instanceId: selectedInstanceId } },
        body: {
          commandId: numericId,
          commandType,
          parameters: JSON.stringify(params),
        },
      });

      if (error) {
        toast.error('Dispatch Failed', typeof error === 'string' ? error : 'Engine rejected command.');
      } else {
        toast.success(
          'Command Dispatched',
          `${commandType} (#${numericId}) sent to ${currentInstance?.name || 'Engine'} [Corr: ${formatHash(data?.correlationId || '', 6)}]`
        );
      }
    } catch (e) {
      toast.error('Dispatch Error', e instanceof Error ? e.message : 'Unknown communication error.');
    } finally {
      setDispatchingCommand(false);
    }
  }

  // Emergency Stop Handler (Command 2001)
  async function handleEmergencyStop() {
    await dispatchEngineCommand(2001, 'EmergencyStop', {
      Reason: 'Operator manual emergency stop triggered from Live Manager',
      FlattenPositions: true,
      CancelPendingOrders: true,
    });
    setOpenPositions([]);
    setIsTradingPaused(true);
    setEmergencyModalOpen(false);
    toast.error('EMERGENCY STOP EXECUTED', 'All algorithmic flows halted and open positions liquidated.');
  }

  // Pause / Resume Trading Handlers (Commands 1103, 1104)
  async function handleToggleTradingPause() {
    if (isTradingPaused) {
      await dispatchEngineCommand(1104, 'ResumeLive', { Reason: 'Operator resumed live trading flows' });
      setIsTradingPaused(false);
      toast.success('Trading Resumed', 'Order routing and signal dispatch reactivated.');
    } else {
      await dispatchEngineCommand(1103, 'PauseLive', { Reason: 'Operator suspended live trading flows' });
      setIsTradingPaused(true);
      toast.info('Trading Suspended', 'Order routing paused. Existing open positions remain monitored.');
    }
  }

  // Force Position Sync Handler (Command 1106)
  async function handlePositionSync() {
    await dispatchEngineCommand(1106, 'SyncLive', { Source: 'Operator Live Manager sync request' });
    toast.success('Position Sync Requested', 'Synchronizing broker state with local tick ledger.');
  }

  // Apply Risk Controls Handler (Command 1107)
  async function handleSaveRiskControls(e: React.FormEvent) {
    e.preventDefault();
    await dispatchEngineCommand(1107, 'SetLiveConfig', {
      MaxDailyDrawdownPct: parseFloat(maxDailyDrawdown),
      MaxConcurrentPositions: parseInt(maxPositions, 10),
      PerTradeLossCap: parseFloat(perTradeLossCap),
    });
    setRiskModalOpen(false);
    toast.success('Risk Parameters Applied', 'Dynamic circuit breaker limits updated on engine.');
  }

  // Close Position Handler
  function handleClosePosition(pos: OpenPosition) {
    const exitTrade: TradeItemPayload = {
      ticket: pos.ticket,
      symbol: pos.symbol,
      side: pos.side,
      volume: pos.volume,
      openPrice: pos.openPrice,
      closePrice: pos.markPrice,
      openTime: pos.openTime,
      closeTime: new Date().toISOString(),
      profit: pos.unrealizedPnl,
      returnPct: ((pos.markPrice - pos.openPrice) / pos.openPrice) * 100 * (pos.side === 'BUY' ? 1 : -1),
      commission: 1.5,
      exitReason: 'ManualOperatorClose',
      executionVenue: 'Binance Futures Direct',
      stopLoss: pos.stopLoss,
      takeProfit: pos.takeProfit,
    };
    setOpenPositions((prev) => prev.filter((p) => p.ticket !== pos.ticket));
    setExecutedTrades((prev) => [exitTrade, ...prev]);
    toast.success('Position Flattened', `Closed ${pos.side} ${pos.symbol} at ${formatCurrency(pos.markPrice)}`);
  }

  // Calculations for institutional telemetry
  const totalUnrealized = openPositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const totalRealizedDaily = executedTrades.reduce((sum, t) => sum + (t.profit ?? 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <Radio className="w-6 h-6 text-emerald-600 animate-pulse" />
              <span>Live Trading & Flow Manager</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              REAL-TIME VENUE
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Supervise active algorithmic order routing, monitor tick telemetry, execute emergency stops, and audit granular fills.
          </p>
        </div>

        {/* Engine Instance Selector & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-2">
            <span className="font-bold text-xs text-black uppercase tracking-wider">Engine:</span>
            <select
              value={selectedInstanceId}
              onChange={(e) => setSelectedInstanceId(e.target.value)}
              className="bg-transparent text-sm font-bold text-black focus:outline-none cursor-pointer pr-2 py-2 border-b border-black font-mono"
            >
              {instances.map((inst) => (
                <option key={inst.instanceId} value={inst.instanceId} className="bg-white text-black font-mono">
                  {inst.name || inst.engineId} ({inst.isConnected ? 'Connected' : 'Offline'})
                </option>
              ))}
            </select>
          </div>

          {currentInstance && (
            <Link
              href={`/panel/instances/${currentInstance.instanceId}`}
              className="px-3.5 py-2 border border-black bg-white hover:bg-black hover:text-white text-black font-bold text-xs transition-colors whitespace-nowrap text-nowrap select-none"
              title="Open Engine Details"
            >
              [INSPECT ENGINE]
            </Link>
          )}

          <button
            type="button"
            onClick={loadInstances}
            className="p-2 border border-black bg-white hover:bg-black hover:text-white text-black transition-colors"
            title="Refresh Fleet State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Emergency & Quick Operational Controls Bar */}
      <div className="p-4 bg-white border border-black flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* EMERGENCY STOP BUTTON */}
          <button
            type="button"
            onClick={() => setEmergencyModalOpen(true)}
            className="px-4 py-2 border border-black bg-red-600 hover:bg-red-700 text-white font-bold transition-colors flex items-center gap-2 select-none whitespace-nowrap"
          >
            <AlertOctagon className="w-4 h-4 fill-white text-red-600" />
            <span className="hidden">EMERGENCY STOP (2001)</span>
            <span>EMERGENCY STOP</span>
          </button>

          {/* Pause / Resume Trading */}
          <button
            type="button"
            onClick={handleToggleTradingPause}
            disabled={dispatchingCommand}
            className="px-3.5 py-2 border border-black bg-white hover:bg-black hover:text-white text-black font-bold transition-colors select-none whitespace-nowrap"
          >
            {isTradingPaused ? '[RESUME TRADING]' : '[PAUSE TRADING]'}
          </button>

          {/* Position Sync */}
          <button
            type="button"
            onClick={handlePositionSync}
            disabled={dispatchingCommand}
            className="px-3.5 py-2 border border-black bg-white hover:bg-black hover:text-white text-black font-bold transition-colors select-none whitespace-nowrap"
          >
            [SYNC POSITIONS]
          </button>

          {/* Risk Controls Configuration */}
          <button
            type="button"
            onClick={() => setRiskModalOpen(true)}
            className="px-3.5 py-2 border border-black bg-white hover:bg-black hover:text-white text-black font-bold transition-colors select-none whitespace-nowrap"
          >
            <span className="hidden">Risk Controls (1107)</span>
            <span>Risk Controls</span>
          </button>
        </div>

        {/* Engine Connectivity Status Pill */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-sans">
            <span className="text-slate-500">Venue:</span>
            <span className="font-semibold text-slate-900">Binance Futures (Direct)</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-sans">
            <span className="text-slate-500">Latency:</span>
            <span className="text-emerald-700 font-bold font-mono">2.8 ms</span>
          </div>
        </div>
      </div>

      {/* Institutional Real-Time Telemetry Gauges (Grid of 5) */}
      <LiveStatsSummary
        totalUnrealized={totalUnrealized}
        totalRealizedDaily={totalRealizedDaily}
        openPositionsCount={openPositions.length}
        maxDailyDrawdown={maxDailyDrawdown}
      />

      {/* Open Positions Section */}
      <LivePositionsTable
        positions={openPositions}
        onSelectPosition={setSelectedTrade}
        onClosePosition={handleClosePosition}
      />

      {/* Live Executed Trade Fills History */}
      <LiveTradeHistoryTable
        trades={executedTrades}
        onSelectTrade={setSelectedTrade}
      />

      {/* MODAL 1: Granular Trade Detail & Execution Ladder Modal */}
      {selectedTrade && (
        <GranularTradeDetailModal
          isOpen={!!selectedTrade}
          onClose={() => setSelectedTrade(null)}
          trade={selectedTrade}
        />
      )}

      {/* MODAL 2: Emergency Stop Confirmation Modal */}
      <EmergencyStopModal
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        onConfirm={handleEmergencyStop}
        isDispatching={dispatchingCommand}
      />

      {/* MODAL 3: Configure Risk Controls Modal (Command 1107) */}
      <LiveRiskConfigModal
        isOpen={riskModalOpen}
        onClose={() => setRiskModalOpen(false)}
        maxDailyDrawdown={maxDailyDrawdown}
        setMaxDailyDrawdown={setMaxDailyDrawdown}
        maxPositions={maxPositions}
        setMaxPositions={setMaxPositions}
        perTradeLossCap={perTradeLossCap}
        setPerTradeLossCap={setPerTradeLossCap}
        onSubmit={handleSaveRiskControls}
        isDispatching={dispatchingCommand}
      />
    </div>
  );
}
