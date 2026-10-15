'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  Sun,
  ShieldAlert,
  Save,
  RotateCcw,
  Check,
  ArrowLeft,
  Radio,
  Volume2,
  Lock,
  Unlock,
  Shield,
  Server,
  Zap,
  Activity,
  Sliders,
  User,
} from 'lucide-react';
import { Card, Button, Badge } from '@razor/ui-kit';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/components/ui/toast';

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const { success, error } = useToast();

  // Role permissions
  const isAdmin = user?.canAdministerCluster || user?.role === 'SuperAdmin' || user?.role === 'Admin';
  const isOperator = user?.canManageFleet || user?.role === 'Operator';
  const isAuthorized = isAdmin || isOperator;

  // Operational Settings (accessible to Operators & Admins)
  const [streamAudioAlerts, setStreamAudioAlerts] = useState(true);
  const [autoScrollLogs, setAutoScrollLogs] = useState(true);
  const [heartbeatCadence, setHeartbeatCadence] = useState('5');
  const [autoDrainTimeout, setAutoDrainTimeout] = useState('60');

  // Cluster Admin Settings (unlocked for Admins only, locked/read-only for Operators)
  const [platformFeePercent, setPlatformFeePercent] = useState('2.5');
  const [overcommitMultiplier, setOvercommitMultiplier] = useState('1.5');
  const [enforceOperatorMfa, setEnforceOperatorMfa] = useState(true);
  const [snapshotWindowHours, setSnapshotWindowHours] = useState('24');

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedAudio = localStorage.getItem('razor_setting_audio');
    if (storedAudio !== null) setStreamAudioAlerts(storedAudio === 'true');

    const storedScroll = localStorage.getItem('razor_setting_autoscroll');
    if (storedScroll !== null) setAutoScrollLogs(storedScroll === 'true');

    const storedCadence = localStorage.getItem('razor_setting_cadence');
    if (storedCadence) setHeartbeatCadence(storedCadence);

    const storedDrain = localStorage.getItem('razor_setting_drain');
    if (storedDrain) setAutoDrainTimeout(storedDrain);

    const storedFee = localStorage.getItem('razor_setting_fee');
    if (storedFee) setPlatformFeePercent(storedFee);

    const storedOvercommit = localStorage.getItem('razor_setting_overcommit');
    if (storedOvercommit) setOvercommitMultiplier(storedOvercommit);

    const storedMfa = localStorage.getItem('razor_setting_mfa');
    if (storedMfa !== null) setEnforceOperatorMfa(storedMfa === 'true');

    const storedSnapshot = localStorage.getItem('razor_setting_snapshot');
    if (storedSnapshot) setSnapshotWindowHours(storedSnapshot);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      error('Access Denied', 'You do not have permission to modify settings.');
      return;
    }

    // Save operational settings
    localStorage.setItem('razor_setting_audio', String(streamAudioAlerts));
    localStorage.setItem('razor_setting_autoscroll', String(autoScrollLogs));
    localStorage.setItem('razor_setting_cadence', heartbeatCadence);
    localStorage.setItem('razor_setting_drain', autoDrainTimeout);

    // Save admin settings if admin
    if (isAdmin) {
      localStorage.setItem('razor_setting_fee', platformFeePercent);
      localStorage.setItem('razor_setting_overcommit', overcommitMultiplier);
      localStorage.setItem('razor_setting_mfa', String(enforceOperatorMfa));
      localStorage.setItem('razor_setting_snapshot', snapshotWindowHours);
    }

    setSaved(true);
    success('Settings Updated', isAdmin ? 'Operational and cluster governance settings saved.' : 'Operational fleet preferences saved.');
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setStreamAudioAlerts(true);
    setAutoScrollLogs(true);
    setHeartbeatCadence('5');
    setAutoDrainTimeout('60');

    localStorage.removeItem('razor_setting_audio');
    localStorage.removeItem('razor_setting_autoscroll');
    localStorage.removeItem('razor_setting_cadence');
    localStorage.removeItem('razor_setting_drain');

    if (isAdmin) {
      setPlatformFeePercent('2.5');
      setOvercommitMultiplier('1.5');
      setEnforceOperatorMfa(true);
      setSnapshotWindowHours('24');
      localStorage.removeItem('razor_setting_fee');
      localStorage.removeItem('razor_setting_overcommit');
      localStorage.removeItem('razor_setting_mfa');
      localStorage.removeItem('razor_setting_snapshot');
    }

    success('Defaults Restored', 'Preferences have been reset to factory defaults.');
  };

  // If user is unauthenticated or has unauthorized role (Trader/Developer)
  if (!isAuthenticated || !isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="p-8 border-amber-500/30 bg-amber-500/5 backdrop-blur-md text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/10">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
              Restricted Access • Administrator & Operator Only
            </h1>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              Operational fleet configurations, telemetry polling rates, and cluster infrastructure policies are reserved for Operators and Cluster Administrators.
            </p>
          </div>

          {user && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono text-zinc-600 dark:text-zinc-300">
              <span>Your Assigned Role:</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400 uppercase">{user.role}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/profile">
              <Button variant="primary" size="md" className="w-full sm:w-auto gap-2">
                <User className="w-4 h-4" />
                <span>Manage Personal Profile</span>
              </Button>
            </Link>
            <Link href="/">
              <Button variant="secondary" size="md" className="w-full sm:w-auto gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Overview</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Dashboard & Cluster Settings
              </h1>
              <Badge variant={isAdmin ? 'success' : 'info'} dot>
                {isAdmin ? 'SuperAdmin Full Control' : 'Operator Fleet View'}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1">
              {isAdmin
                ? 'Full cluster governance, operational telemetry parameters, and platform security policies.'
                : 'Operational telemetry parameters, local alert behaviors, and fleet failover thresholds.'}
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs font-mono transition-colors shrink-0"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Open Cluster Governance</span>
            </Link>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Appearance & Color Scheme (All Authorized) */}
        <Card className="p-6 border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/40 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-200 dark:border-zinc-800">
            <Sun className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Interface Theme & Aesthetics</h2>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-xs font-medium text-zinc-900">Apple Design Theme</p>
              <p className="text-[11px] text-zinc-500 font-mono">
                Pure Apple Light Mode is permanently active across all applications.
              </p>
            </div>
            <Badge variant="outline">Apple Light Mode</Badge>
          </div>
        </Card>

        {/* Section 2: Fleet Operational Telemetry (Editable by Operator & Admin) */}
        <Card className="p-6 border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/40 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <Radio className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Live Stream & Telemetry</h2>
            </div>
            <Badge variant="success">Operational Control</Badge>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-zinc-900 dark:text-zinc-200 font-medium">Desired Heartbeat Polling Cadence</p>
                <p className="text-[11px] text-zinc-500">
                  Target interval (seconds) requested from connected engine instances.
                </p>
              </div>
              <select
                value={heartbeatCadence}
                onChange={(e) => setHeartbeatCadence(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="1">1 second (Ultra-low latency)</option>
                <option value="5">5 seconds (Recommended)</option>
                <option value="10">10 seconds (Standard)</option>
                <option value="30">30 seconds (Power saver)</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
              <div>
                <p className="text-zinc-900 dark:text-zinc-200 font-medium">Automatic Log Stream Auto-Scroll</p>
                <p className="text-[11px] text-zinc-500">
                  Automatically scrolls to bottom on incoming live events.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoScrollLogs}
                onChange={(e) => setAutoScrollLogs(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              >
              </input>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
              <div>
                <p className="text-zinc-900 dark:text-zinc-200 font-medium">Auto-Drain Stale Instances (Seconds)</p>
                <p className="text-[11px] text-zinc-500">
                  De-register or isolate engines exceeding heartbeat absence window.
                </p>
              </div>
              <select
                value={autoDrainTimeout}
                onChange={(e) => setAutoDrainTimeout(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="30">30s (Aggressive failover)</option>
                <option value="60">60s (Default cluster policy)</option>
                <option value="120">120s (Tolerant network)</option>
                <option value="300">300s (Extended grace)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Section 3: Audio Alerts & Tactile Feedback */}
        <Card className="p-6 border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/40 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-200 dark:border-zinc-800">
            <Volume2 className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Auditory & System Alerts</h2>
          </div>

          <div className="flex items-center justify-between py-2 text-xs font-mono">
            <div>
              <p className="text-zinc-900 dark:text-zinc-200 font-medium">Acoustic Risk Chimes</p>
              <p className="text-[11px] text-zinc-500">
                Play subtle tactile audio cues on execution gaps or disconnect warnings.
              </p>
            </div>
            <input
              type="checkbox"
              checked={streamAudioAlerts}
              onChange={(e) => setStreamAudioAlerts(e.target.checked)}
              className="w-4 h-4 rounded bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            >
            </input>
          </div>
        </Card>

        {/* Section 4: Cluster Governance & Policies (UNLOCKED for Admin, LOCKED for Operator) */}
        <Card className={`p-6 border-zinc-200 dark:border-zinc-800 transition-all ${
          isAdmin
            ? 'bg-white/80 dark:bg-zinc-900/40'
            : 'bg-zinc-50/60 dark:bg-zinc-900/20 opacity-80 border-dashed'
        } space-y-4`}>
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <Shield className={`w-4 h-4 ${isAdmin ? 'text-rose-500' : 'text-zinc-400'}`} />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Cluster Infrastructure & Governance</h2>
            </div>
            {isAdmin ? (
              <Badge variant="danger" dot>Admin Unlocked</Badge>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700/60">
                <Lock className="w-3 h-3 text-zinc-500" />
                <span>Locked • Admin Role Required</span>
              </div>
            )}
          </div>

          {!isAdmin && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-mono flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" />
              <span>
                Operators may monitor these infrastructure limits. Cluster-wide modification requires SuperAdmin or Admin privileges.
              </span>
            </div>
          )}

          <div className="space-y-4 text-xs font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-zinc-900 dark:text-zinc-200 font-medium">Global Marketplace Commission Fee (%)</p>
                <p className="text-[11px] text-zinc-500">
                  Platform protocol fee assessed on additive sales and extensions.
                </p>
              </div>
              <input
                type="number"
                step="0.1"
                min="0"
                max="25"
                disabled={!isAdmin}
                value={platformFeePercent}
                onChange={(e) => setPlatformFeePercent(e.target.value)}
                className="w-24 px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-right"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
              <div>
                <p className="text-zinc-900 dark:text-zinc-200 font-medium">Cluster Overcommit Multiplier</p>
                <p className="text-[11px] text-zinc-500">
                  Fleet density headroom allowance across CPU and memory bounds.
                </p>
              </div>
              <select
                disabled={!isAdmin}
                value={overcommitMultiplier}
                onChange={(e) => setOvercommitMultiplier(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="1.0">1.0x (Zero overcommit, isolated)</option>
                <option value="1.5">1.5x (Recommended balanced)</option>
                <option value="2.0">2.0x (High density deployment)</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
              <div>
                <p className="text-zinc-900 dark:text-zinc-200 font-medium">Mandatory MFA for Operators</p>
                <p className="text-[11px] text-zinc-500">
                  Enforces hardware security keys or TOTP for all fleet dispatch operations.
                </p>
              </div>
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={enforceOperatorMfa}
                onChange={(e) => setEnforceOperatorMfa(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-cyan-500 focus:ring-0 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
              </input>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
              <div>
                <p className="text-zinc-900 dark:text-zinc-200 font-medium">Database Snapshot Window</p>
                <p className="text-[11px] text-zinc-500">
                  Automated PostgreSQL dump and lineage ledger pruning interval.
                </p>
              </div>
              <select
                disabled={!isAdmin}
                value={snapshotWindowHours}
                onChange={(e) => setSnapshotWindowHours(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="6">Every 6 Hours</option>
                <option value="12">Every 12 Hours</option>
                <option value="24">Daily (24 Hours)</option>
                <option value="168">Weekly (7 Days)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-4">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleReset}
            className="gap-2 font-mono"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="gap-2 font-mono shadow-md shadow-cyan-500/20"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isAdmin ? 'Save All Preferences' : 'Save Fleet Preferences'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
