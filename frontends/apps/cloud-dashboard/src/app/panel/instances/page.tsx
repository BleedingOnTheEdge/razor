'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiBaseUrl, getAuthHeaders } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/auth-context';
import { ServerPagination } from '@/components/ui/ServerPagination';
import { ShareEngineModal } from '@/components/instances/ShareEngineModal';
import { ActionDropdown } from '@/components/ui/ActionDropdown';
import { formatTimestamp, formatHash } from '@razor/ui-kit';

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
    <div className="space-y-6 max-w-7xl font-mono text-xs">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-black">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-tight text-black">
            Engine Fleet & Node Management
          </h1>
          <p className="text-black font-normal mt-1">
            Registered execution instances, WebSocket cluster telemetry, and temporary sharing delegations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/panel/live"
            className="px-3 py-2 border border-black bg-white hover:bg-black hover:text-white font-bold transition-colors"
          >
            [OPEN LIVE MANAGER]
          </Link>
          <button
            type="button"
            onClick={loadInstances}
            className="px-3 py-2 border border-black bg-black text-white hover:bg-white hover:text-black font-bold transition-colors"
          >
            [REFRESH]
          </button>
        </div>
      </div>

      {/* Fleet Telemetry Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 border border-black bg-white">
        <div>
          <span className="text-black font-bold block">Online Active Nodes</span>
          <span className="text-2xl font-bold text-green-600 mt-1 block">
            {onlineCount} / {instances.length}
          </span>
        </div>
        <div>
          <span className="text-black font-bold block">Total Registered Engines</span>
          <span className="text-2xl font-bold text-black mt-1 block">
            {totalCount || instances.length}
          </span>
        </div>
        <div>
          <span className="text-black font-bold block">Account License Quota</span>
          <span className="text-2xl font-bold text-black mt-1 block">
            {user?.maxInstances || 10} Cap
          </span>
        </div>
        <div>
          <span className="text-black font-bold block">Engine Sharing Grants</span>
          <span className="text-2xl font-bold text-black mt-1 block">
            {instances.filter((i) => i.isShared).length} Shared
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border border-black bg-white">
        <div>
          <label className="block font-bold text-black mb-1">Search Engine</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, ID or engine slug..."
            className="w-full px-3 py-1.5 border border-black bg-white text-black font-mono focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-bold text-black mb-1">Connectivity Filter</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 border border-black bg-white text-black font-mono font-bold focus:outline-none"
          >
            <option value="ALL">All Engines</option>
            <option value="ONLINE">Online Only</option>
            <option value="OFFLINE">Offline Only</option>
            <option value="SHARED">Shared With Me</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
            }}
            className="w-full px-3 py-1.5 border border-black bg-white hover:bg-zinc-100 text-black font-bold transition-colors"
          >
            [RESET FILTERS]
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-black font-bold border border-black">
          [CONNECTING TO CLOUD FLEET REGISTRY...]
        </div>
      ) : error ? (
        <div className="p-4 border border-black text-red-600 font-bold">
          [ERROR]: {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center border border-black p-8">
          <p className="font-bold text-black uppercase">[NO ENGINES FOUND]</p>
          <p className="mt-2 text-black font-normal">Connect an Engine runner using the command line daemon or check your filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-black overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-black bg-white">
                  <th className="p-3 font-bold text-black">Engine Instance</th>
                  <th className="p-3 font-bold text-black">Status</th>
                  <th className="p-3 font-bold text-black hidden sm:table-cell">Slug / EngineId</th>
                  <th className="p-3 font-bold text-black hidden md:table-cell">Extensions</th>
                  <th className="p-3 font-bold text-black hidden lg:table-cell">Created</th>
                  <th className="p-3 font-bold text-black hidden sm:table-cell">Ownership</th>
                  <th className="p-3 font-bold text-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inst) => (
                  <tr key={inst.instanceId} className="border-b border-black hover:bg-zinc-50">
                    <td className="p-3">
                      <Link
                        href={`/panel/instances/${inst.instanceId}`}
                        className="font-bold text-black hover:underline block"
                      >
                        {inst.name || 'Unnamed Engine'}
                      </Link>
                      <span className="text-[10px] text-black">
                        ID: {formatHash(inst.instanceId, 8)}
                      </span>
                    </td>
                    <td className="p-3">
                      {inst.isConnected ? (
                        <span className="font-bold text-green-600">[ONLINE]</span>
                      ) : (
                        <span className="font-bold text-black">[OFFLINE]</span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-black hidden sm:table-cell">{inst.engineId}</td>
                    <td className="p-3 font-bold text-black hidden md:table-cell">
                      {inst.manifestExtensionCount} active
                    </td>
                    <td className="p-3 text-black hidden lg:table-cell">
                      {formatTimestamp(inst.createdAt)}
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      {inst.isShared ? (
                        <span className="font-bold text-black" title={`Expires: ${inst.shareExpiresAt}`}>
                          [SHARED]
                        </span>
                      ) : (
                        <span className="font-bold text-black">[OWNER]</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/panel/instances/${inst.instanceId}`}
                          className="px-2.5 py-1 border border-black bg-black text-white hover:bg-white hover:text-black font-bold transition-colors text-xs"
                        >
                          [INSPECT]
                        </Link>
                        <ActionDropdown
                          label="⋮"
                          items={[
                            {
                              label: '[LIVE MANAGER]',
                              href: `/panel/instances/${inst.instanceId}/live`,
                            },
                            ...(!inst.isShared
                              ? [
                                  {
                                    label: '[SHARE ENGINE]',
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
    </div>
  );
}
