'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiClient } from '@/lib/api-client';
import type { EngineInstanceDetailPayload } from '@razor/api-client';
import { useToast } from '@/components/ui/toast';
import {
  getInstanceStatusBadge,
  getExtensionKindBadge,
  formatTimestamp,
  formatHash,
} from '@razor/ui-kit';
import {
  ArrowLeft,
  RefreshCw,
  Server,
  Plus,
  SlidersHorizontal,
  Edit2,
  Key,
  ShieldAlert,
  Trash2,
  Terminal,
  LayoutDashboard,
  Cpu,
  Radio,
  ArrowUpRight,
  Activity,
  Zap,
  CheckCircle2,
  Sliders,
  Layers,
  Search,
} from 'lucide-react';
import { CommandDispatchSection, COMMAND_PRESETS, type DispatchedCommand } from './CommandDispatchSection';
import { SlotAssignmentModal } from './SlotAssignmentModal';
import { InstanceActionModals } from './ManageEngineModals';
import { CreatedCredentialsDialog } from './CreatedCredentialsDialog';
import { InstanceOverviewTab } from './tabs/InstanceOverviewTab';
import { InstanceTelemetryTab } from './tabs/InstanceTelemetryTab';
import { InstanceExtensionsTab } from './tabs/InstanceExtensionsTab';
import { InstanceStreamsTab } from './tabs/InstanceStreamsTab';

type ManifestExtension = EngineInstanceDetailPayload['manifest'][number];

