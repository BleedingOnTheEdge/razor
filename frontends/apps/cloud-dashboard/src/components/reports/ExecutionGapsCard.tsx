'use client';

import React from 'react';
import { formatTimestamp } from '@razor/ui-kit';
import type { RunReportPayload } from '@/lib/api-client';

export interface ExecutionGapsCardProps {
  gaps?: RunReportPayload['gaps'];
}

export function ExecutionGapsCard({ gaps }: ExecutionGapsCardProps) {
  return (
    <div className="p-6 rounded-xl bg-[#171717] border border-[#262626] shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-wider font-mono text-zinc-100 font-semibold flex items-center gap-2">
          <span>Recorded Execution Gaps</span>
          <span className="px-2 py-0.5 rounded-full bg-[#141414] text-zinc-200 text-xs font-semibold">
            {gaps?.length || 0}
          </span>
        </h3>
      </div>

      {!gaps || gaps.length === 0 ? (
        <div className="py-6 text-center text-sm font-sans text-zinc-400">
          No execution gaps detected. Run executed in full contiguity.
        </div>
      ) : (
        <div className="divide-y divide-[#262626]">
          {gaps.map((gap, idx) => (
            <div key={gap.id || `gap-${idx}-${gap.startStep}`} className="py-3 flex items-center justify-between text-sm font-sans">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-950/40 text-amber-300 border border-amber-800 text-xs font-mono font-bold">
                  Steps {gap.startStep} – {gap.endStep}
                </span>
                <span className="text-zinc-200">{gap.reason}</span>
              </div>
              <span className="text-zinc-400 text-xs font-mono">{formatTimestamp(gap.recordedAt || '')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
