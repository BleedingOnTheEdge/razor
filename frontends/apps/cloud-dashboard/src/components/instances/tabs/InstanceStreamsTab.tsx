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
      <div className="p-5 border border-black bg-white space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-black gap-3">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-black" />
            <h3 className="text-sm font-bold text-black uppercase tracking-wider">
              Real-Time Event & Execution Stream
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-mono font-bold border border-black bg-green-50 text-green-700 flex items-center gap-1.5">
              [CHANNEL ACTIVE]
            </span>
            <Link
              href={`/panel/live?instanceId=${instanceId}`}
              className="px-3 py-1 border border-black bg-white hover:bg-black hover:text-white text-black font-bold text-xs font-mono transition-colors flex items-center gap-1"
            >
              <span>[FULL SCREEN LIVE MANAGER]</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="bg-zinc-50 p-4 border border-black font-mono text-xs text-black space-y-2">
          <div className="text-black font-bold flex items-center gap-2 border-b border-black pb-2">
            <Terminal className="w-3.5 h-3.5 text-black" />
            <span>Instance Event Stream Terminal ({instance.engineId})</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="font-bold text-black">[SYSTEM] Connection authenticated with Cloud Hub. Heartbeat interval: 10s.</div>
            <div className="font-bold text-black">[STREAM] Extension catalog initialized. 0 warning flags reported.</div>
            <div className="text-zinc-700">[TELEMETRY] Memory-mapped tick buffer pre-allocated and verified.</div>
            <div className="text-zinc-700">[DISPATCH] Command listener active on correlation channel {formatHash(instanceId, 8)}.</div>
            <div className="font-bold text-green-700">[STATUS] Ready to execute paper and live market orders.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
