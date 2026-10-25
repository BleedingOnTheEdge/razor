'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Terminal, RefreshCw, Send, CheckCircle2, Clock, AlertTriangle, ArrowRight, Server, Eye } from 'lucide-react';
import { formatTimestamp, formatHash } from '@razor/ui-kit';
import { getApiBaseUrl, getAuthHeaders, getApiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { COMMAND_PRESETS, type DispatchedCommand } from '@/components/instances/CommandDispatchSection';
import { CommandEventDetailModal } from '@/components/instances/CommandEventDetailModal';

interface EngineInstanceItem {
  instanceId: string;
  name: string;
  engineId: string;
  isConnected: boolean;
  status: string;
}

function MaintenanceContent() {
  const searchParams = useSearchParams();
  const initialInstanceId = searchParams.get('instanceId') || '';
  const toast = useToast();

  const [instances, setInstances] = useState<EngineInstanceItem[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>(initialInstanceId);
  const [loadingInstances, setLoadingInstances] = useState(true);

  // Command dispatch state
  const [cmdId, setCmdId] = useState<number>(1001);
  const [cmdType, setCmdType] = useState<string>('Ping');
  const [cmdParams, setCmdParams] = useState<string>('{}');
  const [timeoutSeconds, setTimeoutSeconds] = useState<number>(30);
  const [dispatching, setDispatching] = useState<boolean>(false);
  const [commands, setCommands] = useState<DispatchedCommand[]>([]);
  const [loadingCommands, setLoadingCommands] = useState<boolean>(false);

  // Modal inspection state
  const [selectedCommandForDetail, setSelectedCommandForDetail] = useState<DispatchedCommand | null>(null);
  const [eventDetailModalOpen, setEventDetailModalOpen] = useState(false);

  useEffect(() => {
    loadInstances();
  }, []);

  useEffect(() => {
    if (selectedInstanceId) {
      loadCommands(selectedInstanceId);
    }
  }, [selectedInstanceId]);

  async function loadInstances() {
    setLoadingInstances(true);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();
      const res = await fetch(`${baseUrl}/api/instances`, { headers });
      const rawData = await res.json();
      const items: EngineInstanceItem[] = Array.isArray(rawData) ? rawData : rawData.items || [];

      if (items.length > 0) {
        setInstances(items);
        if (!selectedInstanceId || !items.some((i) => i.instanceId === selectedInstanceId)) {
          setSelectedInstanceId(items[0].instanceId);
        }
      }
    } catch {
      toast.error('Network Error', 'Failed to fetch engine instances.');
    } finally {
      setLoadingInstances(false);
    }
  }

  async function loadCommands(instanceId: string) {
    setLoadingCommands(true);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();
      const res = await fetch(`${baseUrl}/api/instances/${instanceId}/commands`, { headers });
      const rawData = await res.json();
      const items = Array.isArray(rawData) ? rawData : rawData.items || [];
      setCommands(items as DispatchedCommand[]);
    } catch {
      // Ignored non-critical failure
    } finally {
      setLoadingCommands(false);
    }
  }

  function handleApplyPreset(preset: typeof COMMAND_PRESETS[number]) {
    setCmdId(preset.id);
    setCmdType(preset.type);
    setCmdParams(preset.params);
  }

  async function handleDispatch(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInstanceId) {
      toast.error('No Engine Selected', 'Please choose a target engine node first.');
      return;
    }

    setDispatching(true);
    try {
      const client = getApiClient();
      const { data, error: err } = await client.POST('/api/instances/{instanceId}/commands', {
        params: { path: { instanceId: selectedInstanceId } },
        body: {
          commandId: Number(cmdId),
          commandType: cmdType,
          parameters: cmdParams.trim() ? cmdParams : '{}',
          timeoutSeconds: Number(timeoutSeconds),
        },
      });

      if (err) {
        toast.error('Dispatch Failed', 'The engine rejected or timed out the command.');
      } else if (data) {
        toast.success('Command Dispatched', `${cmdType} (${cmdId}) transmitted successfully.`);
        await loadCommands(selectedInstanceId);
      }
    } catch (e) {
      toast.error('Dispatch Error', e instanceof Error ? e.message : 'Communication failure.');
    } finally {
      setDispatching(false);
    }
  }

  const selectedEngine = instances.find((i) => i.instanceId === selectedInstanceId);
  const isSelectedOnline = selectedEngine
    ? selectedEngine.isConnected || selectedEngine.status === 'Active' || selectedEngine.status === 'Healthy'
    : false;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono text-xs text-black">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-black">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-black flex items-center gap-2 uppercase">
            <Terminal className="w-5 h-5 text-black" />
            <span>Maintenance & Command Dispatch Console</span>
          </h1>
          <p className="text-xs text-black font-normal mt-1 font-sans">
            Execute operational diagnostics, state-machine transitions, and hot-reload commands across engine instances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              loadInstances();
              if (selectedInstanceId) loadCommands(selectedInstanceId);
            }}
            disabled={loadingInstances || loadingCommands}
            className="px-3 py-1.5 border border-black bg-white hover:bg-black hover:text-white text-black font-bold transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingInstances || loadingCommands ? 'animate-spin' : ''}`} />
            <span>[REFRESH]</span>
          </button>
        </div>
      </div>

      {/* Target Node Selector */}
      <div className="p-4 border border-black bg-white space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-black" />
            <span className="font-bold text-black uppercase">
              Target Engine Node
            </span>
          </div>
          {selectedEngine && (
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 font-bold border border-black ${
                  isSelectedOnline ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-black'
                }`}
              >
                {isSelectedOnline ? '[ONLINE & ACTIVE]' : '[OFFLINE]'}
              </span>
              <span className="text-black">
                ID: {formatHash(selectedEngine.instanceId, 8)}
              </span>
            </div>
          )}
        </div>

        <select
          value={selectedInstanceId}
          onChange={(e) => setSelectedInstanceId(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-black text-black font-mono focus:outline-none"
        >
          {instances.map((inst) => {
            const isOnline = inst.isConnected || inst.status === 'Active' || inst.status === 'Healthy';
            return (
              <option key={inst.instanceId} value={inst.instanceId}>
                {inst.name} ({inst.engineId || inst.instanceId}) — {isOnline ? '● Connected' : '○ Offline'}
              </option>
            );
          })}
        </select>
      </div>

      {/* Dispatch Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form & Presets (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-5 border border-black bg-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-black uppercase tracking-wider flex items-center gap-2">
                  <Send className="w-4 h-4 text-black" />
                  <span>Command Execution Form</span>
                </h2>
                <p className="text-xs text-black font-normal mt-0.5 font-sans">
                  Select a preset or configure custom opcode and payload parameters.
                </p>
              </div>

              {/* Top Alias Submit Button */}
              <button
                type="button"
                onClick={handleDispatch}
                disabled={dispatching || !selectedInstanceId}
                className="px-4 py-2 border border-black bg-black text-white hover:bg-zinc-800 disabled:opacity-50 text-xs font-bold uppercase transition-colors flex items-center gap-2 shrink-0 self-start sm:self-auto"
                title="Execute command directly from top"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{dispatching ? 'DISPATCHING...' : `EXECUTE ${cmdType.toUpperCase()}`}</span>
              </button>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-black uppercase tracking-wider block">
                Standard Control Presets
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COMMAND_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`p-2.5 border text-left transition-colors flex flex-col justify-between ${
                      cmdId === preset.id
                        ? 'border-black bg-black text-white font-bold'
                        : 'border-black bg-white hover:bg-zinc-100 text-black'
                    }`}
                  >
                    <span className="font-bold">{preset.label}</span>
                    <span className="text-[10px] opacity-80 mt-1 line-clamp-1">{preset.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleDispatch} className="space-y-4 pt-3 border-t border-black">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-black mb-1 font-bold uppercase">Numeric Opcode</label>
                  <input
                    type="number"
                    value={cmdId}
                    onChange={(e) => setCmdId(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 bg-white border border-black text-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-black mb-1 font-bold uppercase">Command Type</label>
                  <input
                    type="text"
                    value={cmdType}
                    onChange={(e) => setCmdType(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-black text-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-black mb-1 font-bold uppercase">Timeout (Seconds)</label>
                  <input
                    type="number"
                    value={timeoutSeconds}
                    onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                    min={1}
                    max={300}
                    required
                    className="w-full px-3 py-2 bg-white border border-black text-black focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-black mb-1 font-bold uppercase">Parameters JSON Payload</label>
                <textarea
                  value={cmdParams}
                  onChange={(e) => setCmdParams(e.target.value)}
                  rows={4}
                  className="w-full p-3 bg-white border border-black text-black focus:outline-none text-xs font-mono"
                  placeholder="{}"
                />
              </div>

              <button
                type="submit"
                disabled={dispatching || !selectedInstanceId}
                className="w-full sm:w-auto px-6 py-2.5 border border-black bg-white hover:bg-black hover:text-white disabled:opacity-50 text-black font-bold transition-colors"
              >
                {dispatching ? '[DISPATCHING WIRE PROTOCOL...]' : `[TRANSMIT ${cmdType.toUpperCase()} COMMAND →]`}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Execution History Log (1 col) */}
        <div>
          <div className="p-5 border border-black bg-white space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-black">
              <span className="text-xs font-bold text-black uppercase tracking-wider">
                Event Log ({commands.length})
              </span>
              <span className="text-[11px] text-zinc-600 font-sans">
                Click to inspect payload
              </span>
            </div>

            {commands.length === 0 ? (
              <div className="py-8 text-center text-xs text-black border border-black">
                [NO RECENT COMMANDS RECORDED FOR THIS NODE]
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {commands.map((cmd) => (
                  <div
                    key={cmd.commandId}
                    onClick={() => {
                      setSelectedCommandForDetail(cmd);
                      setEventDetailModalOpen(true);
                    }}
                    className="p-3 border border-black bg-white hover:bg-zinc-50 cursor-pointer text-xs space-y-1 transition-colors"
                    title="Click to inspect response and parameters"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-black">{cmd.commandType}</span>
                      <span className="font-bold text-black">#{cmd.numericCommandId}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-700">
                      <span className="font-bold">[{cmd.status?.toUpperCase()}]</span>
                      <span>{formatTimestamp(cmd.submittedAt)}</span>
                    </div>
                    <div className="text-[10px] text-zinc-600 truncate flex items-center justify-between">
                      <span>Corr: {formatHash(cmd.correlationId, 8)}</span>
                      <span className="text-black font-bold">[INSPECT]</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Command & Event Response Detail Modal */}
      <CommandEventDetailModal
        command={selectedCommandForDetail}
        isOpen={eventDetailModalOpen}
        onClose={() => {
          setEventDetailModalOpen(false);
          setSelectedCommandForDetail(null);
        }}
      />
    </div>
  );
}

export default function MaintenancePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm font-bold text-black font-mono">
          [LOADING MAINTENANCE CONSOLE...]
        </div>
      }
    >
      <MaintenanceContent />
    </Suspense>
  );
}
