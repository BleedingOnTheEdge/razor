'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiClient, type LineageNodePayload } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { formatHash } from '@razor/ui-kit';
import {
  GitBranch,
  ArrowLeft,
  RefreshCw,
  FileText,
  Play,
  Layers,
  GitCommit,
} from 'lucide-react';
import { LineageBranchModal } from './LineageBranchModal';
import { LineageResumeModal } from './LineageResumeModal';
import { LineageTreeNodeView } from './LineageTreeNodeView';

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
      <LineageBranchModal
        isOpen={branchModalOpen}
        onClose={() => setBranchModalOpen(false)}
        targetBranchRunId={targetBranchRunId}
        stepIndex={stepIndex}
        setStepIndex={setStepIndex}
        childSeed={childSeed}
        setChildSeed={setChildSeed}
        actor={actor}
        setActor={setActor}
        reason={reason}
        setReason={setReason}
        modSummary={modSummary}
        setModSummary={setModSummary}
        prevFingerprint={prevFingerprint}
        setPrevFingerprint={setPrevFingerprint}
        newFingerprint={newFingerprint}
        setNewFingerprint={setNewFingerprint}
        submittingBranch={submittingBranch}
        onSubmit={handleBranchSubmit}
      />

      {/* Modal: Resume Run */}
      <LineageResumeModal
        isOpen={resumeModalOpen}
        onClose={() => setResumeModalOpen(false)}
        targetResumeRunId={targetResumeRunId}
        stepIndex={stepIndex}
        setStepIndex={setStepIndex}
        actor={actor}
        setActor={setActor}
        reason={reason}
        setReason={setReason}
        submittingResume={submittingResume}
        onSubmit={handleResumeSubmit}
      />
    </div>
  );
}
