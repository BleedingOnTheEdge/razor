'use client';

import React from 'react';
import { Send, Zap, RotateCcw, PauseCircle, PlayCircle, Trash2 } from 'lucide-react';
import { getCommandStatusBadge, formatTimestamp, formatHash } from '@razor/ui-kit';

export const COMMAND_PRESETS = [
  {
    label: 'Ping (1001)',
    id: 1001,
    type: 'Ping',
    params: '{}',
    icon: Zap,
    description: 'Verify round-trip latency & TCP socket liveness',
  },
  {
    label: 'Soft Reload (1002)',
    id: 1002,
    type: 'SoftReload',
    params: '{\n  "graceful": true\n}',
    icon: RotateCcw,
    description: 'Hot-reload plugins without dropping open orders',
  },
  {
    label: 'Get Status (1003)',
    id: 1003,
    type: 'GetStatus',
    params: '{}',
    icon: Zap,
    description: 'Query runtime status, memory, tasks, and state machine',
  },
  {
    label: 'Pause Engine (1004)',
    id: 1004,
    type: 'PauseEngine',
    params: '{\n  "reason": "maintenance"\n}',
    icon: PauseCircle,
    description: 'Transition engine state machine into Paused mode',
  },
  {
    label: 'Resume Engine (1005)',
    id: 1005,
    type: 'ResumeEngine',
    params: '{}',
    icon: PlayCircle,
    description: 'Resume paused engine background tasks and runners',
  },
  {
    label: 'Pause Trading (1103)',
    id: 1103,
    type: 'PauseTrading',
    params: '{\n  "reason": "operator_pause"\n}',
    icon: PauseCircle,
    description: 'Halt new order generation across live strategies',
  },
  {
    label: 'Resume Trading (1104)',
    id: 1104,
    type: 'ResumeTrading',
    params: '{}',
    icon: PlayCircle,
    description: 'Resume active order submission and risk processing',
  },
  {
    label: 'Live Metrics (1108)',
    id: 1108,
    type: 'GetLiveMetrics',
    params: '{}',
    icon: Zap,
    description: 'Fetch real-time PnL, drawdowns, latency and fills',
  },
  {
    label: 'Reload Extensions (1600)',
    id: 1600,
    type: 'ReloadExtensions',
    params: '{}',
    icon: RotateCcw,
    description: 'Hot-swap adapters and indicators without process restart',
  },
  {
    label: 'Emergency Drain (1900)',
    id: 1900,
    type: 'Drain',
    params: '{\n  "drainTimeoutSeconds": 60\n}',
    icon: Trash2,
    description: 'Cancel open quotes immediately and enter safe drain state',
  },
];

export interface DispatchedCommand {
  commandId: string;
  numericCommandId: number;
  commandType: string;
  status: string;
  correlationId: string;
  submittedAt: string;
}

export interface CommandDispatchSectionProps {
  cmdId: number;
  setCmdId: (id: number) => void;
  cmdType: string;
  setCmdType: (type: string) => void;
  cmdParams: string;
  setCmdParams: (params: string) => void;
  dispatching: boolean;
  onDispatch: (e: React.FormEvent) => Promise<void>;
  onApplyPreset: (preset: typeof COMMAND_PRESETS[number]) => void;
  commands: DispatchedCommand[];
}

export function CommandDispatchSection({
  cmdId,
  setCmdId,
  cmdType,
  setCmdType,
  cmdParams,
  setCmdParams,
  dispatching,
  onDispatch,
  onApplyPreset,
  commands,
}: CommandDispatchSectionProps) {
  return (
    <div className="space-y-6">
      {/* Dispatch Command Form */}
      <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Send className="w-4 h-4 text-cyan-400" />
            <span>Dispatch Engine Command</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5 font-sans">
            Issue control instructions directly across the secure TCP/WebSocket channel.
          </p>
        </div>

        {/* Presets Grid */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
            Quick Presets
          </span>
          <div className="grid grid-cols-2 gap-2">
            {COMMAND_PRESETS.map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onApplyPreset(preset)}
                  className={`p-2 rounded-lg border text-left text-xs font-mono transition-colors flex items-center gap-2 ${
                    cmdId === preset.id
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                      : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                  <span className="truncate">{preset.type}</span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={onDispatch} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">
              Numeric Command ID
            </label>
            <input
              value={cmdId}
              onChange={(e) => setCmdId(Number(e.target.value))}
              type="number"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              placeholder="1001"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">
              Command Type
            </label>
            <input
              value={cmdType}
              onChange={(e) => setCmdType(e.target.value)}
              type="text"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              placeholder="Ping / SoftReload"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">
              Parameters (JSON)
            </label>
            <textarea
              value={cmdParams}
              onChange={(e) => setCmdParams(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              placeholder="{}"
            />
          </div>

          <button
            type="submit"
            disabled={dispatching}
            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-zinc-950 font-semibold rounded-lg text-xs font-mono transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{dispatching ? 'Dispatching...' : 'Dispatch to Engine'}</span>
          </button>
        </form>
      </div>

      {/* Dispatched Commands History */}
      <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono">
          Recent Commands ({commands.length})
        </h3>

        {commands.length === 0 ? (
          <div className="py-4 text-center text-xs font-mono text-zinc-400">
            No commands dispatched to this engine yet.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {commands.map((cmd) => {
              const cmdBadge = getCommandStatusBadge(cmd.status);
              return (
                <div
                  key={cmd.commandId}
                  className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/50 space-y-1 text-xs font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-200 font-bold">
                      #{cmd.numericCommandId} {cmd.commandType}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] ${cmdBadge.className}`}>
                      {cmdBadge.label}
                    </span>
                  </div>
                  <div className="text-zinc-400 text-[11px] flex items-center justify-between">
                    <span>Correlation: {formatHash(cmd.correlationId, 4)}</span>
                    <span>{formatTimestamp(cmd.submittedAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
