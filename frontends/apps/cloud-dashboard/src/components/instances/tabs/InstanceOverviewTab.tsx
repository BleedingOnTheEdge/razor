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
  onNavigateToExtensions: () => void;
  onNavigateToCommands: () => void;
}

export function InstanceOverviewTab({
  instanceId,
  instance,
  commands,
  onNavigateToExtensions,
  onNavigateToCommands,
}: InstanceOverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Dedicated Live Manager Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900/70 to-teal-950/40 border border-emerald-500/30 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2 font-mono">
              <span>Dedicated Live Trading & Flow Operations</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Live Ready
              </span>
            </h4>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">
              Real-time tick telemetry, live order fills, position ladder, dynamic risk limits, and emergency kill switches.
            </p>
          </div>
        </div>
        <Link
          href={`/live?instanceId=${instanceId}`}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs font-mono transition-all shadow-md hover:shadow-emerald-500/20 flex items-center gap-2 whitespace-nowrap"
        >
          <span>Launch Live Manager</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Quick Metadata & State */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
          <span className="text-zinc-500 block">Engine Identifier</span>
          <span className="text-sm font-bold text-white mt-1 block font-mono">{instance.engineId}</span>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
          <span className="text-zinc-500 block">Account & License</span>
          <span className="text-sm font-bold text-cyan-400 mt-1 block font-mono">
            {formatHash(instance.licenseId || instance.accountId || 'standard', 8)}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
          <span className="text-zinc-500 block">Bootstrap Registered</span>
          <span className="text-sm font-bold text-zinc-300 mt-1 block font-mono">
            {formatTimestamp(instance.createdAt)}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
          <span className="text-zinc-500 block">Last Cloud Heartbeat</span>
          <span className="text-sm font-bold text-emerald-400 mt-1 block font-mono">
            {formatTimestamp(instance.lastSeenAt || '')}
          </span>
        </div>
      </div>

      {/* Quick Profile Slots Snapshot */}
      <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono">
              Active Extension Slots Snapshot
            </h3>
          </div>
          <button
            type="button"
            onClick={onNavigateToExtensions}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>Manage All Extensions</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
            <span className="text-zinc-500 block text-[11px]">Broker / Adapter</span>
            <span className="text-sm font-bold text-blue-400 mt-1 block">
              {instance.activeSelections?.adapter || 'None (Dormant)'}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
            <span className="text-zinc-500 block text-[11px]">Order Strategy</span>
            <span className="text-sm font-bold text-emerald-400 mt-1 block">
              {instance.activeSelections?.strategy || 'None (Dormant)'}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
            <span className="text-zinc-500 block text-[11px]">Neural Network</span>
            <span className="text-sm font-bold text-purple-400 mt-1 block">
              {instance.activeSelections?.neuralNetwork || 'None (Bypassed)'}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
            <span className="text-zinc-500 block text-[11px]">Hook Interceptors</span>
            <span className="text-sm font-bold text-rose-400 mt-1 block">
              {instance.activeSelections?.hookPlugins?.length || 0} active
            </span>
          </div>
        </div>
      </div>

      {/* Quick Command Summary Card */}
      <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono">
              Recent Command Activity
            </h3>
          </div>
          <button
            type="button"
            onClick={onNavigateToCommands}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>Open Command Dispatch Console</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {commands.length === 0 ? (
          <div className="py-6 text-center text-xs font-mono text-zinc-500">
            No commands dispatched to this instance yet.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {commands.slice(0, 3).map((cmd, idx) => (
              <div key={cmd.commandId || idx} className="py-2.5 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold">
                    Command #{cmd.numericCommandId}: {cmd.commandType}
                  </span>
                  <span className="text-zinc-400 text-[11px]">{cmd.status}</span>
                </div>
                <span className="text-zinc-500 text-[11px]">{formatTimestamp(cmd.submittedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
