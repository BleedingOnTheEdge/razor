'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Users,
  Sliders,
  Search,
  Check,
  X,
  RotateCcw,
  Save,
  Trash2,
  Lock,
  Key,
  CreditCard,
  UserCheck,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/components/ui/toast';
import { getApiClient } from '@/lib/api-client';
import type { UserProfilePayload, ClusterSettingsPayload } from '@razor/api-client';
import { ClusterSettingsForm } from './ClusterSettingsForm';

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, startImpersonation } = useAuth();
  const { success, error: toastError, info } = useToast();

  const [activeTab, setActiveTab] = useState<'users' | 'settings'>('users');

  // Users tab state
  const [users, setUsers] = useState<UserProfilePayload[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userFilterRole, setUserFilterRole] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  // Modals state
  const [subscriptionModalUser, setSubscriptionModalUser] = useState<UserProfilePayload | null>(null);
  const [selectedTier, setSelectedTier] = useState<'Free' | 'Pro' | 'Enterprise'>('Free');
  const [savingSubscription, setSavingSubscription] = useState(false);

  const [passwordModalUser, setPasswordModalUser] = useState<UserProfilePayload | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Settings tab state
  const [settings, setSettings] = useState<ClusterSettingsPayload | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'Admin';
  const isOperator = user?.role === 'Operator';

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
        success('Role Updated', `User role updated to ${newRole}.`);
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
    if (!confirm(`Are you sure you want to permanently delete user @${userName}? This cannot be undone.`)) return;
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

  const handleImpersonate = async (targetUser: UserProfilePayload) => {
    setActionUserId(targetUser.userId);
    try {
      const client = getApiClient();
      const res = await client.POST('/api/admin/impersonate/{userId}', {
        params: { path: { userId: targetUser.userId } },
      });

      if (res.data) {
        startImpersonation(res.data);
        const mode = isOperator ? 'Operator Restricted (Read/Fleet/Runs)' : 'Administrator Full Access';
        info('Impersonation Session Active', `Now impersonating @${targetUser.userName} with ${mode}.`);
        router.push('/panel');
      } else {
        toastError('Impersonation Failed', 'Control plane rejected impersonation request.');
      }
    } catch (e: unknown) {
      toastError('Impersonation Error', (e as Error)?.message || 'Failed to initiate impersonation session.');
    } finally {
      setActionUserId(null);
    }
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriptionModalUser) return;
    setSavingSubscription(true);
    try {
      const client = getApiClient();
      const res = await client.PUT('/api/admin/users/{userId}/subscription', {
        params: { path: { userId: subscriptionModalUser.userId } },
        body: { userId: subscriptionModalUser.userId, tier: selectedTier },
      });
      if (res.data) {
        success('Subscription Updated', `@${subscriptionModalUser.userName} tier changed to ${selectedTier}.`);
        setSubscriptionModalUser(null);
        loadUsers();
      }
    } catch {
      toastError('Update Failed', 'Failed to update subscription tier.');
    } finally {
      setSavingSubscription(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPassword.trim()) return;
    setSavingPassword(true);
    try {
      const client = getApiClient();
      const res = await client.POST('/api/admin/users/{userId}/reset-password', {
        params: { path: { userId: passwordModalUser.userId } },
        body: { userId: passwordModalUser.userId, newPassword: newPassword.trim() },
      });
      if (res.data) {
        success('Password Reset', `Password reset successfully for @${passwordModalUser.userName}.`);
        setPasswordModalUser(null);
        setNewPassword('');
      }
    } catch {
      toastError('Reset Failed', 'Failed to reset user password.');
    } finally {
      setSavingPassword(false);
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
        success('Settings Saved', 'Cluster policies and platform integrations updated.');
      }
    } catch {
      toastError('Save Failed', 'Failed to save cluster settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleResetSettings = async () => {
    if (!confirm('Reset all cluster platform settings to factory defaults?')) return;
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
      <div className="max-w-md mx-auto py-16 text-center space-y-4 border border-[#262626] p-8 bg-[#171717] rounded-2xl">
        <div className="w-12 h-12 bg-[#171717] border border-[#262626] text-zinc-100 flex items-center justify-center mx-auto rounded-full">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-100">Authentication Required</h1>
        <p className="text-xs text-zinc-100 font-mono">Sign in with administrative credentials to access governance.</p>
        <Link
          href="/auth/login"
          className="inline-block px-5 py-2 bg-black text-white font-mono text-xs font-bold uppercase hover:bg-zinc-800 transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-100 uppercase tracking-wider mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-zinc-100" />
            <span>ROOT GOVERNANCE & ACCESS CONTROL</span>
          </div>
          <h1 className="text-2xl font-mono font-bold tracking-tight text-zinc-100 uppercase">
            Cluster Administration
          </h1>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center border border-[#262626] bg-[#171717] font-mono text-xs rounded-xl overflow-hidden">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 uppercase font-bold transition-all ${
              activeTab === 'users' ? 'bg-black text-white' : 'text-zinc-100 hover:bg-[#1f1f1f]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Governance</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 uppercase font-bold border-l border-[#262626] transition-all ${
              activeTab === 'settings' ? 'bg-black text-white' : 'text-zinc-100 hover:bg-[#1f1f1f]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Platform Settings</span>
          </button>
        </div>
      </div>

      {/* Institutional Alert Protocol */}
      <div className="p-4 border border-[#262626] bg-[#171717] flex items-start gap-3 text-xs text-zinc-100 font-mono rounded-xl">
        <Info className="w-4 h-4 text-zinc-100 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold uppercase">Governance Protocol:</span> SuperAdmin accounts have unrestricted authority to manage subscriptions, reset credentials, impersonate users with full execution privileges, or suspend accounts. Operators have restricted impersonation (manage engines & flows, live trading restricted).
        </div>
      </div>

      {activeTab === 'users' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-zinc-100 absolute left-3 top-2.5" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                placeholder="SEARCH USERNAME, EMAIL..."
                className="w-full pl-9 pr-3 py-2 bg-[#171717] border border-[#262626] text-xs font-mono text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md"
              />
            </div>
            <select
              value={userFilterRole}
              onChange={(e) => setUserFilterRole(e.target.value)}
              className="px-3 py-2 bg-[#171717] border border-[#262626] text-xs font-mono font-bold uppercase text-zinc-100 focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md"
            >
              <option value="">All Roles</option>
              <option value="SuperAdmin">SuperAdmin</option>
              <option value="Admin">Admin</option>
              <option value="Operator">Operator</option>
              <option value="Trader">Trader</option>
            </select>
            <button
              onClick={loadUsers}
              className="px-5 py-2 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium font-mono text-xs font-bold uppercase transition-colors"
            >
              Apply Filter
            </button>
          </div>

          {/* User Table */}
          <div className="border border-[#262626] bg-[#171717] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="bg-[#1f1f1f] text-zinc-200 border-b border-[#262626]">
                  <tr>
                    <th className="px-4 py-3 font-bold uppercase text-[11px] border-r border-[#262626]">User Account</th>
                    <th className="px-4 py-3 font-bold uppercase text-[11px] border-r border-[#262626]">Role</th>
                    <th className="px-4 py-3 font-bold uppercase text-[11px] border-r border-[#262626]">Subscription Tier</th>
                    <th className="px-4 py-3 font-bold uppercase text-[11px] border-r border-[#262626]">Status</th>
                    <th className="px-4 py-3 font-bold uppercase text-[11px] text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-100 font-mono">
                        Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-100 font-mono">
                        No users found matching query.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.userId} className="hover:bg-[#141414] transition-colors">
                        <td className="px-4 py-3 border-r border-[#262626]">
                          <div className="font-bold text-zinc-100 uppercase">@{u.userName}</div>
                          <div className="text-[11px] text-zinc-100">{u.displayName || u.email || '—'}</div>
                        </td>
                        <td className="px-4 py-3 border-r border-[#262626]">
                          <select
                            value={u.role === 'Developer' ? 'Trader' : u.role}
                            disabled={actionUserId === u.userId}
                            onChange={(e) => handleRoleChange(u.userId, e.target.value)}
                            className="px-2 py-1 bg-[#171717] border border-[#262626] text-[11px] font-mono font-bold uppercase text-zinc-100 focus:outline-none focus:border-[#3ECF8E] rounded-md"
                          >
                            <option value="SuperAdmin">SuperAdmin</option>
                            <option value="Admin">Admin</option>
                            <option value="Operator">Operator</option>
                            <option value="Trader">Trader</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 border-r border-[#262626]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold uppercase text-zinc-100">
                              {u.subscriptionTier}
                            </span>
                            <span className="text-[10px] text-zinc-100">({u.maxInstances} inst)</span>
                            <button
                              onClick={() => {
                                setSubscriptionModalUser(u);
                                setSelectedTier(u.subscriptionTier);
                              }}
                              className="px-2 py-0.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] text-[10px] font-bold uppercase transition-colors"
                              title="Modify Subscription"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r border-[#262626]">
                          <button
                            onClick={() => handleStatusToggle(u.userId, u.isActive ?? true)}
                            disabled={actionUserId === u.userId}
                            className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase border border-[#262626] rounded-full transition-colors ${
                              u.isActive !== false
                                ? 'bg-[#171717] text-zinc-100 rounded-xl hover:bg-[#1f1f1f]'
                                : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                          >
                            {u.isActive !== false ? 'ACTIVE' : 'SUSPENDED'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Impersonate Button */}
                            <button
                              onClick={() => handleImpersonate(u)}
                              disabled={actionUserId === u.userId || u.userId === user.userId}
                              className="flex items-center gap-1 px-2.5 py-1 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] text-[11px] font-bold uppercase transition-colors disabled:opacity-30"
                              title={isAdmin ? 'Full Administrator Impersonation' : 'Operator Restricted Impersonation'}
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Impersonate</span>
                            </button>

                            {/* Reset Password Button */}
                            <button
                              onClick={() => {
                                setPasswordModalUser(u);
                                setNewPassword('');
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] text-[11px] font-bold uppercase transition-colors"
                              title="Reset Password"
                            >
                              <Key className="w-3 h-3" />
                              <span>Password</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteUser(u.userId, u.userName)}
                              disabled={actionUserId === u.userId || u.userName === 'superadmin' || u.userId === user.userId}
                              title="Delete User"
                              className="p-1.5 border border-[#262626] bg-[#171717] hover:bg-rose-950/40 hover:border-rose-500/50 hover:text-rose-400 text-zinc-100 rounded-lg transition-colors disabled:opacity-30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
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

      {/* Subscription Tier Management Modal */}
      {subscriptionModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md border border-[#262626] bg-[#171717] rounded-2xl shadow-2xl p-6 space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-[#262626] pb-2">
              <h3 className="text-sm font-bold uppercase text-zinc-100 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-zinc-100" />
                <span>Manage Subscription: @{subscriptionModalUser.userName}</span>
              </h3>
              <button
                onClick={() => setSubscriptionModalUser(null)}
                className="text-zinc-100 hover:bg-[#1f1f1f] p-1 border border-[#262626] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubscription} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-zinc-100 block mb-2">
                  Assign Subscription Tier
                </label>
                <div className="space-y-2 text-xs">
                  {(['Free', 'Pro', 'Enterprise'] as const).map((tier) => (
                    <label
                      key={tier}
                      className={`flex items-center justify-between p-3 border border-[#262626] rounded-lg cursor-pointer transition-colors ${
                        selectedTier === tier ? 'bg-black text-white font-bold' : 'bg-[#171717] text-zinc-100 rounded-xl hover:bg-[#141414]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="tier"
                          value={tier}
                          checked={selectedTier === tier}
                          onChange={() => setSelectedTier(tier)}
                          className="w-4 h-4 rounded accent-[#3ECF8E]"
                        />
                        <span className="uppercase">{tier} Tier</span>
                      </div>
                      <span className="text-[11px]">
                        {tier === 'Free' ? '1 Node • Free' : tier === 'Pro' ? '5 Nodes • $49/mo' : '50 Nodes • $299/mo'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setSubscriptionModalUser(null)}
                  className="px-4 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-mono text-xs font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSubscription}
                  className="px-5 py-2 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium font-mono text-xs font-bold uppercase disabled:opacity-50"
                >
                  {savingSubscription ? 'Saving...' : 'Update Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md border border-[#262626] bg-[#171717] rounded-2xl shadow-2xl p-6 space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-[#262626] pb-2">
              <h3 className="text-sm font-bold uppercase text-zinc-100 flex items-center gap-2">
                <Key className="w-4 h-4 text-zinc-100" />
                <span>Reset Password: @{passwordModalUser.userName}</span>
              </h3>
              <button
                onClick={() => setPasswordModalUser(null)}
                className="text-zinc-100 hover:bg-[#1f1f1f] p-1 border border-[#262626] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-zinc-100 block mb-1">
                  New Account Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter secure new password..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-xs font-mono text-zinc-100 focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 rounded-md"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-mono text-xs font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-5 py-2 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium font-mono text-xs font-bold uppercase disabled:opacity-50"
                >
                  {savingPassword ? 'Resetting...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
