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
} from 'lucide-react';
import {
  CommandDispatchSection,
  COMMAND_PRESETS,
} from './CommandDispatchSection';
import { SlotAssignmentModal } from './SlotAssignmentModal';

type ManifestExtension = EngineInstanceDetailPayload['manifest'][number];

export function InstanceDetailContent({ instanceId }: { instanceId: string }) {
  const toast = useToast();

  const [instance, setInstance] = useState<EngineInstanceDetailPayload | null>(null);
  const [commands, setCommands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError('Engine instance not found or decommissioned.');
      }

      if (cmdsRes.data) {
        setCommands(cmdsRes.data);
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
    // Validate JSON parameters
    try {
      if (cmdParams.trim()) {
        JSON.parse(cmdParams);
      }
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
          commandId: Number(cmdId),
          commandType: cmdType,
          parameters: cmdParams,
          timeoutSeconds: 30,
        },
      });

      if (err) {
        toast.error('Dispatch Failed', 'The backend rejected the engine command.');
      } else if (data) {
        toast.success(
          'Command Dispatched',
          `Dispatched #${cmdId} (${cmdType}). Correlation: ${formatHash(data.correlationId, 6)}`
        );
        await loadDetails();
      }
    } catch (e) {
      toast.error('Dispatch Error', e instanceof Error ? e.message : 'Network communication error.');
    } finally {
      setDispatching(false);
    }
  }

  async function handleSlotSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedExtensionName.trim()) {
      toast.error('Missing Extension Name', 'Please select or type an extension name.');
      return;
    }

    setUpdatingSlot(true);
    try {
      const client = getApiClient();
      const { data, error: err } = await client.PUT('/api/instances/{instanceId}/profile/selections', {
        params: { path: { instanceId } },
        body: {
          kind: selectedSlotKind,
          name: selectedExtensionName.trim(),
          isActive: isSlotActive,
        },
      });

      if (err) {
        toast.error('Slot Update Failed', 'Engine profile rejected selection.');
      } else if (data) {
        toast.success('Slot Configured', `Updated ${selectedSlotKind} slot to ${selectedExtensionName}`);
        setSlotModalOpen(false);
        await loadDetails();
      }
    } catch (e) {
      toast.error('Slot Update Error', e instanceof Error ? e.message : 'Network error.');
    } finally {
      setUpdatingSlot(false);
    }
  }

  function openSlotModal(kind: string, defaultName?: string) {
    setSelectedSlotKind(kind as 'Adapter' | 'Strategy' | 'NeuralNetwork' | 'HookPlugin');
    setSelectedExtensionName(defaultName || '');
    setIsSlotActive(true);
    setSlotModalOpen(true);
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
        <span className="text-zinc-300">Engine {instance?.name || formatHash(instanceId, 6)}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                    <span>Active Extension Profile Slots</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                    Zero-downtime hot-swappable slots currently occupied on this running engine.
                  </p>
                </div>

                <button
                  onClick={() => openSlotModal('Strategy')}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold text-xs font-mono transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Configure Slot</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Adapter Slot */}
                <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-zinc-400">Adapter Slot</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400">
                        Feed / Broker
                      </span>
                    </div>
                    <span className="text-sm font-bold text-white mt-2 block font-mono">
                      {instance.activeSelections?.adapter || 'None (Dormant)'}
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-zinc-800/50 flex justify-end">
                    <button
                      onClick={() => openSlotModal('Adapter', instance.activeSelections?.adapter || undefined)}
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Hot-Swap Adapter →
                    </button>
                  </div>
                </div>

                {/* Strategy Slot */}
                <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-zinc-400">Strategy Slot</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400">
                        Order Logic
                      </span>
                    </div>
                    <span className="text-sm font-bold text-white mt-2 block font-mono">
                      {instance.activeSelections?.strategy || 'None (Dormant)'}
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-zinc-800/50 flex justify-end">
                    <button
                      onClick={() => openSlotModal('Strategy', instance.activeSelections?.strategy || undefined)}
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Hot-Swap Strategy →
                    </button>
                  </div>
                </div>

                {/* Neural Network Slot */}
                <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-zinc-400">Neural Network Slot</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-400">
                        Inference
                      </span>
                    </div>
                    <span className="text-sm font-bold text-white mt-2 block font-mono">
                      {instance.activeSelections?.neuralNetwork || 'None'}
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-zinc-800/50 flex justify-end">
                    <button
                      onClick={() => openSlotModal('NeuralNetwork', instance.activeSelections?.neuralNetwork || undefined)}
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Hot-Swap Model →
                    </button>
                  </div>
                </div>

                {/* Hook Plugins Slot */}
                <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-zinc-400">Hook Plugins</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400">
                        Interceptors
                      </span>
                    </div>
                    <span className="text-sm font-bold text-white mt-2 block font-mono">
                      {instance.activeSelections?.hookPlugins?.length || 0} loaded
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-zinc-800/50 flex justify-end">
                    <button
                      onClick={() => openSlotModal('HookPlugin')}
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Add Hook Plugin →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Manifest Extensions Card */}
            <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                    Reported Extension Manifest
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                    All binaries and scripts discovered and registered by the engine during bootstrap.
                  </p>
                </div>
                <span className="text-xs text-zinc-400 font-mono">
                  {instance.manifest?.length || 0} registered
                </span>
              </div>

              {!instance.manifest || instance.manifest.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-zinc-400">
                  No extensions reported in engine manifest yet.
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {instance.manifest.map((ext: ManifestExtension, idx: number) => {
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
                        <div className="flex items-center gap-4">
                          <span className="text-zinc-400">{formatTimestamp(ext.reportedAt)}</span>
                          <button
                            onClick={() => openSlotModal(ext.kind, ext.name)}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-400 text-[11px] transition-colors"
                          >
                            Assign Slot
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Command Dispatch & History */}
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
      )}

      {/* Modal: Slot Assignment */}
      <SlotAssignmentModal
        isOpen={slotModalOpen}
        onClose={() => setSlotModalOpen(false)}
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
    </div>
  );
}
