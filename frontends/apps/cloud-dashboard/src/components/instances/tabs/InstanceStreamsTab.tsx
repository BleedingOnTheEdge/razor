'use client';

import React from 'react';
import Link from 'next/link';
import { Radio, ArrowUpRight, Terminal } from 'lucide-react';
import { formatHash } from '@razor/ui-kit';
import type { EngineInstanceDetailPayload } from '@/lib/api-client';

export interface InstanceStreamsTabProps {
  instanceId: string;
  instance: EngineInstanceDetailPayload;
}

export function InstanceStreamsTab({ instanceId, instance }: InstanceStreamsTabProps) {
  return (
    <div className="space-y-6">
      {/* Live Streaming Gateway Banner */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Real-Time Event & Execution Stream
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Stream Channel Active
            </span>
            <Link
              href={`/live?instanceId=${instanceId}`}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs font-mono transition-colors flex items-center gap-1"
            >
              <span>Full Screen Manager</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 font-mono text-xs text-zinc-400 space-y-2">
          <div className="text-zinc-500 flex items-center gap-2 border-b border-zinc-900 pb-2">
            <Terminal className="w-3.5 h-3.5 text-zinc-500" />
            <span>Instance Event Stream Terminal ({instance.engineId})</span>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="text-emerald-400">[SYSTEM] Connection authenticated with Cloud Hub. Heartbeat interval: 10s.</div>
            <div className="text-cyan-400">[STREAM] Extension catalog initialized. 0 warning flags reported.</div>
            <div className="text-zinc-400">[TELEMETRY] Memory-mapped tick buffer pre-allocated and verified.</div>
            <div className="text-zinc-400">[DISPATCH] Command listener active on correlation channel {formatHash(instanceId, 8)}.</div>
            <div className="text-zinc-500">[STATUS] Ready to execute paper and live market orders.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
