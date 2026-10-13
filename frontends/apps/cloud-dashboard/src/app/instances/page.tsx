'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiClient } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/components/ui/toast';
import { getInstanceStatusBadge, formatTimestamp, formatHash } from '@razor/ui-kit';
import {
  Server,
  RefreshCw,
  ArrowRight,
  Plus,
  Search,
  CheckCircle2,
  Copy,
  Key,
  Filter,
  Terminal,
  BookOpen,
  Cpu,
} from 'lucide-react';

interface InstanceItem {
  instanceId: string;
  accountId: string;
  licenseId: string;
  engineId: string;
  name: string;
  status: string;
  createdAt: string;
  lastSeenAt?: string | null;
  isConnected: boolean;
  manifestExtensionCount: number;
}

export default function InstancesPage() {
  const toast = useToast();
  const { user } = useAuth();

  const [instances, setInstances] = useState<InstanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Register Engine modal state
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [regAccountId, setRegAccountId] = useState('');
  const [regLicenseId, setRegLicenseId] = useState('');
  const [regEngineId, setRegEngineId] = useState('engine-worker-01');
  const [regName, setRegName] = useState('Primary Execution Engine');
  const [registering, setRegistering] = useState(false);

  // Runner guide modal state
  const [runnerGuideOpen, setRunnerGuideOpen] = useState(false);

  // Credentials dialog after registration
  const [createdCredentials, setCreatedCredentials] = useState<{
    instanceId: string;
    engineId: string;
    apiKey: string;
  } | null>(null);

  async function loadInstances() {
    setLoading(true);
    setError(null);
    try {
      const client = getApiClient();
      const { data, error: err } = await client.GET('/api/instances', {});
      if (err) {
        setError('Failed to load engine instances from Cloud API.');
      } else if (data) {
        setInstances(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error communicating with Cloud API backend.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInstances();
  }, []);

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRegistering(true);
    try {
      const client = getApiClient();
      const accountId = (regAccountId || user?.accountId || '').trim();
      const licenseId = regLicenseId.trim();

      const bodyPayload = {
        accountId,
        licenseId,
        engineId: regEngineId.trim() || undefined,
        name: regName.trim() || undefined,
      };

      const { data, error: err } = await client.POST('/api/engines', {
        body: bodyPayload,
      });

      if (err) {
        const errorDetail = typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err);
        toast.error('Registration Failed', errorDetail || 'Backend rejected engine registration.');
      } else if (data) {
        setCreatedCredentials(data);
        setRegisterModalOpen(false);
        toast.success('Engine Registered', `Instance ${formatHash(data.instanceId, 6)} provisioned.`);
        await loadInstances();
      }
    } catch (e) {
      toast.error('Registration Error', e instanceof Error ? e.message : 'Network communication error.');
    } finally {
      setRegistering(false);
    }
  }

  const filteredInstances = instances.filter((inst) => {
    const matchesSearch =
      inst.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.instanceId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.engineId?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'CONNECTED' && inst.isConnected) ||
      inst.status.toUpperCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalConnected = instances.filter((i) => i.isConnected).length;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Server className="w-6 h-6 text-cyan-400" />
            <span>Engine Fleet Directory</span>
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Supervise distributed runtime engines, inspect active TCP socket connections, and register new nodes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRunnerGuideOpen(true)}
            className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-cyan-300 border border-cyan-500/30 transition-colors flex items-center gap-2"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Local Runner Guide</span>
          </button>

          <button
            onClick={() => setRegisterModalOpen(true)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold rounded-lg text-xs font-mono transition-colors flex items-center gap-2 shadow-lg shadow-cyan-950/20"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Engine</span>
          </button>

          <button
            onClick={loadInstances}
            className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 font-mono">
          <span className="text-xs text-zinc-400 uppercase tracking-wider block">Total Fleet</span>
          <span className="text-2xl font-bold text-white mt-1 block">{instances.length} engines</span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 font-mono">
          <span className="text-xs text-zinc-400 uppercase tracking-wider block">Connected via TCP</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1 block flex items-center gap-2">
            <span>{totalConnected} active</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 font-mono">
          <span className="text-xs text-zinc-400 uppercase tracking-wider block">Manifest Extensions</span>
          <span className="text-2xl font-bold text-cyan-400 mt-1 block">
            {instances.reduce((acc, i) => acc + (i.manifestExtensionCount || 0), 0)} loaded
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by engine name, ID, or instance hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <Filter className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-400">Filter Status:</span>
          {['ALL', 'CONNECTED', 'ACTIVE', 'DRAINING', 'DECOMMISSIONED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${
                statusFilter === st
                  ? 'bg-zinc-800 text-white font-bold border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="py-16 text-center text-sm font-mono text-zinc-400">
          Fetching engine fleet from Cloud API...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-mono">
          {error}
        </div>
      )}

      {!loading && !error && filteredInstances.length === 0 && (
        <div className="py-16 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20">
          <div className="w-12 h-12 mx-auto rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
            <Server className="w-6 h-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-zinc-200 font-mono">No Matching Engines Found</h3>
          <p className="mt-1 text-sm text-zinc-400">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try adjusting your search criteria or status filter.'
              : 'Register an engine instance to begin connecting algorithmic workers.'}
          </p>
        </div>
      )}

      {!loading && filteredInstances.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInstances.map((instance) => {
            const badge = getInstanceStatusBadge(instance.status);
            return (
              <div
                key={instance.instanceId}
                className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-white text-lg tracking-tight">
                        {instance.name || instance.engineId}
                      </h3>
                      <p className="text-xs font-mono text-zinc-400 mt-0.5">
                        ID: {formatHash(instance.instanceId, 6)}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="mt-5 space-y-2 text-xs font-mono text-zinc-400">
                    <div className="flex items-center justify-between py-1 border-b border-zinc-800/40">
                      <span className="text-zinc-400">Connection</span>
                      <span
                        className={`flex items-center gap-1.5 ${
                          instance.isConnected ? 'text-emerald-400' : 'text-zinc-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            instance.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                          }`}
                        />
                        {instance.isConnected ? 'Connected' : 'Offline'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-zinc-800/40">
                      <span className="text-zinc-400">Manifest Plugins</span>
                      <span className="text-zinc-200 font-semibold">
                        {instance.manifestExtensionCount} extensions
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-zinc-800/40">
                      <span className="text-zinc-400">Registered</span>
                      <span className="text-zinc-300">{formatTimestamp(instance.createdAt)}</span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-zinc-400">Last Heartbeat</span>
                      <span className="text-zinc-300">{formatTimestamp(instance.lastSeenAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                  <Link
                    href={`/instances/${instance.instanceId}`}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5"
                  >
                    <span>Manage Engine & Slots</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Register New Engine */}
      {registerModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reg-modal-title"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 id="reg-modal-title" className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span>Register Engine Instance</span>
              </h3>
              <button
                onClick={() => setRegisterModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 text-xs font-mono"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label htmlFor="regAccountId" className="block text-zinc-300 mb-1 font-semibold">Account ID</label>
                <input
                  id="regAccountId"
                  type="text"
                  value={regAccountId || user?.accountId || ''}
                  onChange={(e) => setRegAccountId(e.target.value)}
                  placeholder={user?.accountId || 'Account UUID (leave blank for default)'}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">Defaults to your active workspace account.</span>
              </div>

              <div>
                <label htmlFor="regLicenseId" className="block text-zinc-300 mb-1 font-semibold">
                  License ID <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>
                <input
                  id="regLicenseId"
                  type="text"
                  value={regLicenseId}
                  onChange={(e) => setRegLicenseId(e.target.value)}
                  placeholder="Auto-provisioned active fleet license"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">Leave blank to use your account's fleet license automatically.</span>
              </div>

              <div>
                <label htmlFor="regEngineId" className="block text-zinc-300 mb-1 font-semibold">Engine ID (Hostname/Pod)</label>
                <input
                  id="regEngineId"
                  type="text"
                  value={regEngineId}
                  onChange={(e) => setRegEngineId(e.target.value)}
                  placeholder="engine-prod-01"
                  required
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label htmlFor="regName" className="block text-zinc-300 mb-1 font-semibold">Human-Readable Name</label>
                <input
                  id="regName"
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Primary NY4 Execution Node"
                  required
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-zinc-950 font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{registering ? 'Registering...' : 'Provision Engine'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Newly Created Credentials */}
      {createdCredentials && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                <span>Engine Credentials Issued</span>
              </h3>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <p className="text-emerald-300 font-sans">
                Engine successfully registered with the Cloud Control Plane. Copy the generated API key below to configure the engine daemon.
              </p>

              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                <div>
                  <span className="text-zinc-500 block">Instance ID:</span>
                  <span className="text-white font-bold block">{createdCredentials.instanceId}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Engine ID:</span>
                  <span className="text-white block">{createdCredentials.engineId}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Engine API Key:</span>
                  <div className="flex items-center justify-between gap-2 mt-1 bg-zinc-900 p-2 rounded border border-zinc-700">
                    <span className="text-emerald-400 font-bold break-all">{createdCredentials.apiKey}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(createdCredentials.apiKey);
                        toast.success('Copied', 'API key copied to clipboard');
                      }}
                      className="shrink-0 p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      title="Copy API key"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-zinc-500 block">Launch Command:</span>
                  <div className="flex items-center justify-between gap-2 mt-1 bg-zinc-900 p-2 rounded border border-zinc-700">
                    <span className="text-cyan-300 font-mono text-[11px] break-all">
                      dotnet run --project core/src/Engine -- --instance {createdCredentials.instanceId} --engine-id {createdCredentials.engineId} --key &quot;{createdCredentials.apiKey}&quot; --username {user?.userName || 'pro-trader'} --password trader123 --endpoint ws://localhost:5000/engine
                    </span>
                    <button
                      onClick={() => {
                        const cmd = `dotnet run --project core/src/Engine -- --instance ${createdCredentials.instanceId} --engine-id ${createdCredentials.engineId} --key "${createdCredentials.apiKey}" --username ${user?.userName || 'pro-trader'} --password trader123 --endpoint ws://localhost:5000/engine`;
                        navigator.clipboard.writeText(cmd);
                        toast.success('Copied', 'Launch command copied to clipboard');
                      }}
                      className="shrink-0 p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      title="Copy launch command"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400 font-sans">
                  <span className="text-emerald-400 font-semibold font-mono block mb-0.5">✓ Zero-Broker Paper Trading Ready</span>
                  Engine defaults to <code className="text-cyan-300">MockPaperTradingAdapter</code>. Generates synthetic brownian motion ticks and simulates zero-dependency order execution.
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-mono font-bold transition-colors"
              >
                Close & Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Local Engine Runner Guide */}
      {runnerGuideOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <span>Local Engine Runner & Instancing Guide</span>
              </h3>
              <button
                onClick={() => setRunnerGuideOpen(false)}
                className="text-zinc-400 hover:text-white text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <span className="text-cyan-400 font-bold block">1. Architecture & Instancing Model</span>
                <p className="text-zinc-300 font-sans leading-relaxed">
                  Razor Engine nodes run as high-performance autonomous C#/.NET daemons. Each engine node connects over a persistent, duplex WebSocket transport to the Cloud Control Plane at <code className="text-white">ws://localhost:5000/engine</code>, automatically sending heartbeats, reporting manifest capabilities, and executing dispatched commands.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <span className="text-cyan-400 font-bold block">2. Built-in Mock Paper Trading Adapter</span>
                <p className="text-zinc-300 font-sans leading-relaxed">
                  Developers on the <strong>Free Tier</strong> do not need live broker credentials or exchanges. Razor ships with <code className="text-emerald-400">MockPaperTradingAdapter</code> in the SDK. It simulates realistic Brownian motion tick streaming, order matching, position keeping, and account balances completely in-memory.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <span className="text-cyan-400 font-bold block">3. Launching Engine Locally via CLI</span>
                <pre className="p-3 rounded bg-zinc-900 text-zinc-300 overflow-x-auto text-[11px] leading-relaxed border border-zinc-800">
{`# From repository root:
dotnet run --project core/src/Engine -- \\
  --instance <INSTANCE_GUID> \\
  --key <GENERATED_API_KEY> \\
  --cloud http://localhost:5000`}
                </pre>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <span className="text-cyan-400 font-bold block">4. Launching with Lerd / Podman Quadlets</span>
                <pre className="p-3 rounded bg-zinc-900 text-zinc-300 overflow-x-auto text-[11px] leading-relaxed border border-zinc-800">
{`# Containerized runner:
podman run --network host \\
  -e RAZOR_INSTANCE_ID="<INSTANCE_GUID>" \\
  -e RAZOR_API_KEY="<GENERATED_API_KEY>" \\
  -e RAZOR_CLOUD_URL="http://localhost:5000" \\
  razor-engine:latest`}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setRunnerGuideOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-mono font-bold transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
