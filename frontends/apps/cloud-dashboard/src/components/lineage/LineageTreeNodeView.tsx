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
  const runId = node.run?.id || node.runId || (node as any).id || '';
  const kind = node.run?.kind || node.kind || 'Backtest';
  const status = node.run?.status || node.status || 'Completed';
  const relation = node.run?.relation || node.relation || 'Direct';
  const continuity = node.run?.continuity ?? node.continuity;
  const forkPointStep = node.run?.forkPointStep ?? (node as any).forkPointStep ?? node.forkPoint?.step;
  const interventionsCount = node.run?.interventionsCount ?? (node as any).interventionsCount ?? node.interventions?.length ?? 0;
  const engineInstanceId = node.run?.engineInstanceId || node.engineInstanceId || '';
  const createdAt = node.run?.createdAt || node.createdAt || '';
  const metrics = node.run?.metrics || node.metrics;
  const children = node.children || [];

  const isCurrent = runId === activeRunId;
  const statusBadge = getRunStatusBadge(status);
  const relBadge = getRunRelationBadge(relation);

  return (
    <div className="relative font-mono">
      {/* Node Card */}
      <div
        className={`p-4 rounded-xl border transition-all ${
          isCurrent
            ? 'bg-[#171717] border-cyan-500 shadow-md ring-2 ring-cyan-100'
            : 'bg-[#171717] border-[#262626] hover:border-[#262626] shadow-sm'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-1.5 rounded-md ${
                relation === 'Branched'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : relation === 'Spliced'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-cyan-50 text-[#3ECF8E] border border-cyan-200'
              }`}
            >
              <GitCommit className="w-4 h-4" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-100 text-sm">{formatHash(runId, 8)}</span>
                {isCurrent && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-100 text-cyan-800 font-bold">
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
              <p className="text-xs text-zinc-500 mt-0.5">
                Kind: <span className="text-zinc-200 font-medium">{kind}</span> • Engine:{' '}
                <span className="text-zinc-300">{formatHash(engineInstanceId, 6)}</span> •{' '}
                {formatTimestamp(createdAt)}
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-3 text-xs">
            <div className="text-right">
              <span className="text-zinc-400 text-[11px] block">Net Profit</span>
              <span className="text-zinc-100 font-bold block">{formatCurrency(metrics?.netProfit)}</span>
            </div>

            <div className="text-right">
              <span className="text-zinc-400 text-[11px] block">Sharpe</span>
              <span className="text-zinc-100 font-bold block">
                {metrics?.sharpeRatio != null ? metrics.sharpeRatio.toFixed(2) : '—'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 border-l border-[#262626] pl-3">
              <button
                type="button"
                onClick={() => onBranch(runId)}
                title="Branch at checkpoint"
                className="px-2 py-1 rounded bg-[#1f1f1f] hover:bg-[#262626] text-purple-700 text-xs transition-colors flex items-center gap-1 font-medium"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Branch</span>
              </button>

              <button
                type="button"
                onClick={() => onResume(runId)}
                title="Resume execution"
                className="px-2 py-1 rounded bg-[#1f1f1f] hover:bg-[#262626] text-[#3ECF8E] text-xs transition-colors flex items-center gap-1 font-medium"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </button>

              <Link
                href={`/reports/${runId}`}
                title="View full report"
                className="px-2 py-1 rounded bg-[#1f1f1f] hover:bg-[#262626] text-[#3ECF8E] text-xs transition-colors flex items-center gap-1 font-medium"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Report</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Checkpoint & Intervention info if branched or spliced */}
        {(forkPointStep != null || interventionsCount > 0) && (
          <div className="mt-3 pt-3 border-t border-[#262626] flex items-center gap-4 text-xs text-zinc-500">
            {forkPointStep != null && (
              <span className="flex items-center gap-1 text-purple-700">
                <ChevronRight className="w-3.5 h-3.5" />
                Forked at Step #{forkPointStep}
              </span>
            )}
            {interventionsCount > 0 && (
              <span className="flex items-center gap-1 text-amber-700">
                <ShieldAlert className="w-3.5 h-3.5" />
                {interventionsCount} Interventions Logged
              </span>
            )}
            {continuity === 'Gapped' && (
              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                Gapped Continuity
              </span>
            )}
          </div>
        )}
      </div>

      {/* Recursive Children */}
      {children && children.length > 0 && (
        <div className="ml-6 pl-4 border-l border-[#262626] space-y-3 mt-3">
          {children.map((childNode, idx) => {
            const childId = childNode.run?.id || childNode.runId || (childNode as any).id || `child-${idx}`;
            return (
              <LineageTreeNodeView
                key={childId}
                node={childNode}
                activeRunId={activeRunId}
                depth={depth + 1}
                onBranch={onBranch}
                onResume={onResume}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
