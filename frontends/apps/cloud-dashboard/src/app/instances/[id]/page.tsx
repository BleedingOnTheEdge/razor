'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { getApiClient } from '@/lib/api-client';
import {
  getInstanceStatusBadge,
  getExtensionKindBadge,
  getCommandStatusBadge,
  formatTimestamp,
} from '@razor/ui-kit';
import { ArrowLeft, RefreshCw, Send, CheckCircle2 } from 'lucide-react';

interface InstanceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function InstanceDetailPage({ params }: InstanceDetailPageProps) {
  const { id: instanceId } = use(params);

  const [instance, setInstance] = useState<any>(null);
  const [commands, setCommands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cmdId, setCmdId] = useState(1001);
  const [cmdType, setCmdType] = useState('Ping');
  const [cmdParams, setCmdParams] = useState('{}');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  async function loadDetails() {
    setLoading(true);
    setError(null);
    try {
      const client = getApiClient();
      const [instRes, cmdsRes] = await Promise.all([
        client.GET('/api/instances/{instanceId}', {
          params: { path: { instanceId } },
        }),
        client.GET('/api/instances/{instanceId}/commands', {
          params: { path: { instanceId } },
        }),
      ]);

      if (instRes.data) {
        setInstance(instRes.data);
      } else {
        setError('Engine instance not found.');
      }

      if (cmdsRes.data) {
        setCommands(cmdsRes.data);
      }
    } catch (e: any) {
      setError(e?.message || 'Error communicating with Cloud API.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetails();
  }, [instanceId]);

  async function handleDispatch(e: React.FormEvent) {
    e.preventDefault();
    setDispatching(true);
    setDispatchSuccess(null);
    try {
      const client = getApiClient();
      const { data, error: err } = await client.POST('/api/instances/{instanceId}/commands', {
        params: { path: { instanceId } },
        body: {
          commandId: Number(cmdId),
          commandType: cmdType,
          parameters: cmdParams,
          timeoutSeconds: 30,
        },
      });

      if (err) {
        alert('Failed to dispatch command to engine.');
      } else if (data) {
        setDispatchSuccess(`Dispatched command #${cmdId} (${cmdType}). Correlation: ${data.correlationId}`);
        await loadDetails();
      }
    } catch (e: any) {
      alert(`Dispatch error: ${e?.message}`);
    } finally {
      setDispatching(false);
    }
  }

  const badge = instance ? getInstanceStatusBadge(instance.status) : null;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Back Link */}
      <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
        <Link href="/instances" className="hover:text-zinc-200 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Fleet</span>
        </Link>
        <span>/</span>
        <span className="text-zinc-300">{instanceId}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {instance?.name || instance?.engineId || 'Engine Instance'}
            </h2>
            {badge && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium ${badge.className}`}>
                {badge.label}
              </span>
            )}
          </div>
          <p className="text-xs font-mono text-zinc-400 mt-1">Instance ID: {instanceId}</p>
        </div>

        <button
          onClick={loadDetails}
          className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {loading && (
        <div className="py-12 text-center text-sm font-mono text-zinc-400">
          Loading engine configuration & state...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-mono">
          {error}
        </div>
      )}

      {instance && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Active Selections & Manifest */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Slots Card */}
            <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                Active Extension Profile Slots
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/50">
                  <span className="text-xs font-mono text-zinc-400 block">Adapter Slot</span>
                  <span className="text-sm font-bold text-white mt-1 block">
                    {instance.activeSelections?.adapter || 'None (Dormant)'}
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/50">
                  <span className="text-xs font-mono text-zinc-400 block">Strategy Slot</span>
                  <span className="text-sm font-bold text-white mt-1 block">
                    {instance.activeSelections?.strategy || 'None (Dormant)'}
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/50">
                  <span className="text-xs font-mono text-zinc-400 block">Neural Network Slot</span>
                  <span className="text-sm font-bold text-white mt-1 block">
                    {instance.activeSelections?.neuralNetwork || 'None'}
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/50">
                  <span className="text-xs font-mono text-zinc-400 block">Hook Plugins</span>
                  <span className="text-sm font-bold text-white mt-1 block">
                    {instance.activeSelections?.hookPlugins?.length || 0} loaded
                  </span>
                </div>
              </div>
            </div>

            {/* Manifest Extensions Card */}
            <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                  Reported Extension Manifest
                </h3>
                <span className="text-xs text-zinc-400 font-mono">
                  {instance.manifest?.length || 0} registered
                </span>
              </div>

              {!instance.manifest || instance.manifest.length === 0 ? (
                <div className="py-6 text-center text-xs font-mono text-zinc-400">
                  No extensions reported in engine manifest yet.
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {instance.manifest.map((ext: any, idx: number) => {
                    const kindBadge = getExtensionKindBadge(ext.kind);
                    return (
                      <div
                        key={idx}
                        className="py-3 flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${kindBadge.className}`}>
                            {kindBadge.label}
                          </span>
                          <span className="text-zinc-200 font-semibold">{ext.name}</span>
                        </div>
                        <span className="text-zinc-400">{formatTimestamp(ext.reportedAt)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Command Dispatch & History */}
          <div className="space-y-6">
            {/* Dispatch Command Form */}
            <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                Dispatch Engine Command
              </h3>

              {dispatchSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{dispatchSuccess}</span>
                </div>
              )}

              <form onSubmit={handleDispatch} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">
                    Numeric Command ID
                  </label>
                  <input
                    value={cmdId}
                    onChange={(e) => setCmdId(Number(e.target.value))}
                    type="number"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    placeholder="1001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">
                    Command Type
                  </label>
                  <input
                    value={cmdType}
                    onChange={(e) => setCmdType(e.target.value)}
                    type="text"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    placeholder="Ping / SoftReload"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">
                    Parameters (JSON)
                  </label>
                  <textarea
                    value={cmdParams}
                    onChange={(e) => setCmdParams(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    placeholder="{}"
                  />
                </div>

                <button
                  type="submit"
                  disabled={dispatching}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-zinc-950 font-semibold rounded-lg text-xs font-mono transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{dispatching ? 'Dispatching...' : 'Dispatch to Engine'}</span>
                </button>
              </form>
            </div>

            {/* Dispatched Commands History */}
            <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                Recent Commands ({commands.length})
              </h3>

              {commands.length === 0 ? (
                <div className="py-4 text-center text-xs font-mono text-zinc-400">
                  No commands dispatched to this engine yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {commands.map((cmd) => {
                    const cmdBadge = getCommandStatusBadge(cmd.status);
                    return (
                      <div
                        key={cmd.commandId}
                        className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/50 space-y-1 text-xs font-mono"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-200 font-bold">
                            #{cmd.numericCommandId} {cmd.commandType}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] ${cmdBadge.className}`}>
                            {cmdBadge.label}
                          </span>
                        </div>
                        <div className="text-zinc-400 text-[11px]">
                          {formatTimestamp(cmd.submittedAt)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
