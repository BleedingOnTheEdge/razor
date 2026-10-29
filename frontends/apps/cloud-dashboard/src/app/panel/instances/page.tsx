'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiBaseUrl, getAuthHeaders, getApiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/auth-context';
import { ServerPagination } from '@/components/ui/ServerPagination';
import { ShareEngineModal } from '@/components/instances/ShareEngineModal';
import { RegisterEngineModal } from '@/components/instances/RegisterEngineModal';
import { CreatedCredentialsDialog } from '@/components/instances/CreatedCredentialsDialog';
import { RunnerGuideModal } from '@/components/instances/RunnerGuideModal';
import { ActionDropdown } from '@/components/ui/ActionDropdown';
import {
  formatTimestamp,
  formatHash,
  Button,
  Card,
  Badge,
  Input,
} from '@razor/ui-kit';
import { Server, Radio, RotateCw, Search, ArrowRight, ShieldCheck, Share2, Layers, Plus, Terminal } from 'lucide-react';

interface EngineInstanceItem {
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
  isShared?: boolean;
  shareExpiresAt?: string | null;
}

export default function PanelInstancesPage() {
  const toast = useToast();
  const { user } = useAuth();

  const [instances, setInstances] = useState<EngineInstanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedInstanceForShare, setSelectedInstanceForShare] = useState<{ id: string; name: string } | null>(null);

  // Register Engine modal state
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [regAccountId, setRegAccountId] = useState('');
  const [regLicenseId, setRegLicenseId] = useState('');
  const [regEngineId, setRegEngineId] = useState('engine-worker-01');
  const [regName, setRegName] = useState('Primary Execution Engine');
  const [registering, setRegistering] = useState(false);

  // Runner guide modal state
  const [runnerGuideOpen, setRunnerGuideOpen] = useState(false);

  // Credentials dialog
  const [createdCredentials, setCreatedCredentials] = useState<{
    instanceId: string;
    engineId: string;
    apiKey: string;
  } | null>(null);

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
        if (typeof window !== 'undefined' && data.instanceId && data.apiKey) {
          try {
            localStorage.setItem(`engine_key_${data.instanceId}`, data.apiKey);
          } catch {
            // Ignore localStorage errors
          }
        }
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

  async function loadInstances() {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();
      const q = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      const res = await fetch(`${baseUrl}/api/instances?${q.toString()}`, { headers });
      if (!res.ok) {
        throw new Error(`Cloud API returned ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      if (Array.isArray(json)) {
        setInstances(json);
        setTotalCount(json.length);
        setTotalPages(Math.max(1, Math.ceil(json.length / pageSize)));
      } else if (json && Array.isArray(json.items)) {
        setInstances(json.items);
        setTotalCount(json.totalCount ?? json.items.length);
        setTotalPages(json.totalPages ?? 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching instances.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInstances();
  }, [page, pageSize]);

  const filtered = instances.filter((i) => {
    if (statusFilter === 'ONLINE' && !i.isConnected) return false;
    if (statusFilter === 'OFFLINE' && i.isConnected) return false;
    if (statusFilter === 'SHARED' && !i.isShared) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      i.name.toLowerCase().includes(q) ||
      i.engineId.toLowerCase().includes(q) ||
      i.instanceId.toLowerCase().includes(q)
    );
  });

  const onlineCount = instances.filter((i) => i.isConnected).length;

  return (
    <div className="space-y-6 max-w-7xl font-sans text-xs">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#262626]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="emerald" dot>
              Fleet Registry
            </Badge>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            Engine Fleet & Node Management
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Registered execution instances, WebSocket cluster telemetry, and temporary sharing delegations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="primary"
            pill
            size="sm"
            onClick={() => setRegisterModalOpen(true)}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Engine</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            pill
            size="sm"
            onClick={() => setRunnerGuideOpen(true)}
            className="gap-1.5"
          >
            <Terminal className="w-3.5 h-3.5 text-zinc-400" />
            <span>Runner Guide</span>
          </Button>
          <Link href="/panel/live">
            <Button variant="secondary" pill size="sm" className="gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#3ECF8E]" />
              <span>Open Live Manager</span>
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            pill
            size="sm"
            onClick={loadInstances}
            className="gap-1.5"
          >
            <RotateCw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Fleet Telemetry Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-[#171717] border-[#262626]">
          <span className="text-xs font-medium text-zinc-400 block">Online Active Nodes</span>
          <span className="text-2xl font-semibold text-[#3ECF8E] font-mono mt-1 block tabular-nums">
            {onlineCount} <span className="text-sm font-normal text-zinc-500">/ {instances.length}</span>
          </span>
        </Card>
        <Card className="p-4 bg-[#171717] border-[#262626]">
          <span className="text-xs font-medium text-zinc-400 block">Total Registered Engines</span>
          <span className="text-2xl font-semibold text-zinc-100 font-mono mt-1 block tabular-nums">
            {totalCount || instances.length}
          </span>
        </Card>
        <Card className="p-4 bg-[#171717] border-[#262626]">
          <span className="text-xs font-medium text-zinc-400 block">Account License Quota</span>
          <span className="text-2xl font-semibold text-zinc-100 font-mono mt-1 block tabular-nums">
            {user?.maxInstances || 10} <span className="text-xs font-normal text-zinc-500">Cap</span>
          </span>
        </Card>
        <Card className="p-4 bg-[#171717] border-[#262626]">
          <span className="text-xs font-medium text-zinc-400 block">Engine Sharing Grants</span>
          <span className="text-2xl font-semibold text-[#3ECF8E] font-mono mt-1 block tabular-nums">
            {instances.filter((i) => i.isShared).length} <span className="text-xs font-normal text-zinc-500">Shared</span>
          </span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-[#171717] border-[#262626]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-medium text-zinc-300 mb-1.5">Search Engine</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, ID or engine slug…"
                className="w-full pl-9 pr-3 py-1.5 border border-[#262626] rounded-lg bg-[#141414] text-zinc-100 placeholder:text-zinc-500 font-mono text-xs focus:outline-none focus:border-[#3ECF8E] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-zinc-300 mb-1.5">Connectivity Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 border border-[#262626] rounded-lg bg-[#141414] text-zinc-200 font-mono text-xs focus:outline-none focus:border-[#3ECF8E]"
            >
              <option value="ALL">All Engines</option>
              <option value="ONLINE">Online Only</option>
              <option value="OFFLINE">Offline Only</option>
              <option value="SHARED">Shared With Me</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              pill
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="w-full justify-center"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <Card className="py-16 text-center text-zinc-400 font-mono">
          Connecting to cloud fleet registry…
        </Card>
      ) : error ? (
        <Card className="p-4 border-rose-500/30 bg-rose-500/10 text-rose-400 font-medium">
          Error: {error}
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="py-16 text-center p-8 bg-[#171717] border-[#262626]">
          <Server className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="font-semibold text-zinc-200 text-sm">No Engines Found</p>
          <p className="mt-1 text-zinc-500 text-xs">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try adjusting your search criteria or connectivity filter.'
              : 'Register an engine instance to begin connecting algorithmic workers.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="primary"
              pill
              size="sm"
              onClick={() => setRegisterModalOpen(true)}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New Engine</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              pill
              size="sm"
              onClick={() => setRunnerGuideOpen(true)}
              className="gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5 text-zinc-400" />
              <span>Runner Guide</span>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#262626] bg-[#171717] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262626] bg-[#141414] text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="p-3">Engine Instance</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 hidden sm:table-cell">Slug / EngineId</th>
                  <th className="p-3 hidden md:table-cell">Extensions</th>
                  <th className="p-3 hidden lg:table-cell">Created</th>
                  <th className="p-3 hidden sm:table-cell">Ownership</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] text-xs">
                {filtered.map((inst) => (
                  <tr key={inst.instanceId} className="hover:bg-[#1f1f1f] transition-colors">
                    <td className="p-3">
                      <Link
                        href={`/panel/instances/${inst.instanceId}`}
                        className="font-medium text-zinc-100 hover:text-[#3ECF8E] transition-colors block"
                      >
                        {inst.name || 'Unnamed Engine'}
                      </Link>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        ID: {formatHash(inst.instanceId, 8)}
                      </span>
                    </td>
                    <td className="p-3">
                      {inst.isConnected ? (
                        <Badge variant="emerald" dot>
                          Online
                        </Badge>
                      ) : (
                        <Badge variant="neutral">
                          Offline
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 font-mono text-zinc-300 hidden sm:table-cell">{inst.engineId}</td>
                    <td className="p-3 text-zinc-300 hidden md:table-cell">
                      <span className="font-mono tabular-nums">{inst.manifestExtensionCount}</span> active
                    </td>
                    <td className="p-3 text-zinc-400 font-mono text-[11px] hidden lg:table-cell">
                      {formatTimestamp(inst.createdAt)}
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      {inst.isShared ? (
                        <Badge variant="warning" title={`Expires: ${inst.shareExpiresAt}`}>
                          Shared
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          Owner
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/panel/instances/${inst.instanceId}`}>
                          <Button variant="outline" size="sm" pill className="text-xs h-7 px-2.5">
                            Inspect
                          </Button>
                        </Link>
                        <ActionDropdown
                          label="⋯"
                          items={[
                            {
                              label: 'Live Manager',
                              href: `/panel/instances/${inst.instanceId}/live`,
                            },
                            {
                              label: 'Launch Command',
                              onClick: () => {
                                const savedKey =
                                  typeof window !== 'undefined'
                                    ? localStorage.getItem(`engine_key_${inst.instanceId}`)
                                    : null;
                                setCreatedCredentials({
                                  instanceId: inst.instanceId,
                                  engineId: inst.engineId,
                                  apiKey: savedKey || '<YOUR_GENERATED_API_KEY>',
                                });
                              },
                            },
                            ...(!inst.isShared
                              ? [
                                  {
                                    label: 'Share Engine',
                                    onClick: () => {
                                      setSelectedInstanceForShare({
                                        id: inst.instanceId,
                                        name: inst.name || inst.engineId,
                                      });
                                      setShareModalOpen(true);
                                    },
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ServerPagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        </div>
      )}

      {/* Share Engine Modal */}
      {selectedInstanceForShare && (
        <ShareEngineModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          instanceId={selectedInstanceForShare.id}
          instanceName={selectedInstanceForShare.name}
        />
      )}

      {/* Register Engine Modal */}
      <RegisterEngineModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        regAccountId={regAccountId}
        setRegAccountId={setRegAccountId}
        regLicenseId={regLicenseId}
        setRegLicenseId={setRegLicenseId}
        regEngineId={regEngineId}
        setRegEngineId={setRegEngineId}
        regName={regName}
        setRegName={setRegName}
        registering={registering}
        onSubmit={handleRegisterSubmit}
      />

      {/* Newly Created / Re-Opened Credentials */}
      <CreatedCredentialsDialog
        credentials={createdCredentials}
        onClose={() => setCreatedCredentials(null)}
        userName={user?.userName}
      />

      {/* Local Engine Runner Guide Modal */}
      <RunnerGuideModal
        isOpen={runnerGuideOpen}
        onClose={() => setRunnerGuideOpen(false)}
      />
    </div>
  );
}
