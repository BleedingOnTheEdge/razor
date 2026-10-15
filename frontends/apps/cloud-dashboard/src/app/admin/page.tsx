'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Users,
  Sliders,
  Search,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  Save,
  Trash2,
  Lock,
  ArrowLeft,
  ChevronRight,
  Info,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Card, Button, Badge, ModalSheet } from '@razor/ui-kit';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/components/ui/toast';
import { getApiClient } from '@/lib/api-client';
import type { UserProfilePayload, ClusterSettingsPayload } from '@razor/api-client';
import { ClusterSettingsForm } from './ClusterSettingsForm';

export default function AdminPage() {
  const { user, isAuthenticated } = useAuth();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'users' | 'settings'>('users');

  // Users tab state
  const [users, setUsers] = useState<UserProfilePayload[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userFilterRole, setUserFilterRole] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  // Settings tab state
  const [settings, setSettings] = useState<ClusterSettingsPayload | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else {
      loadSettings();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const client = getApiClient();
      const res = await client.GET('/api/admin/users', {
        params: {
          query: {
            Search: userSearch || undefined,
            Role: userFilterRole || undefined,
          },
        },
      });
      if (res.data) {
        setUsers(res.data);
      }
    } catch {
      toastError('Failed to load users', 'Error communicating with admin service.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const client = getApiClient();
      const res = await client.GET('/api/admin/settings');
      if (res.data) {
        setSettings(res.data);
      }
    } catch {
      toastError('Failed to load settings', 'Error communicating with settings service.');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionUserId(userId);
    try {
      const client = getApiClient();
      const res = await client.PUT('/api/admin/users/{userId}/role', {
        params: { path: { userId } },
        body: { userId, role: newRole as any },
      });
      if (res.data) {
        success('Role Updated', `User role elevated/changed to ${newRole}.`);
        loadUsers();
      }
    } catch {
      toastError('Role Update Failed', 'Failed to update user role.');
    } finally {
      setActionUserId(null);
    }
  };

  const handleStatusToggle = async (userId: string, currentActive: boolean) => {
    setActionUserId(userId);
    try {
      const client = getApiClient();
      const res = await client.PUT('/api/admin/users/{userId}/status', {
        params: { path: { userId } },
        body: { userId, isActive: !currentActive },
      });
      if (res.data) {
        success('Status Updated', `User account ${!currentActive ? 'activated' : 'suspended'}.`);
        loadUsers();
      }
    } catch {
      toastError('Status Update Failed', 'Failed to update account status.');
    } finally {
      setActionUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user @${userName}? This cannot be undone.`)) return;
    setActionUserId(userId);
    try {
      const client = getApiClient();
      const res = await client.DELETE('/api/admin/users/{userId}', {
        params: { path: { userId } },
      });
      if (res.response.ok) {
        success('User Deleted', `User @${userName} deleted successfully.`);
        loadUsers();
      } else {
        toastError('Delete Failed', 'Failed to delete user.');
      }
    } catch {
      toastError('Delete Failed', 'Error communicating with admin service.');
    } finally {
      setActionUserId(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSavingSettings(true);
    try {
      const client = getApiClient();
      const res = await client.PUT('/api/admin/settings', {
        body: settings,
      });
      if (res.data) {
        setSettings(res.data);
        success('Settings Saved', 'Cluster policies and configuration updated.');
      }
    } catch {
      toastError('Save Failed', 'Failed to save cluster settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleResetSettings = async () => {
    if (!confirm('Reset all cluster settings to factory defaults?')) return;
    setSavingSettings(true);
    try {
      const client = getApiClient();
      const res = await client.POST('/api/admin/settings/reset');
      if (res.data) {
        setSettings(res.data);
        success('Settings Reset', 'Cluster policies restored to factory defaults.');
      }
    } catch {
      toastError('Reset Failed', 'Failed to reset settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900">Authentication Required</h1>
        <p className="text-xs text-zinc-500 font-mono">Sign in with administrative credentials to access governance.</p>
        <Link href="/login" className="inline-block px-5 py-2.5 rounded-xl bg-cyan-600 text-white font-bold text-xs font-mono shadow-sm hover:bg-cyan-700 transition-colors">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-rose-600 uppercase tracking-wider mb-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Root Governance & RBAC</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Cluster Administration</h1>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1 p-1 bg-zinc-100 border border-zinc-200 rounded-xl font-mono text-xs">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'users' ? 'bg-white text-zinc-900 shadow-sm font-semibold' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Governance</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'settings' ? 'bg-white text-zinc-900 shadow-sm font-semibold' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Cluster Settings</span>
          </button>
        </div>
      </div>

      {/* Explanation Banner */}
      <div className="p-4 rounded-xl bg-cyan-50/60 border border-cyan-100 flex items-start gap-3 text-xs text-zinc-700 font-mono">
        <Info className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
        <div>
          <span className="text-zinc-900 font-semibold">Governance Protocol:</span> SuperAdmin accounts have full authority to alter cluster limits, elevate users to Operator, or suspend abusive accounts. Operators can manage instances and dispatch commands.
        </div>
      </div>

      {activeTab === 'users' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                placeholder="Search username, email, display name..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-mono text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-cyan-500 shadow-sm"
              />
            </div>
            <select
              value={userFilterRole}
              onChange={(e) => {
                setUserFilterRole(e.target.value);
              }}
              className="px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-mono text-zinc-700 focus:outline-none focus:border-cyan-500 shadow-sm"
            >
              <option value="">All Roles</option>
              <option value="SuperAdmin">SuperAdmin</option>
              <option value="Operator">Operator</option>
              <option value="Trader">Trader</option>
              <option value="Developer">Developer</option>
            </select>
            <Button variant="secondary" size="sm" onClick={loadUsers} className="font-mono text-xs">
              Apply Filter
            </Button>
          </div>

          {/* User Table */}
          <Card className="overflow-hidden border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Subscription</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                        Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                        No users found matching query.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.userId} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-zinc-900">@{u.userName}</div>
                          <div className="text-[11px] text-zinc-500">{u.displayName || u.email || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            disabled={actionUserId === u.userId}
                            onChange={(e) => handleRoleChange(u.userId, e.target.value)}
                            className="px-2 py-1 bg-zinc-50 border border-zinc-200 rounded text-[11px] font-mono text-zinc-800 focus:outline-none"
                          >
                            <option value="SuperAdmin">SuperAdmin</option>
                            <option value="Operator">Operator</option>
                            <option value="Trader">Trader</option>
                            <option value="Developer">Developer</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-zinc-700">
                          <span className="font-semibold text-amber-600">{u.subscriptionTier}</span>
                          <span className="text-[10px] text-zinc-400 ml-1.5">({u.maxInstances} inst)</span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleStatusToggle(u.userId, u.isActive ?? true)}
                            disabled={actionUserId === u.userId}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              u.isActive !== false
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {u.isActive !== false ? 'Active' : 'Suspended'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteUser(u.userId, u.userName)}
                            disabled={actionUserId === u.userId || u.userName === 'superadmin'}
                            title="Delete User"
                            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-rose-50 hover:text-rose-600 text-zinc-500 transition-colors disabled:opacity-30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : settings ? (
        <ClusterSettingsForm
          settings={settings}
          setSettings={setSettings}
          savingSettings={savingSettings}
          onSave={handleSaveSettings}
          onReset={handleResetSettings}
        />
      ) : null}
    </div>
  );
}
