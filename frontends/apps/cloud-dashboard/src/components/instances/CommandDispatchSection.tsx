'use client';

import React from 'react';
import { Send, Zap, RotateCcw, PauseCircle, PlayCircle, Trash2, Eye } from 'lucide-react';
import { formatTimestamp, formatHash } from '@razor/ui-kit';

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
  dispatchedAt?: string | null;
  completedAt?: string | null;
  errorMessage?: string | null;
  parametersJson?: string | null;
  resultPayloadJson?: string | null;
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
  onSelectCommand?: (cmd: DispatchedCommand) => void;
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
  onSelectCommand,
}: CommandDispatchSectionProps) {
  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Dispatch Command Form */}
      <div className="p-5 border border-black bg-white space-y-4">
        <div>
          <h3 className="text-sm font-bold text-black uppercase tracking-wider flex items-center gap-2">
            <Send className="w-4 h-4 text-black" />
            <span>Dispatch Engine Command</span>
          </h3>
          <p className="text-xs text-black font-normal mt-0.5 font-sans">
            Issue control instructions directly across the secure TCP/WebSocket channel.
          </p>
        </div>

        {/* Presets Grid */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-black uppercase tracking-wider block">
            Standard Presets
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {COMMAND_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onApplyPreset(preset)}
                className={`p-2.5 border text-left transition-colors flex flex-col justify-between ${
                  cmdId === preset.id
                    ? 'border-black bg-black text-white font-bold'
                    : 'border-black bg-white hover:bg-zinc-100 text-black'
                }`}
              >
                <span className="font-bold"><span>{preset.type}</span> (#{preset.id})</span>
                <span className="text-[10px] opacity-80 line-clamp-1">{preset.description}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={onDispatch} className="space-y-4 pt-3 border-t border-black">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-black mb-1 uppercase">
                Numeric Command ID
              </label>
              <input
                value={cmdId}
                onChange={(e) => setCmdId(Number(e.target.value))}
                type="number"
                className="w-full px-3 py-2 bg-white border border-black text-xs font-mono text-black focus:outline-none"
                placeholder="1001"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black mb-1 uppercase">
                Command Type
              </label>
              <input
                value={cmdType}
                onChange={(e) => setCmdType(e.target.value)}
                type="text"
                className="w-full px-3 py-2 bg-white border border-black text-xs font-mono text-black focus:outline-none"
                placeholder="Ping / SoftReload"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-black mb-1 uppercase">
              Parameters Payload (JSON)
            </label>
            <textarea
              value={cmdParams}
              onChange={(e) => setCmdParams(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-white border border-black text-xs font-mono text-black focus:outline-none"
              placeholder="{}"
            />
          </div>

          <button
            type="submit"
            disabled={dispatching}
            className="w-full py-2.5 border border-black bg-white hover:bg-black hover:text-white disabled:opacity-50 text-black font-bold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{dispatching ? '[DISPATCHING...]' : '[TRANSMIT COMMAND TO ENGINE]'}</span>
          </button>
        </form>
      </div>

      {/* Dispatched Commands History */}
      <div className="p-5 border border-black bg-white space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-black">
          <h3 className="text-sm font-bold text-black uppercase tracking-wider">
            Command History & Wire Responses ({commands.length})
          </h3>
          <span className="text-[11px] text-zinc-600 font-sans">
            Click any row to inspect response and parameters
          </span>
        </div>

        {commands.length === 0 ? (
          <div className="py-6 text-center text-xs text-black border border-black">
            [NO COMMANDS DISPATCHED TO THIS ENGINE YET]
          </div>
        ) : (
          <div className="divide-y divide-black max-h-80 overflow-y-auto">
            {commands.map((cmd) => (
              <div
                key={cmd.commandId}
                onClick={() => onSelectCommand?.(cmd)}
                className="p-3 bg-white hover:bg-zinc-50 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                title="Click to view full event details and engine return response"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-black">
                      #{cmd.numericCommandId} {cmd.commandType}
                    </span>
                    <span className="font-bold text-black">
                      [{cmd.status?.toUpperCase()}]
                    </span>
                    {cmd.errorMessage && (
                      <span className="text-[10px] font-bold text-red-600 border border-red-500 px-1 bg-red-50">
                        ERROR
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-600 flex items-center gap-3">
                    <span>Correlation: {formatHash(cmd.correlationId, 6)}</span>
                    <span>Submitted: {formatTimestamp(cmd.submittedAt)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white text-black font-bold text-[11px] flex items-center gap-1 self-start sm:self-auto"
                >
                  <Eye className="w-3 h-3" />
                  <span>[INSPECT RESPONSE]</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
