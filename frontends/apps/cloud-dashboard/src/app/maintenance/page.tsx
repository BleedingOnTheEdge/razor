'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Terminal, RefreshCw, Send, CheckCircle2, Clock, AlertTriangle, ArrowRight, Server } from 'lucide-react';
import { Card, Button, Badge, formatTimestamp, formatHash } from '@razor/ui-kit';
import { getApiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { COMMAND_PRESETS, type DispatchedCommand } from '@/components/instances/CommandDispatchSection';

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
      const client = getApiClient();
      const { data, error } = await client.GET('/api/instances');
      if (data && Array.isArray(data)) {
        setInstances(data);
        if (!selectedInstanceId && data.length > 0) {
          setSelectedInstanceId(data[0].instanceId);
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
      const client = getApiClient();
      const { data } = await client.GET('/api/instances/{instanceId}/commands', {
        params: { path: { instanceId } },
      });
      if (data && Array.isArray(data)) {
        setCommands(data as unknown as DispatchedCommand[]);
      }
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
          numericCommandId: Number(cmdId),
          commandType: cmdType,
          parametersJson: cmdParams.trim() ? cmdParams : '{}',
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2.5">
            <Terminal className="w-6 h-6 text-cyan-600" />
            <span>Maintenance & Command Dispatch Console</span>
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Execute operational diagnostics, state-machine transitions, and hot-reload commands across engine instances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              loadInstances();
              if (selectedInstanceId) loadCommands(selectedInstanceId);
            }}
            disabled={loadingInstances || loadingCommands}
            className="flex items-center gap-1.5 text-xs font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingInstances || loadingCommands ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Target Node Selector */}
      <Card className="p-5 border-zinc-200 bg-white shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-600" />
            <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wider font-mono">
              Target Engine Node
            </span>
          </div>
          {selectedEngine && (
            <div className="flex items-center gap-2">
              <Badge variant={selectedEngine.isConnected ? 'success' : 'neutral'} dot>
                {selectedEngine.isConnected ? 'Online & Active' : 'Offline'}
              </Badge>
              <span className="text-xs text-zinc-500 font-mono">
                ID: {formatHash(selectedEngine.instanceId, 6)}
              </span>
            </div>
          )}
        </div>

        <select
          value={selectedInstanceId}
          onChange={(e) => setSelectedInstanceId(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:border-cyan-500 font-mono"
        >
          {instances.map((inst) => (
            <option key={inst.instanceId} value={inst.instanceId}>
              {inst.name} ({inst.engineId || inst.instanceId}) — {inst.isConnected ? '● Connected' : '○ Offline'}
            </option>
          ))}
        </select>
      </Card>

      {/* Dispatch Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form & Presets (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border-zinc-200 bg-white shadow-sm space-y-5">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider font-mono flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-600" />
                <span>Command Execution Form</span>
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Select a preset or configure custom opcode and payload parameters.
              </p>
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block">
                Standard Control Presets
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COMMAND_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                      cmdId === preset.id
                        ? 'border-cyan-500 bg-cyan-50/70 text-cyan-900 ring-1 ring-cyan-500'
                        : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    <span className="text-xs font-bold font-mono">{preset.label}</span>
                    <span className="text-[10px] text-zinc-500 mt-1 line-clamp-1">{preset.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleDispatch} className="space-y-4 pt-2 border-t border-zinc-100 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-zinc-700 mb-1 font-semibold">Numeric Opcode</label>
                  <input
                    type="number"
                    value={cmdId}
                    onChange={(e) => setCmdId(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 mb-1 font-semibold">Command Type</label>
                  <input
                    type="text"
                    value={cmdType}
                    onChange={(e) => setCmdType(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 mb-1 font-semibold">Timeout (Seconds)</label>
                  <input
                    type="number"
                    value={timeoutSeconds}
                    onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                    min={1}
                    max={300}
                    required
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 mb-1 font-semibold">Parameters JSON Payload</label>
                <textarea
                  value={cmdParams}
                  onChange={(e) => setCmdParams(e.target.value)}
                  rows={4}
                  className="w-full p-3 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:border-cyan-500 text-xs font-mono"
                  placeholder="{}"
                />
              </div>

              <Button
                type="submit"
                disabled={dispatching || !selectedInstanceId}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-mono bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {dispatching ? 'Dispatching Wire Protocol...' : `Transmit ${cmdType} Command →`}
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Execution History Log (1 col) */}
        <div>
          <Card className="p-5 border-zinc-200 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <span className="text-xs font-bold font-mono text-zinc-900 uppercase tracking-wider">
                Command Log
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                {commands.length} records
              </span>
            </div>

            {commands.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500 font-mono">
                No recent commands recorded for this node.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {commands.map((cmd) => (
                  <div
                    key={cmd.commandId}
                    className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/70 text-xs font-mono space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900">{cmd.commandType}</span>
                      <span className="text-[10px] text-zinc-500">#{cmd.numericCommandId}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span>{cmd.status}</span>
                      <span>{formatTimestamp(cmd.submittedAt)}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      Corr: {formatHash(cmd.correlationId, 8)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function MaintenancePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm font-mono text-zinc-500">
          Loading Maintenance Console...
        </div>
      }
    >
      <MaintenanceContent />
    </Suspense>
  );
}
