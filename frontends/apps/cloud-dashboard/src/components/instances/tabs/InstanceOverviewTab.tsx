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
      <div className="p-5 border border-black bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 border border-black bg-zinc-50 text-black">
            <Radio className="w-5 h-5 text-black" />
          </div>
          <div>
            <h4 className="text-base font-bold text-black flex items-center gap-2 font-mono uppercase">
              <span>Dedicated Live Trading & Flow Operations</span>
              <span className="px-2 py-0.5 text-[10px] font-bold border border-black bg-green-50 text-green-700">
                [LIVE READY]
              </span>
            </h4>
            <p className="text-xs text-black font-normal mt-0.5">
              Real-time tick telemetry, live order fills, position ladder, dynamic risk limits, and emergency kill switches.
            </p>
          </div>
        </div>
        <Link
          href={`/panel/live?instanceId=${instanceId}`}
          className="px-4 py-2 border border-black bg-white hover:bg-black hover:text-white text-black font-bold text-xs font-mono transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <span>[LAUNCH LIVE MANAGER]</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Quick Metadata & State */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
        <div className="p-4 border border-black bg-white">
          <span className="font-bold text-black uppercase block">Engine Identifier</span>
          <span className="text-sm font-bold text-black mt-1 block font-mono">{instance.engineId}</span>
        </div>
        <div className="p-4 border border-black bg-white">
          <span className="font-bold text-black uppercase block">Account & License</span>
          <span className="text-sm font-bold text-black mt-1 block font-mono">
            {formatHash(instance.licenseId || instance.accountId || 'standard', 8)}
          </span>
        </div>
        <div className="p-4 border border-black bg-white">
          <span className="font-bold text-black uppercase block">Bootstrap Registered</span>
          <span className="text-sm font-bold text-black mt-1 block font-mono">
            {formatTimestamp(instance.createdAt)}
          </span>
        </div>
        <div className="p-4 border border-black bg-white">
          <span className="font-bold text-black uppercase block">Last Cloud Heartbeat</span>
          <span className="text-sm font-bold text-black mt-1 block font-mono">
            {instance.lastSeenAt ? formatTimestamp(instance.lastSeenAt) : 'Never'}
          </span>
        </div>
      </div>

      {/* Quick Profile Slots Snapshot */}
      <div className="p-5 border border-black bg-white space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-black">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-black" />
            <h3 className="text-sm font-bold text-black uppercase tracking-wider font-mono">
              Active Extension Slots Snapshot
            </h3>
          </div>
          {onNavigateToExtensions && (
            <button
              type="button"
              onClick={onNavigateToExtensions}
              className="text-xs font-mono font-bold text-black hover:underline flex items-center gap-1"
            >
              <span>[MANAGE ALL EXTENSIONS]</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 border border-black bg-zinc-50">
            <span className="font-bold text-black block text-[11px] uppercase">Broker / Adapter</span>
            <span className="text-sm font-bold text-black mt-1 block">
              {instance.activeSelections?.adapter || 'None (Dormant)'}
            </span>
          </div>
          <div className="p-3 border border-black bg-zinc-50">
            <span className="font-bold text-black block text-[11px] uppercase">Order Strategy</span>
            <span className="text-sm font-bold text-black mt-1 block">
              {instance.activeSelections?.strategy || 'None (Dormant)'}
            </span>
          </div>
          <div className="p-3 border border-black bg-zinc-50">
            <span className="font-bold text-black block text-[11px] uppercase">Neural Network</span>
            <span className="text-sm font-bold text-black mt-1 block">
              {instance.activeSelections?.neuralNetwork || 'None (Bypassed)'}
            </span>
          </div>
          <div className="p-3 border border-black bg-zinc-50">
            <span className="font-bold text-black block text-[11px] uppercase">Hook Interceptors</span>
            <span className="text-sm font-bold text-black mt-1 block">
              {instance.activeSelections?.hookPlugins?.length || 0} active
            </span>
          </div>
        </div>
      </div>

      {/* Quick Command Summary Card */}
      <div className="p-5 border border-black bg-white space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-black">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-black" />
            <h3 className="text-sm font-bold text-black uppercase tracking-wider font-mono">
              Recent Command Activity
            </h3>
          </div>
          {onNavigateToCommands && (
            <button
              type="button"
              onClick={onNavigateToCommands}
              className="text-xs font-mono font-bold text-black hover:underline flex items-center gap-1"
            >
              <span>[VIEW COMMANDS SECTION]</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {commands.length === 0 ? (
          <div className="py-6 text-center text-xs font-mono text-black">
            [NO COMMANDS DISPATCHED TO THIS INSTANCE YET]
          </div>
        ) : (
          <div className="divide-y divide-black">
            {commands.slice(0, 5).map((cmd, idx) => (
              <div
                key={cmd.commandId || idx}
                onClick={() => onSelectCommand?.(cmd)}
                className="py-2.5 flex items-center justify-between text-xs font-mono hover:bg-zinc-50 cursor-pointer px-2 transition-colors"
                title="Click to view full command payload and response"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-black">
                    Opcode {cmd.numericCommandId}: {cmd.commandType}
                  </span>
                  <span className="font-bold text-black">
                    [{cmd.status?.toUpperCase()}]
                  </span>
                </div>
                <span className="text-black font-normal">{formatTimestamp(cmd.submittedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
