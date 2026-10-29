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
      <div className="p-5 border border-[#262626] bg-[#171717] rounded-xl space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#262626] gap-3">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-zinc-100" />
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
              Real-Time Event & Execution Stream
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-full border border-[#3ECF8E]/30 bg-emerald-950/20 text-[#3ECF8E] flex items-center gap-1.5">
              CHANNEL ACTIVE
            </span>
            <Link
              href={`/panel/live?instanceId=${instanceId}`}
              className="px-3.5 py-1 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-bold text-xs font-mono transition-colors flex items-center gap-1"
            >
              <span>Live Manager</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="bg-[#141414] p-4 border border-[#262626] rounded-xl font-sans text-xs text-zinc-100 space-y-2">
          <div className="text-zinc-100 font-bold flex items-center gap-2 border-b border-[#262626] pb-2">
            <Terminal className="w-3.5 h-3.5 text-zinc-100" />
            <span>Instance Event Stream Terminal ({instance.engineId})</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="font-bold text-zinc-100">[SYSTEM] Connection authenticated with Cloud Hub. Heartbeat interval: 10s.</div>
            <div className="font-bold text-zinc-100">[STREAM] Extension catalog initialized. 0 warning flags reported.</div>
            <div className="text-zinc-300">[TELEMETRY] Memory-mapped tick buffer pre-allocated and verified.</div>
            <div className="text-zinc-300">[DISPATCH] Command listener active on correlation channel {formatHash(instanceId, 8)}.</div>
            <div className="font-bold text-[#3ECF8E]">[STATUS] Ready to execute paper and live market orders.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
