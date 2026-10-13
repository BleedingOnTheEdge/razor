'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiClient, type LineageNodePayload } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import {
  getRunStatusBadge,
  getRunRelationBadge,
  formatCurrency,
  formatTimestamp,
  formatHash,
} from '@razor/ui-kit';
import {
  GitBranch,
  ArrowLeft,
  RefreshCw,
  FileText,
  Play,
  Layers,
  ChevronRight,
  ShieldAlert,
  GitCommit,
} from 'lucide-react';

export function LineageContent({ runId }: { runId: string }) {
  const toast = useToast();

  const [rootNode, setRootNode] = useState<LineageNodePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Branch modal state
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [targetBranchRunId, setTargetBranchRunId] = useState<string>(runId);
  const [stepIndex, setStepIndex] = useState(100);
  const [actor, setActor] = useState('operator@razor.local');
  const [reason, setReason] = useState('Parameter tuning intervention at checkpoint');
  const [modSummary, setModSummary] = useState('Adjusted stop-loss multiplier from 1.5 to 1.8');
  const [prevFingerprint, setPrevFingerprint] = useState('sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069');
  const [newFingerprint, setNewFingerprint] = useState('sha256:4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a');
  const [childSeed, setChildSeed] = useState(1337);
  const [submittingBranch, setSubmittingBranch] = useState(false);

  // Resume modal state
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [targetResumeRunId, setTargetResumeRunId] = useState<string>(runId);
  const [submittingResume, setSubmittingResume] = useState(false);

  async function loadLineage() {
    setLoading(true);
    setError(null);
    try {
      const client = getApiClient();
      const { data, error: err } = await client.GET('/api/runs/{runId}/lineage', {
        params: { path: { runId } },
      });

      if (err) {
        setError('Failed to load lineage tree from Cloud API.');
      } else if (data) {
        setRootNode(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error communicating with Cloud API.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLineage();
  }, [runId]);

  async function handleBranchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingBranch(true);
    try {
      const client = getApiClient();
      const { data, error: err } = await client.POST('/api/runs/{runId}/branch', {
        params: { path: { runId: targetBranchRunId } },
        body: {
          forkPoint: { stepIndex: Number(stepIndex), generation: 0, windowIndex: 0 },
          intervention: {
            stepIndex: Number(stepIndex),
            previousFingerprint: prevFingerprint,
            newFingerprint: newFingerprint,
            actor,
            reason,
            modificationsSummary: modSummary,
          },
          childSeed: Number(childSeed),
        },
      });

      if (err) {
        toast.error('Branch Failed', 'Backend rejected the branch request.');
      } else if (data) {
        toast.success('Branched Run Created', `New child run ${formatHash(data.id, 6)} spawned successfully.`);
        setBranchModalOpen(false);
        await loadLineage();
      }
    } catch (e) {
      toast.error('Branch Error', e instanceof Error ? e.message : 'Unexpected network failure.');
    } finally {
      setSubmittingBranch(false);
    }
  }

  async function handleResumeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingResume(true);
    try {
      const client = getApiClient();
      const { data, error: err } = await client.POST('/api/runs/{runId}/resume', {
        params: { path: { runId: targetResumeRunId } },
        body: {
          forkPoint: { stepIndex: Number(stepIndex), generation: 0, windowIndex: 0 },
          intervention: {
            stepIndex: Number(stepIndex),
            previousFingerprint: prevFingerprint,
            newFingerprint: newFingerprint,
            actor,
            reason: reason || 'Resumed with spliced execution checkpoint',
            modificationsSummary: modSummary,
          },
          childSeed: Number(childSeed),
        },
      });

      if (err) {
        toast.error('Resume Failed', 'Backend rejected the resume request.');
      } else if (data) {
        toast.success('Run Resumed', `Spliced run ${formatHash(data.id, 6)} initiated.`);
        setResumeModalOpen(false);
        await loadLineage();
      }
    } catch (e) {
      toast.error('Resume Error', e instanceof Error ? e.message : 'Unexpected network failure.');
    } finally {
      setSubmittingResume(false);
    }
  }

  function openBranchModal(forRunId: string) {
    setTargetBranchRunId(forRunId);
    setBranchModalOpen(true);
  }

  function openResumeModal(forRunId: string) {
    setTargetResumeRunId(forRunId);
    setResumeModalOpen(true);
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Back Link */}
      <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
        <Link href="/runs" className="hover:text-zinc-200 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Runs</span>
        </Link>
        <span>/</span>
        <span className="text-zinc-300">Run {formatHash(runId, 6)}</span>
        <span>/</span>
        <span className="text-cyan-400">Lineage Explorer</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <GitBranch className="w-6 h-6 text-purple-400" />
              <span>Execution Lineage & Reproduction</span>
            </h2>
          </div>
          <p className="text-sm text-zinc-400 mt-1 font-sans">
            Hierarchical DAG visualization of parent-child execution lineages, checkpoints, and append-only intervention forks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLineage}
            className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-16 text-center text-sm font-mono text-zinc-400">
          Tracing lineage DAG from Cloud API...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-mono">
          {error}
        </div>
      )}

      {!loading && !error && !rootNode && (
        <div className="py-16 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20">
          <Layers className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-200 font-mono">No Lineage Recorded</h3>
          <p className="text-xs text-zinc-400 mt-1">This run is either missing or has not yet registered lineage relations.</p>
        </div>
      )}

      {!loading && rootNode && (
        <div className="space-y-6">
          {/* Top telemetry card */}
          <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <GitCommit className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-mono text-zinc-400 block">Root Origin</span>
                <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                  {formatHash(rootNode.run.id, 8)} ({rootNode.run.kind})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => openBranchModal(rootNode.run.id)}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1.5"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Branch at Checkpoint</span>
              </button>

              <button
                onClick={() => openResumeModal(rootNode.run.id)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume / Splice</span>
              </button>

              <Link
                href={`/reports/${rootNode.run.id}`}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Full Report</span>
              </Link>
            </div>
          </div>

          {/* Lineage Tree Hierarchy */}
          <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <h3 className="text-xs uppercase tracking-wider font-mono text-zinc-400 font-semibold flex items-center gap-2">
              <span>Lineage Hierarchy</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-500">Parent-to-Child Execution Tree</span>
            </h3>

            <div className="pt-2">
              <LineageTreeNodeView
                node={rootNode}
                activeRunId={runId}
                depth={0}
                onBranch={openBranchModal}
                onResume={openResumeModal}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Branch at Checkpoint */}
      {branchModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="branch-modal-title"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 id="branch-modal-title" className="text-base font-bold text-white font-mono flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-purple-400" />
                <span>Branch Run at Checkpoint</span>
              </h3>
              <button
                onClick={() => setBranchModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 text-xs font-mono"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleBranchSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-zinc-400 mb-1">Target Parent Run ID</label>
                <input
                  type="text"
                  readOnly
                  value={targetBranchRunId}
                  className="w-full px-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-lg text-zinc-400 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1 font-semibold">Fork Point Step Index</label>
                  <input
                    type="number"
                    value={stepIndex}
                    onChange={(e) => setStepIndex(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 mb-1 font-semibold">Child Seed</label>
                  <input
                    type="number"
                    value={childSeed}
                    onChange={(e) => setChildSeed(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Operator / Actor</label>
                <input
                  type="text"
                  value={actor}
                  onChange={(e) => setActor(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Intervention Reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Modifications Summary</label>
                <textarea
                  value={modSummary}
                  onChange={(e) => setModSummary(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Previous Fingerprint</label>
                  <input
                    type="text"
                    value={prevFingerprint}
                    onChange={(e) => setPrevFingerprint(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] text-zinc-300 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">New Fingerprint</label>
                  <input
                    type="text"
                    value={newFingerprint}
                    onChange={(e) => setNewFingerprint(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] text-zinc-300 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBranchModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBranch}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>{submittingBranch ? 'Spawning Branch...' : 'Create Branched Run'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Resume Run */}
      {resumeModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="resume-modal-title"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 id="resume-modal-title" className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400" />
                <span>Resume / Spliced Run</span>
              </h3>
              <button
                onClick={() => setResumeModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 text-xs font-mono"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleResumeSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-zinc-400 mb-1">Target Run ID</label>
                <input
                  type="text"
                  readOnly
                  value={targetResumeRunId}
                  className="w-full px-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-lg text-zinc-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Resume Step Index</label>
                <input
                  type="number"
                  value={stepIndex}
                  onChange={(e) => setStepIndex(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Actor</label>
                <input
                  type="text"
                  value={actor}
                  onChange={(e) => setActor(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setResumeModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResume}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{submittingResume ? 'Resuming...' : 'Confirm Resume / Splice'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface LineageTreeNodeViewProps {
  node: LineageNodePayload;
  activeRunId: string;
  depth: number;
  onBranch: (id: string) => void;
  onResume: (id: string) => void;
}

function LineageTreeNodeView({
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
