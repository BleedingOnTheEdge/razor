'use client';

import React from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  Play,
  TrendingUp,
  Layers,
  Pause,
  AlertTriangle,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { ActionDropdown } from '@/components/ui/ActionDropdown';
import type { RunReportPayload } from '@/lib/api-client';

export interface ReportHeaderActionsProps {
  runId: string;
  report: RunReportPayload | null;
  handleInstantReRun: () => void;
  handlePauseRun: () => void;
  pausing: boolean;
  handleCancelRun: () => void;
  cancelling: boolean;
  setCompleteModalOpen: (val: boolean) => void;
  handleExportXlsx: () => void;
  exportingXlsx: boolean;
  handleCopyDna: () => void;
  handleManualRefresh: () => void;
  refreshingManual: boolean;
}

export function ReportHeaderActions({
  runId,
  report,
  handleInstantReRun,
  handlePauseRun,
  pausing,
  handleCancelRun,
  cancelling,
  setCompleteModalOpen,
  handleExportXlsx,
  exportingXlsx,
  handleCopyDna,
  handleManualRefresh,
  refreshingManual,
}: ReportHeaderActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Re-Run (Instant 1-Click Replay) */}
      <button
        type="button"
        onClick={handleInstantReRun}
        className="px-3.5 py-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium font-bold transition-colors flex items-center gap-1.5 select-none"
        title="Execute identical rerun immediately"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>RE-RUN</span>
      </button>

      {/* Re-Run With... */}
      <Link
        href={`/panel/runs/new?cloneFrom=${runId}`}
        className="px-3.5 py-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium font-bold transition-colors flex items-center gap-1.5 select-none"
        title="Clone settings and modify parameters before running"
      >
        <Play className="w-3.5 h-3.5" />
        <span>RE-RUN WITH...</span>
      </Link>

      {/* Dedicated Generations Convergence Page (Dev View) */}
      {(report?.kind === 'Optimization' || report?.kind === 'WalkForward' || (report?.generationProgress && report.generationProgress.length > 0)) && (
        <Link
          href={`/panel/reports/${runId}/generations`}
          className="px-3.5 py-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium font-bold transition-colors flex items-center gap-1.5 select-none"
          title="Open generational convergence progression grid (Developer View)"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>GENERATIONS (DEV)</span>
        </Link>
      )}

      {/* Dedicated Walk-Forward Window Splits Page */}
      {report?.kind === 'WalkForward' && (
        <Link
          href={`/panel/reports/${runId}/windows`}
          className="px-3.5 py-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium font-bold transition-colors flex items-center gap-1.5 select-none"
          title="Open walk-forward window splits and degradation analysis"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>WINDOWS (SPLITS)</span>
        </Link>
      )}

      {report && (
        <>
          {report.status === 'Running' && (
            <button
              type="button"
              onClick={handlePauseRun}
              disabled={pausing}
              className="px-3 py-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium font-bold transition-colors flex items-center gap-1.5 select-none"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>{pausing ? 'PAUSING...' : 'PAUSE RUN'}</span>
            </button>
          )}

          {(report.status === 'Running' || report.status === 'Paused') && (
            <button
              type="button"
              onClick={handleCancelRun}
              disabled={cancelling}
              className="px-3.5 py-1.5 border border-[#262626] bg-[#171717] hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-800/40 text-zinc-200 rounded-full font-bold transition-colors flex items-center gap-1.5 select-none"
              title="Cancel active run execution"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{cancelling ? 'CANCELLING...' : 'CANCEL RUN'}</span>
            </button>
          )}

          {report.status !== 'Completed' && (
            <button
              type="button"
              onClick={() => setCompleteModalOpen(true)}
              className="px-3 py-1.5 border border-[#262626] bg-[#3ECF8E] hover:bg-[#34b27b] text-[#0f0f0f] rounded-full font-bold transition-colors flex items-center gap-1.5 select-none"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Complete Run</span>
            </button>
          )}
        </>
      )}

      <button
        type="button"
        onClick={handleExportXlsx}
        disabled={exportingXlsx}
        className="px-3 py-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium font-bold transition-colors flex items-center gap-1.5 select-none"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{exportingXlsx ? 'EXPORTING...' : 'EXPORT XLSX'}</span>
      </button>

      <ActionDropdown
        label="MORE ▾"
        items={[
          {
            label: 'View Lineage DAG',
            href: `/panel/runs/${runId}/lineage`,
          },
          {
            label: 'Export Formulated XLSX',
            onClick: handleExportXlsx,
          },
          {
            label: 'Copy Winning DNA',
            onClick: handleCopyDna,
          },
        ]}
      />

      <button
        type="button"
        onClick={handleManualRefresh}
        disabled={refreshingManual}
        className="p-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium transition-colors"
        title="Refresh Report Data"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${refreshingManual ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
