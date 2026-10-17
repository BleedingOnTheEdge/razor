'use client';

import React from 'react';
import { Cpu, Activity, Zap } from 'lucide-react';

export function InstanceTelemetryTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU Gauge */}
        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>CPU Utilization</span>
            </span>
            <span className="text-emerald-400 font-bold">14.2%</span>
          </div>
          <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full" style={{ width: '14.2%' }} />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>4 Cores Active</span>
            <span>Governor: Performance</span>
          </div>
        </div>

        {/* Memory Footprint */}
        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-purple-400" />
              <span>Resident Memory (RSS)</span>
            </span>
            <span className="text-purple-400 font-bold">248 MB</span>
          </div>
          <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full" style={{ width: '24.2%' }} />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Managed Heap: 92 MB</span>
            <span>Max Limit: 1024 MB</span>
          </div>
        </div>

        {/* Heartbeat Latency */}
        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>WebSocket Latency</span>
            </span>
            <span className="text-emerald-400 font-bold">3.2 ms</span>
          </div>
          <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
            <div className="bg-emerald-400 h-full rounded-full" style={{ width: '8%' }} />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Packet Loss: 0.0%</span>
            <span>Buffer Queues: Nominal</span>
          </div>
        </div>
      </div>

      {/* Garbage Collector & Low-Level Runtime Metrics */}
      <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>Runtime Engine Telemetry & Diagnostics</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50">
            <span className="text-zinc-500 block">GC Gen 0 / 1 / 2</span>
            <span className="text-base font-bold text-white mt-1 block">48 / 12 / 2</span>
            <span className="text-[10px] text-zinc-500">Collections</span>
          </div>
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50">
            <span className="text-zinc-500 block">GC Pause Time</span>
            <span className="text-base font-bold text-emerald-400 mt-1 block">1.2 ms</span>
            <span className="text-[10px] text-zinc-500">Max pause (P99)</span>
          </div>
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50">
            <span className="text-zinc-500 block">Worker Threads</span>
            <span className="text-base font-bold text-cyan-400 mt-1 block">16 Active</span>
            <span className="text-[10px] text-zinc-500">ThreadPool alloc</span>
          </div>
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50">
            <span className="text-zinc-500 block">MMAP Segments</span>
            <span className="text-base font-bold text-amber-400 mt-1 block">Active</span>
            <span className="text-[10px] text-zinc-500">Zero page faults</span>
          </div>
        </div>
      </div>
    </div>
  );
}
