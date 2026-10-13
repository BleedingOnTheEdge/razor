'use client';

import React from 'react';
import Link from 'next/link';
import type { LineageNodePayload } from '@/lib/api-client';
import {
  getRunStatusBadge,
  getRunRelationBadge,
  formatCurrency,
  formatTimestamp,
  formatHash,
} from '@razor/ui-kit';
import {
  GitBranch,
  FileText,
  Play,
  ChevronRight,
  ShieldAlert,
  GitCommit,
} from 'lucide-react';

export interface LineageTreeNodeViewProps {
  node: LineageNodePayload;
  activeRunId: string;
  depth: number;
  onBranch: (id: string) => void;
  onResume: (id: string) => void;
}

export function LineageTreeNodeView({
  node,
  activeRunId,
  depth,
  onBranch,
  onResume,
}: LineageTreeNodeViewProps) {
  const { run, children } = node;
  const isCurrent = run.id === activeRunId;
  const statusBadge = getRunStatusBadge(run.status);
  const relBadge = getRunRelationBadge(run.relation);

  return (
    <div className="relative font-mono">
      {/* Node Card */}
      <div
        className={`p-4 rounded-xl border transition-all ${
          isCurrent
            ? 'bg-zinc-900 border-cyan-500/50 shadow-lg shadow-cyan-950/20 ring-1 ring-cyan-500/30'
            : 'bg-zinc-950/70 border-zinc-800/70 hover:border-zinc-700'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-1.5 rounded-md ${
                run.relation === 'Branched'
                  ? 'bg-purple-500/10 text-purple-400'
                  : run.relation === 'Spliced'
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-cyan-500/10 text-cyan-400'
              }`}
            >
              <GitCommit className="w-4 h-4" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{formatHash(run.id, 8)}</span>
                {isCurrent && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 font-bold">
                    VIEWING
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded text-[10px] ${statusBadge.className}`}>
                  {statusBadge.label}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] ${relBadge.className}`}>
                  {relBadge.label}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Kind: <span className="text-zinc-200">{run.kind}</span> • Engine:{' '}
                <span className="text-zinc-300">{formatHash(run.engineInstanceId, 6)}</span> •{' '}
                {formatTimestamp(run.createdAt)}
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-3 text-xs">
            <div className="text-right">
              <span className="text-zinc-400 text-[11px] block">Net Profit</span>
              <span className="text-zinc-200 font-bold block">{formatCurrency(run.metrics?.netProfit)}</span>
            </div>

            <div className="text-right">
              <span className="text-zinc-400 text-[11px] block">Sharpe</span>
              <span className="text-zinc-200 font-bold block">
                {run.metrics?.sharpeRatio != null ? run.metrics.sharpeRatio.toFixed(2) : '—'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 border-l border-zinc-800 pl-3">
              <button
                onClick={() => onBranch(run.id)}
                title="Branch at checkpoint"
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-purple-400 text-xs transition-colors flex items-center gap-1"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Branch</span>
              </button>

              <button
                onClick={() => onResume(run.id)}
                title="Resume execution"
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs transition-colors flex items-center gap-1"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </button>

              <Link
                href={`/reports/${run.id}`}
                title="View full report"
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-400 text-xs transition-colors flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Report</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Checkpoint & Intervention info if branched or spliced */}
        {(run.forkPointStep != null || run.interventionsCount > 0) && (
          <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center gap-4 text-xs text-zinc-400">
            {run.forkPointStep != null && (
              <span className="flex items-center gap-1 text-purple-300">
                <ChevronRight className="w-3.5 h-3.5" />
                Forked at Step #{run.forkPointStep}
              </span>
            )}
            {run.interventionsCount > 0 && (
              <span className="flex items-center gap-1 text-amber-300">
                <ShieldAlert className="w-3.5 h-3.5" />
                {run.interventionsCount} Interventions Logged
              </span>
            )}
            {run.continuity === 'Gapped' && (
              <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 text-[10px]">
                Gapped Continuity
              </span>
            )}
          </div>
        )}
      </div>

      {/* Recursive Children */}
      {children && children.length > 0 && (
        <div className="ml-6 pl-4 border-l border-zinc-800 space-y-3 mt-3">
          {children.map((childNode) => (
            <LineageTreeNodeView
              key={childNode.run.id}
              node={childNode}
              activeRunId={activeRunId}
              depth={depth + 1}
              onBranch={onBranch}
              onResume={onResume}
            />
          ))}
        </div>
      )}
    </div>
  );
}
