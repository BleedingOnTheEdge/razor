'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiClient } from '@/lib/api-client';
import type { EngineInstanceDetailPayload } from '@razor/api-client';
import { useToast } from '@/components/ui/toast';
import {
  getInstanceStatusBadge,
  formatTimestamp,
  formatHash,
} from '@razor/ui-kit';
import {
  ArrowLeft,
  RefreshCw,
  Server,
  Radio,
  Terminal,
  Cpu,
  SlidersHorizontal,
  Key,
  ShieldAlert,
  Trash2,
  Edit2,
  Sliders,
  Send,
} from 'lucide-react';
import { ActionDropdown, type ActionDropdownItem } from '@/components/ui/ActionDropdown';
import { CommandDispatchSection, COMMAND_PRESETS, type DispatchedCommand } from './CommandDispatchSection';
import { SlotAssignmentModal } from './SlotAssignmentModal';
import { InstanceActionModals } from './ManageEngineModals';
import { CreatedCredentialsDialog } from './CreatedCredentialsDialog';
import { CommandEventDetailModal } from './CommandEventDetailModal';
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
  const [manifestFilter, setManifestFilter] = useState('');

  // Command dispatch state
  const [cmdId, setCmdId] = useState(1001);
  const [cmdType, setCmdType] = useState('Ping');
  const [cmdParams, setCmdParams] = useState('{}');
  const [dispatching, setDispatching] = useState(false);

  // Command detail modal state
  const [selectedCommandForDetail, setSelectedCommandForDetail] = useState<DispatchedCommand | null>(null);
  const [eventDetailModalOpen, setEventDetailModalOpen] = useState(false);

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

  function handleSelectCommandForDetail(cmd: DispatchedCommand) {
    setSelectedCommandForDetail(cmd);
    setEventDetailModalOpen(true);
  }

  const badge = instance ? getInstanceStatusBadge(instance.status) : null;
  const filteredManifest = (instance?.manifest || []).filter((ext) => {
    if (!manifestFilter.trim()) return true;
    const q = manifestFilter.toLowerCase();
    return ext.name.toLowerCase().includes(q) || ext.kind.toLowerCase().includes(q);
  });

  const manageDropdownItems: ActionDropdownItem[] = [
    {
      label: '[RUN COMMAND CREDENTIALS]',
      onClick: () => {
        const savedKey = typeof window !== 'undefined' ? localStorage.getItem(`engine_key_${instanceId}`) : null;
        setCredsModalData({
          instanceId,
          engineId: instance?.engineId || 'engine-worker-01',
          apiKey: savedKey || '<YOUR_GENERATED_API_KEY>',
        });
      },
    },
    {
      label: '[MAINTENANCE CONSOLE]',
      href: `/panel/maintenance?instanceId=${instanceId}`,
    },
    {
      label: '[RENAME ENGINE]',
      onClick: () => setRenameOpen(true),
    },
    {
      label: '[CONFIGURE SLOTS]',
      onClick: () => openSlotModal('Strategy'),
    },
    {
      label: '[ROTATE API KEY]',
      onClick: () => setRotateOpen(true),
    },
    {
      label: '[REVOKE API KEY]',
      onClick: () => setRevokeOpen(true),
      danger: true,
    },
    {
      label: '[DECOMMISSION ENGINE]',
      onClick: () => setDeleteOpen(true),
      danger: true,
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl font-mono">
      {/* Back Link */}
      <div className="flex items-center gap-2 text-xs text-black">
        <Link href="/panel/instances" className="hover:underline flex items-center gap-1 font-bold">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>[BACK TO FLEET]</span>
        </Link>
        <span>/</span>
        <span className="font-bold">Engine {instance?.name || formatHash(instanceId, 6)}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-black">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-black flex items-center gap-2">
              <Server className="w-6 h-6 text-black shrink-0" />
              <span>{instance?.name || instance?.engineId || 'Engine Instance'}</span>
            </h1>
            {badge && (
              <span className="px-2.5 py-1 text-xs font-bold border border-black bg-zinc-50 text-black">
                [{badge.label?.toUpperCase()}]
              </span>
            )}
            <span className="px-2.5 py-1 text-xs font-bold border border-black bg-zinc-50 text-black flex items-center gap-1.5">
              <span
                className={`w-2 h-2 ${
                  instance?.isConnected ? 'bg-green-600' : 'bg-black'
                }`}
              />
              {instance?.isConnected ? '[CONNECTED]' : '[OFFLINE]'}
            </span>
          </div>
          <p className="text-xs text-black mt-1">Instance ID: {instanceId}</p>
        </div>

        {/* Action Toolbar: Live Manager, Refresh, and Hamburger Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Live Manager: Always visible outside */}
          <Link
            href={`/panel/live?instanceId=${instanceId}`}
            title="Open Dedicated Live Trading Manager"
            className="px-3.5 py-1.5 border border-black bg-green-600 hover:bg-green-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>[LIVE MANAGER]</span>
          </Link>

          {/* Refresh: Always visible outside */}
          <button
            onClick={loadDetails}
            className="px-3 py-1.5 border border-black bg-white hover:bg-black hover:text-white text-black text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>[REFRESH]</span>
          </button>

          {/* Grouped Actions Hamburger Dropdown */}
          <ActionDropdown
            label="[MANAGE ENGINE ▾]"
            items={manageDropdownItems}
            align="right"
          />
        </div>
      </div>

      {/* Quick Section Anchor Jump Navigation Bar */}
      <div className="sticky top-0 z-20 bg-white py-2 border-b border-black flex items-center gap-2 overflow-x-auto text-xs font-bold">
        <a
          href="#overview"
          className="px-3 py-1 border border-black bg-white hover:bg-black hover:text-white text-black transition-colors"
        >
          # OVERVIEW
        </a>
        <a
          href="#telemetry"
          className="px-3 py-1 border border-black bg-white hover:bg-black hover:text-white text-black transition-colors"
        >
          # TELEMETRY
        </a>
        <a
          href="#extensions"
          className="px-3 py-1 border border-black bg-white hover:bg-black hover:text-white text-black transition-colors"
        >
          # EXTENSIONS ({instance?.manifest?.length || 0})
        </a>
        <a
          href="#commands"
          className="px-3 py-1 border border-black bg-white hover:bg-black hover:text-white text-black transition-colors"
        >
          # COMMANDS ({commands.length})
        </a>
        <a
          href="#livestreams"
          className="px-3 py-1 border border-black bg-white hover:bg-black hover:text-white text-black transition-colors"
        >
          # LIVE STREAM
        </a>
      </div>

      {loading && (
        <div className="py-12 text-center text-sm font-bold text-black border border-black">
          [LOADING ENGINE CONFIGURATION & TELEMETRY STATE...]
        </div>
      )}

      {error && (
        <div className="p-4 border border-black text-red-600 text-sm font-bold">
          [ERROR]: {error}
        </div>
      )}

      {instance && (
        <div className="space-y-8">
          {/* SECTION 1: OVERVIEW */}
          <section id="overview" className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-black">
              <h2 className="text-base font-bold text-black uppercase tracking-wider flex items-center gap-2">
                <Server className="w-4 h-4 text-black" />
                <span>Section 1: Engine Overview & Operational Status</span>
              </h2>
            </div>
            <InstanceOverviewTab
              instanceId={instanceId}
              instance={instance}
              commands={commands}
              onNavigateToExtensions={() => {
                const el = document.getElementById('extensions');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              onNavigateToCommands={() => {
                const el = document.getElementById('commands');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              onSelectCommand={handleSelectCommandForDetail}
            />
          </section>

          {/* SECTION 2: TELEMETRY & RESOURCES */}
          <section id="telemetry" className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-black">
              <h2 className="text-base font-bold text-black uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-black" />
                <span>Section 2: Computational Resources & Telemetry</span>
              </h2>
            </div>
            <InstanceTelemetryTab />
          </section>

          {/* SECTION 3: EXTENSIONS & SLOTS */}
          <section id="extensions" className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-black">
              <h2 className="text-base font-bold text-black uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-black" />
                <span>Section 3: Extension Manifest & Active Slot Profiles</span>
              </h2>
            </div>
            <InstanceExtensionsTab
              instance={instance}
              manifestFilter={manifestFilter}
              setManifestFilter={setManifestFilter}
              filteredManifest={filteredManifest}
              onOpenSlotModal={openSlotModal}
            />
          </section>

          {/* SECTION 4: COMMANDS & EVENT RESPONSES */}
          <section id="commands" className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-black">
              <h2 className="text-base font-bold text-black uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-black" />
                <span>Section 4: Wire Command Dispatcher & Response Inspector</span>
              </h2>
            </div>
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
              onSelectCommand={handleSelectCommandForDetail}
            />
          </section>

          {/* SECTION 5: LIVE STREAMS */}
          <section id="livestreams" className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-black">
              <h2 className="text-base font-bold text-black uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4 text-black" />
                <span>Section 5: Real-Time Tick & Event Stream Channel</span>
              </h2>
            </div>
            <InstanceStreamsTab
              instanceId={instanceId}
              instance={instance}
            />
          </section>
        </div>
      )}

      {/* Command & Event Response Detail Modal */}
      <CommandEventDetailModal
        command={selectedCommandForDetail}
        isOpen={eventDetailModalOpen}
        onClose={() => {
          setEventDetailModalOpen(false);
          setSelectedCommandForDetail(null);
        }}
      />

      {/* Slot Assignment Modal */}
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
        manifest={instance?.manifest || []}
      />

      {/* Credentials Dialog */}
      <CreatedCredentialsDialog
        credentials={credsModalData}
        onClose={() => setCredsModalData(null)}
      />

      {/* Manage Engine Modals */}
      {instance && (
        <InstanceActionModals
          instanceId={instanceId}
          instanceName={instance.name}
          renameOpen={renameOpen}
          setRenameOpen={setRenameOpen}
          rotateOpen={rotateOpen}
          setRotateOpen={setRotateOpen}
          revokeOpen={revokeOpen}
          setRevokeOpen={setRevokeOpen}
          deleteOpen={deleteOpen}
          setDeleteOpen={setDeleteOpen}
          onRenamed={(newName) => {
            if (instance) setInstance({ ...instance, name: newName });
          }}
          onReload={loadDetails}
        />
      )}
    </div>
  );
}
