'use client';

import React from 'react';
import Link from 'next/link';
import {
  Radio,
  ArrowUpRight,
  SlidersHorizontal,
  Terminal,
} from 'lucide-react';
import { formatTimestamp, formatHash } from '@razor/ui-kit';
import type { EngineInstanceDetailPayload } from '@/lib/api-client';
import type { DispatchedCommand } from '../CommandDispatchSection';

export interface InstanceOverviewTabProps {
  instanceId: string;
  instance: EngineInstanceDetailPayload;
  commands: DispatchedCommand[];
  onNavigateToExtensions?: () => void;
  onNavigateToCommands?: () => void;
  onSelectCommand?: (cmd: DispatchedCommand) => void;
}

export function InstanceOverviewTab({
  instanceId,
  instance,
  commands,
  onNavigateToExtensions,
  onNavigateToCommands,
  onSelectCommand,
}: InstanceOverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Dedicated Live Manager Banner */}
      <div className="p-5 border border-[#262626] bg-[#171717] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg text-zinc-200">
            <Radio className="w-5 h-5 text-zinc-100" />
          </div>
          <div>
            <h4 className="text-base font-bold text-zinc-100 flex items-center gap-2 font-mono uppercase">
              <span>Dedicated Live Trading & Flow Operations</span>
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full border border-[#3ECF8E]/30 bg-emerald-950/20 text-[#3ECF8E]">
                LIVE READY
              </span>
            </h4>
            <p className="text-xs text-zinc-100 font-normal mt-0.5">
              Real-time tick telemetry, live order fills, position ladder, dynamic risk limits, and emergency kill switches.
            </p>
          </div>
        </div>
        <Link
          href={`/panel/live?instanceId=${instanceId}`}
          className="px-4 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-bold text-xs font-mono transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <span>LAUNCH LIVE MANAGER</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Quick Metadata & State */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
        <div className="p-4 border border-[#262626] bg-[#171717] rounded-xl">
          <span className="font-bold text-zinc-100 uppercase block">Engine Identifier</span>
          <span className="text-sm font-bold text-zinc-100 mt-1 block font-mono">{instance.engineId}</span>
        </div>
        <div className="p-4 border border-[#262626] bg-[#171717] rounded-xl">
          <span className="font-bold text-zinc-100 uppercase block">Account & License</span>
          <span className="text-sm font-bold text-zinc-100 mt-1 block font-mono">
            {formatHash(instance.licenseId || instance.accountId || 'standard', 8)}
          </span>
        </div>
        <div className="p-4 border border-[#262626] bg-[#171717] rounded-xl">
          <span className="font-bold text-zinc-100 uppercase block">Bootstrap Registered</span>
          <span className="text-sm font-bold text-zinc-100 mt-1 block font-mono">
            {formatTimestamp(instance.createdAt)}
          </span>
        </div>
        <div className="p-4 border border-[#262626] bg-[#171717] rounded-xl">
          <span className="font-bold text-zinc-100 uppercase block">Last Cloud Heartbeat</span>
          <span className="text-sm font-bold text-zinc-100 mt-1 block font-mono">
            {instance.lastSeenAt ? formatTimestamp(instance.lastSeenAt) : 'Never'}
          </span>
        </div>
      </div>

      {/* Quick Profile Slots Snapshot */}
      <div className="p-5 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-zinc-100" />
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono">
              Active Extension Slots Snapshot
            </h3>
          </div>
          {onNavigateToExtensions && (
            <button
              type="button"
              onClick={onNavigateToExtensions}
              className="text-xs font-mono font-bold text-zinc-100 hover:underline flex items-center gap-1"
            >
              <span>[MANAGE ALL EXTENSIONS]</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg">
            <span className="font-bold text-zinc-100 block text-[11px] uppercase">Broker / Adapter</span>
            <span className="text-sm font-bold text-zinc-100 mt-1 block">
              {instance.activeSelections?.adapter || 'None (Dormant)'}
            </span>
          </div>
          <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg">
            <span className="font-bold text-zinc-100 block text-[11px] uppercase">Order Strategy</span>
            <span className="text-sm font-bold text-zinc-100 mt-1 block">
              {instance.activeSelections?.strategy || 'None (Dormant)'}
            </span>
          </div>
          <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg">
            <span className="font-bold text-zinc-100 block text-[11px] uppercase">Neural Network</span>
            <span className="text-sm font-bold text-zinc-100 mt-1 block">
              {instance.activeSelections?.neuralNetwork || 'None (Bypassed)'}
            </span>
          </div>
          <div className="p-3 border border-[#262626] bg-[#141414] rounded-lg">
            <span className="font-bold text-zinc-100 block text-[11px] uppercase">Hook Interceptors</span>
            <span className="text-sm font-bold text-zinc-100 mt-1 block">
              {instance.activeSelections?.hookPlugins?.length || 0} active
            </span>
          </div>
        </div>
      </div>

      {/* Quick Command Summary Card */}
      <div className="p-5 border border-[#262626] bg-[#171717] rounded-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-zinc-100" />
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono">
              Recent Command Activity
            </h3>
          </div>
          {onNavigateToCommands && (
            <button
              type="button"
              onClick={onNavigateToCommands}
              className="text-xs font-mono font-bold text-zinc-100 hover:underline flex items-center gap-1"
            >
              <span>[VIEW COMMANDS SECTION]</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {commands.length === 0 ? (
          <div className="py-6 text-center text-xs font-mono text-zinc-100">
            No commands dispatched to this instance yet
          </div>
        ) : (
          <div className="divide-y divide-[#262626]">
            {commands.slice(0, 5).map((cmd, idx) => (
              <div
                key={cmd.commandId || idx}
                onClick={() => onSelectCommand?.(cmd)}
                className="py-2.5 flex items-center justify-between text-xs font-mono hover:bg-[#141414] rounded-lg cursor-pointer px-2.5 transition-colors"
                title="Click to view full command payload and response"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-zinc-100">
                    Opcode {cmd.numericCommandId}: {cmd.commandType}
                  </span>
                  <span className="font-bold text-zinc-100">
                    [{cmd.status?.toUpperCase()}]
                  </span>
                </div>
                <span className="text-zinc-100 font-normal">{formatTimestamp(cmd.submittedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
