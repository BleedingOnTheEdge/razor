'use client';

import React from 'react';
import { Cpu, Activity, Zap } from 'lucide-react';

export function InstanceTelemetryTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU Gauge */}
        <div className="p-5 border border-black bg-white space-y-3 font-mono">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-black flex items-center gap-1.5 uppercase">
              <Cpu className="w-4 h-4 text-black" />
              <span>CPU Utilization</span>
            </span>
            <span className="text-green-600 font-bold">14.2%</span>
          </div>
          <div className="w-full bg-zinc-200 h-3 border border-black overflow-hidden">
            <div className="bg-black h-full" style={{ width: '14.2%' }} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-black">
            <span>4 Cores Active</span>
            <span className="font-bold">Governor: Performance</span>
          </div>
        </div>

        {/* Memory Footprint */}
        <div className="p-5 border border-black bg-white space-y-3 font-mono">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-black flex items-center gap-1.5 uppercase">
              <Activity className="w-4 h-4 text-black" />
              <span>Resident Memory (RSS)</span>
            </span>
            <span className="text-black font-bold">248 MB</span>
          </div>
          <div className="w-full bg-zinc-200 h-3 border border-black overflow-hidden">
            <div className="bg-black h-full" style={{ width: '24.2%' }} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-black">
            <span>Managed Heap: 92 MB</span>
            <span className="font-bold">Max Limit: 1024 MB</span>
          </div>
        </div>

        {/* Heartbeat Latency */}
        <div className="p-5 border border-black bg-white space-y-3 font-mono">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-black flex items-center gap-1.5 uppercase">
              <Zap className="w-4 h-4 text-black" />
              <span>WebSocket Latency</span>
            </span>
            <span className="text-green-600 font-bold">3.2 ms</span>
          </div>
          <div className="w-full bg-zinc-200 h-3 border border-black overflow-hidden">
            <div className="bg-green-600 h-full" style={{ width: '8%' }} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-black">
            <span>Packet Loss: 0.0%</span>
            <span className="font-bold">Buffer Queues: Nominal</span>
          </div>
        </div>
      </div>
    </div>
  );
}
