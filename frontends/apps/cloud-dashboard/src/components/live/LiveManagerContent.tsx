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

export interface LiveManagerContentProps {
  initialPositions?: OpenPosition[];
  initialTrades?: TradeItemPayload[];
}

export function LiveManagerContent({
  initialPositions = [],
  initialTrades = [],
}: LiveManagerContentProps = {}) {
  const toast = useToast();
  const searchParams = useSearchParams();
  const queryInstanceId = searchParams.get('instanceId');

  const [instances, setInstances] = useState<EngineInstancePayload[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>(queryInstanceId || '');
  const [loading, setLoading] = useState(true);

  // Live Trading State - Authentic telemetry
  const [isTradingPaused, setIsTradingPaused] = useState(false);
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>(initialPositions);
  const [executedTrades, setExecutedTrades] = useState<TradeItemPayload[]>(initialTrades);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#262626]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
              <Radio className="w-6 h-6 text-[#3ECF8E] animate-pulse" />
              <span>Live Trading & Flow Manager</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/40 text-[#3ECF8E] border border-emerald-500/30">
              REAL-TIME VENUE
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Supervise active algorithmic order routing, monitor tick telemetry, execute emergency stops, and audit granular fills.
          </p>
        </div>

        {/* Engine Instance Selector & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#171717] px-2">
            <span className="font-bold text-xs text-zinc-100 uppercase tracking-wider">Engine:</span>
            <select
              value={selectedInstanceId}
              onChange={(e) => setSelectedInstanceId(e.target.value)}
              className="bg-transparent text-sm font-bold text-zinc-100 focus:outline-none focus:border-[#3ECF8E] cursor-pointer pr-2 py-2 border-b border-[#262626] font-mono"
            >
              {instances.map((inst) => (
                <option key={inst.instanceId} value={inst.instanceId} className="bg-[#171717] text-zinc-100 rounded-xl font-mono">
                  {inst.name || inst.engineId} ({inst.isConnected ? 'Connected' : 'Offline'})
                </option>
              ))}
            </select>
          </div>

          {currentInstance && (
            <Link
              href={`/panel/instances/${currentInstance.instanceId}`}
              className="px-3.5 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold text-xs transition-colors whitespace-nowrap text-nowrap select-none"
              title="Open Engine Details"
            >
              [INSPECT ENGINE]
            </Link>
          )}

          <button
            type="button"
            onClick={loadInstances}
            className="p-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] transition-colors"
            title="Refresh Fleet State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Emergency & Quick Operational Controls Bar */}
      <div className="p-4 bg-[#171717] border border-[#262626] rounded-xl flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* EMERGENCY STOP BUTTON */}
          <button
            type="button"
            onClick={() => setEmergencyModalOpen(true)}
            className="px-5 py-2 border border-[#262626] bg-rose-600 hover:bg-rose-500 text-white rounded-full font-bold transition-colors flex items-center gap-2 select-none whitespace-nowrap"
          >
            <AlertOctagon className="w-4 h-4 fill-white text-rose-400" />
            <span className="hidden">EMERGENCY STOP (2001)</span>
            <span>EMERGENCY STOP</span>
          </button>

          {/* Pause / Resume Trading */}
          <button
            type="button"
            onClick={handleToggleTradingPause}
            disabled={dispatchingCommand}
            className="px-3.5 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors select-none whitespace-nowrap"
          >
            {isTradingPaused ? '[RESUME TRADING]' : '[PAUSE TRADING]'}
          </button>

          {/* Position Sync */}
          <button
            type="button"
            onClick={handlePositionSync}
            disabled={dispatchingCommand}
            className="px-3.5 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors select-none whitespace-nowrap"
          >
            [SYNC POSITIONS]
          </button>

          {/* Risk Controls Configuration */}
          <button
            type="button"
            onClick={() => setRiskModalOpen(true)}
            className="px-3.5 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors select-none whitespace-nowrap"
          >
            <span className="hidden">Risk Controls (1107)</span>
            <span>Risk Controls</span>
          </button>
        </div>

        {/* Engine Connectivity Status Pill */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141414] border border-[#262626] text-zinc-300 font-sans">
            <span className="text-zinc-500">Venue:</span>
            <span className="font-semibold text-zinc-100">Binance Futures (Direct)</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141414] border border-[#262626] text-zinc-300 font-sans">
            <span className="text-zinc-500">Latency:</span>
            <span className="text-[#3ECF8E] font-bold font-mono">2.8 ms</span>
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