export function InstanceDetailContent({ instanceId }: { instanceId: string }) {
  const toast = useToast();

  const [instance, setInstance] = useState<EngineInstanceDetailPayload | null>(null);
  const [commands, setCommands] = useState<DispatchedCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab State: Overview, Resources & Telemetry, Active Extensions, Commands, Live Streams
  const [activeTab, setActiveTab] = useState<'overview' | 'telemetry' | 'extensions' | 'commands' | 'live'>('overview');
  const [manifestFilter, setManifestFilter] = useState('');

  // Command dispatch state
  const [cmdId, setCmdId] = useState(1001);
  const [cmdType, setCmdType] = useState('Ping');
  const [cmdParams, setCmdParams] = useState('{}');
  const [dispatching, setDispatching] = useState(false);

  // Slot assignment modal state
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [selectedSlotKind, setSelectedSlotKind] = useState<'Adapter' | 'Strategy' | 'NeuralNetwork' | 'HookPlugin'>('Strategy');
  const [selectedExtensionName, setSelectedExtensionName] = useState('');
  const [isSlotActive, setIsSlotActive] = useState(true);
  const [updatingSlot, setUpdatingSlot] = useState(false);

  // Manage engine modals
  const [renameOpen, setRenameOpen] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [credsModalData, setCredsModalData] = useState<{ instanceId: string; engineId: string; apiKey: string } | null>(null);

  async function loadDetails() {
    setLoading(true);
    setError(null);
    try {
      const client = getApiClient();
      const [instRes, cmdsRes] = await Promise.all([
        client.GET('/api/instances/{instanceId}', { params: { path: { instanceId } } }),
        client.GET('/api/instances/{instanceId}/commands', { params: { path: { instanceId } } }),
      ]);

      if (instRes.data) {
        setInstance(instRes.data);
      } else {
        setError('Engine instance not found or decommissioned.');
      }

      if (cmdsRes.data) {
        setCommands(cmdsRes.data as unknown as DispatchedCommand[]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error communicating with Cloud API backend.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetails();
  }, [instanceId]);

  function applyPreset(preset: typeof COMMAND_PRESETS[number]) {
    setCmdId(preset.id);
    setCmdType(preset.type);
    setCmdParams(preset.params);
    toast.info('Preset Loaded', `Populated ${preset.type} parameters`);
  }

  async function handleDispatch(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (cmdParams.trim()) JSON.parse(cmdParams);
    } catch {
      toast.error('Invalid JSON', 'Command parameters must be valid JSON');
      return;
    }

    setDispatching(true);
    try {
      const client = getApiClient();
      const { data, error: err } = await client.POST('/api/instances/{instanceId}/commands', {
        params: { path: { instanceId } },
        body: {
          commandId: cmdId,
          commandType: cmdType,
          parameters: cmdParams.trim() ? cmdParams : '{}',
        },
      });

      if (err) {
        toast.error('Dispatch Failed', typeof err === 'string' ? err : 'Server rejected the command');
      } else {
        toast.success(
          'Command Dispatched',
          `Queued ${cmdType} (#${cmdId}) [Correlation: ${formatHash(data?.correlationId || '', 6)}]`
        );
        loadDetails();
      }
    } catch (e) {
      toast.error('Dispatch Error', e instanceof Error ? e.message : 'Unknown communication error');
    } finally {
      setDispatching(false);
    }
  }

  async function handleSlotSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedExtensionName.trim()) {
      toast.error('Validation Error', 'Please select or enter an extension name');
      return;
    }

    setUpdatingSlot(true);
    try {
      const client = getApiClient();
      const currentSelections = instance?.activeSelections || {
        adapter: null,
        strategy: null,
        neuralNetwork: null,
        hookPlugins: [],
      };

      let newSelections = { ...currentSelections };

      if (selectedSlotKind === 'Adapter') {
        newSelections.adapter = isSlotActive ? selectedExtensionName : null;
      } else if (selectedSlotKind === 'Strategy') {
        newSelections.strategy = isSlotActive ? selectedExtensionName : null;
      } else if (selectedSlotKind === 'NeuralNetwork') {
        newSelections.neuralNetwork = isSlotActive ? selectedExtensionName : null;
      } else if (selectedSlotKind === 'HookPlugin') {
        const hooks = new Set(newSelections.hookPlugins || []);
        if (isSlotActive) {
          hooks.add(selectedExtensionName);
        } else {
          hooks.delete(selectedExtensionName);
        }
        newSelections.hookPlugins = Array.from(hooks);
      }

      const { data, error: err } = await client.PUT('/api/instances/{instanceId}/profile/selections', {
        params: { path: { instanceId } },
        body: {
          kind: selectedSlotKind,
          name: selectedExtensionName,
          isActive: isSlotActive,
        },
      });

      if (err) {
        toast.error('Failed to configure slot', typeof err === 'string' ? err : 'Internal error');
      } else {
        toast.success(
          'Slot Configured',
          `${selectedSlotKind} assigned to ${selectedExtensionName} (${isSlotActive ? 'Active' : 'Disabled'})`
        );
        setSlotModalOpen(false);
        loadDetails();
      }
    } catch (e) {
      toast.error('Slot Error', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setUpdatingSlot(false);
    }
  }

  function openSlotModal(kind: 'Adapter' | 'Strategy' | 'NeuralNetwork' | 'HookPlugin', defaultName?: string) {
    setSelectedSlotKind(kind);
    setSelectedExtensionName(defaultName || '');
    setIsSlotActive(true);
    setSlotModalOpen(true);
  }

  const badge = instance ? getInstanceStatusBadge(instance.status) : null;
  const filteredManifest = (instance?.manifest || []).filter((ext) => {
    if (!manifestFilter.trim()) return true;
    const q = manifestFilter.toLowerCase();
    return ext.name.toLowerCase().includes(q) || ext.kind.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Back Link */}
      <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
        <Link href="/instances" className="hover:text-zinc-200 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Fleet</span>
        </Link>
        <span>/</span>
        <span className="text-zinc-300">Engine {instance?.name || formatHash(instanceId, 6)}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Server className="w-6 h-6 text-cyan-400" />
              <span>{instance?.name || instance?.engineId || 'Engine Instance'}</span>
            </h2>
            {badge && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium ${badge.className}`}>
                {badge.label}
              </span>
            )}
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium flex items-center gap-1.5 ${
                instance?.isConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  instance?.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                }`}
              />
              {instance?.isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
          <p className="text-xs font-mono text-zinc-400 mt-1">Instance ID: {instanceId}</p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/live?instanceId=${instanceId}`}
            title="Open Dedicated Live Trading Manager"
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs font-mono transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Live Manager</span>
          </Link>
          <button
            onClick={() => {
              const savedKey = typeof window !== 'undefined' ? localStorage.getItem(`engine_key_${instanceId}`) : null;
              setCredsModalData({
                instanceId,
                engineId: instance?.engineId || 'engine-worker-01',
                apiKey: savedKey || '<YOUR_GENERATED_API_KEY>',
              });
            }}
            title="View Engine Launch Command"
            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-xs font-mono text-emerald-400 transition-colors flex items-center gap-1.5"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Run Command</span>
          </button>
          <Link
            href={`/maintenance?instanceId=${instanceId}`}
            title="Open Maintenance & Command Dispatch Console"
            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-cyan-950/60 border border-zinc-700/60 hover:border-cyan-500/40 text-xs font-mono text-cyan-300 transition-colors flex items-center gap-1.5"
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Maintenance Console</span>
          </Link>
          <button
            onClick={() => setRenameOpen(true)}
            title="Rename Engine Instance"
            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/60 text-xs font-mono text-zinc-300 transition-colors flex items-center gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Rename</span>
          </button>
          <button
            onClick={() => setRotateOpen(true)}
            title="Rotate Engine API Key"
            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-amber-500/10 border border-zinc-700/60 hover:border-amber-500/30 text-xs font-mono text-amber-300 transition-colors flex items-center gap-1.5"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Rotate Key</span>
          </button>
          <button
            onClick={() => setRevokeOpen(true)}
            title="Revoke Engine API Key"
            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/10 border border-zinc-700/60 hover:border-rose-500/30 text-xs font-mono text-rose-300 transition-colors flex items-center gap-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Revoke</span>
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            title="Decommission Engine Instance"
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/10 border border-zinc-700/60 hover:border-rose-500/30 text-xs font-mono text-rose-400 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={loadDetails}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-zinc-800 gap-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-mono font-medium flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('telemetry')}
          className={`px-4 py-2.5 text-xs font-mono font-medium flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'telemetry'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Resources & Telemetry</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('extensions')}
          className={`px-4 py-2.5 text-xs font-mono font-medium flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'extensions'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Active Extensions</span>
          {instance?.manifest && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-800 text-zinc-300">
              {instance.manifest.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('commands')}
          className={`px-4 py-2.5 text-xs font-mono font-medium flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'commands'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Commands</span>
          {commands.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-800 text-zinc-300">
              {commands.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('live')}
          className={`px-4 py-2.5 text-xs font-mono font-medium flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'live'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
          }`}
        >
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>Live Streams</span>
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
        <>
          {/* TAB 1: OVERVIEW */}
          <div className={activeTab === 'overview' ? 'space-y-6' : 'hidden'}>
            <InstanceOverviewTab
              instanceId={instanceId}
              instance={instance}
              commands={commands}
              onNavigateToExtensions={() => setActiveTab('extensions')}
              onNavigateToCommands={() => setActiveTab('commands')}
            />
          </div>

          {/* TAB 2: RESOURCES & TELEMETRY */}
          <div className={activeTab === 'telemetry' ? 'space-y-6' : 'hidden'}>
            <InstanceTelemetryTab />
          </div>

          {/* TAB 3: ACTIVE EXTENSIONS & MANIFEST */}
          <div className={activeTab === 'extensions' ? 'space-y-6' : 'hidden'}>
            <InstanceExtensionsTab
              instance={instance}
              manifestFilter={manifestFilter}
              setManifestFilter={setManifestFilter}
              filteredManifest={filteredManifest}
              onOpenSlotModal={openSlotModal}
            />
          </div>

          {/* TAB 4: COMMANDS & DISPATCH */}
          <div className={activeTab === 'commands' ? 'space-y-6' : 'hidden'}>
            <CommandDispatchSection
              cmdId={cmdId}
              setCmdId={setCmdId}
              cmdType={cmdType}
              setCmdType={setCmdType}
              cmdParams={cmdParams}
              setCmdParams={setCmdParams}
              dispatching={dispatching}
              onDispatch={handleDispatch}
              onApplyPreset={applyPreset}
              commands={commands}
            />
          </div>

          {/* TAB 5: LIVE STREAMS & TELEMETRY */}
          <div className={activeTab === 'live' ? 'space-y-6' : 'hidden'}>
            <InstanceStreamsTab
              instanceId={instanceId}
              instance={instance}
            />
          </div>
        </>
      )}

      {/* Modal: Slot Assignment */}
      <SlotAssignmentModal
        isOpen={slotModalOpen}
        onClose={() => setSlotModalOpen(false)}
        instanceId={instanceId}
        selectedSlotKind={selectedSlotKind}
        setSelectedSlotKind={setSelectedSlotKind}
        selectedExtensionName={selectedExtensionName}
        setSelectedExtensionName={setSelectedExtensionName}
        isSlotActive={isSlotActive}
        setIsSlotActive={setIsSlotActive}
        updatingSlot={updatingSlot}
        onSubmit={handleSlotSubmit}
        manifest={instance?.manifest}
      />

      {/* Modals: Manage Engine (Rename, Rotate Key, Revoke Key, Decommission) */}
      <InstanceActionModals
        instanceId={instanceId}
        instanceName={instance?.name}
        renameOpen={renameOpen}
        setRenameOpen={setRenameOpen}
        rotateOpen={rotateOpen}
        setRotateOpen={setRotateOpen}
        revokeOpen={revokeOpen}
        setRevokeOpen={setRevokeOpen}
        deleteOpen={deleteOpen}
        setDeleteOpen={setDeleteOpen}
        onRenamed={(newName) => setInstance((prev) => (prev ? { ...prev, name: newName } : null))}
        onReload={loadDetails}
      />

      {/* Modal: Launch Command & Issued Credentials */}
      <CreatedCredentialsDialog
        credentials={credsModalData}
        onClose={() => setCredsModalData(null)}
      />
    </div>
  );
}
