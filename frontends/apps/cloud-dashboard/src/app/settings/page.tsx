'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  Moon,
  Sun,
  Bell,
  Volume2,
  ShieldAlert,
  Save,
  RotateCcw,
  Sliders,
  Check,
  ArrowLeft,
  KeyRound,
  Radio,
} from 'lucide-react';
import { Card, Button, Badge, ThemeToggle } from '@razor/ui-kit';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/components/ui/toast';

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const { success } = useToast();

  const [streamAudioAlerts, setStreamAudioAlerts] = useState(true);
  const [autoScrollLogs, setAutoScrollLogs] = useState(true);
  const [heartbeatCadence, setHeartbeatCadence] = useState('5');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedAudio = localStorage.getItem('razor_setting_audio');
    if (storedAudio !== null) setStreamAudioAlerts(storedAudio === 'true');
    const storedScroll = localStorage.getItem('razor_setting_autoscroll');
    if (storedScroll !== null) setAutoScrollLogs(storedScroll === 'true');
    const storedCadence = localStorage.getItem('razor_setting_cadence');
    if (storedCadence) setHeartbeatCadence(storedCadence);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('razor_setting_audio', String(streamAudioAlerts));
    localStorage.setItem('razor_setting_autoscroll', String(autoScrollLogs));
    localStorage.setItem('razor_setting_cadence', heartbeatCadence);

    setSaved(true);
    success('Preferences Saved', 'Your dashboard and stream preferences have been saved.');
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setStreamAudioAlerts(true);
    setAutoScrollLogs(true);
    setHeartbeatCadence('5');
    localStorage.removeItem('razor_setting_audio');
    localStorage.removeItem('razor_setting_autoscroll');
    localStorage.removeItem('razor_setting_cadence');
    success('Defaults Restored', 'Settings reset to factory defaults.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview</span>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard Settings</h1>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Customize appearance, live telemetry stream parameters, and local alert behaviors.
            </p>
          </div>
          {user?.canAdministerCluster && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono transition-colors"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Cluster Governance</span>
            </Link>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Appearance & Color Scheme */}
        <Card className="p-6 border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-800">
            <Sun className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Interface Theme & Aesthetics</h2>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-xs font-medium text-zinc-200">Apple Design Theme Mode</p>
              <p className="text-[11px] text-zinc-500 font-mono">
                Toggle between dark mode (deep zinc) and light mode (frosted bright).
              </p>
            </div>
            <ThemeToggle />
          </div>
        </Card>

        {/* Real-time Telemetry & Stream */}
        <Card className="p-6 border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-800">
            <Radio className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Live Stream & Telemetry</h2>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-200">Desired Heartbeat Polling Cadence</p>
                <p className="text-[11px] text-zinc-500">
                  Target interval (seconds) requested from connected engine instances.
                </p>
              </div>
              <select
                value={heartbeatCadence}
                onChange={(e) => setHeartbeatCadence(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="1">1 second (Ultra-low latency)</option>
                <option value="5">5 seconds (Recommended)</option>
                <option value="10">10 seconds (Standard)</option>
                <option value="30">30 seconds (Power saver)</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-zinc-200">Automatic Log Stream Auto-Scroll</p>
                <p className="text-[11px] text-zinc-500">
                  Automatically scrolls to bottom on incoming live events.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoScrollLogs}
                onChange={(e) => setAutoScrollLogs(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
            </div>
          </div>
        </Card>

        {/* Audio Alerts & Notifications */}
        <Card className="p-6 border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-800">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Auditory & System Alerts</h2>
          </div>

          <div className="flex items-center justify-between py-2 text-xs font-mono">
            <div>
              <p className="text-zinc-200">Acoustic Risk Chimes</p>
              <p className="text-[11px] text-zinc-500">
                Play subtle tactile audio cues on execution gaps or disconnect warnings.
              </p>
            </div>
            <input
              type="checkbox"
              checked={streamAudioAlerts}
              onChange={(e) => setStreamAudioAlerts(e.target.checked)}
              className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
          </div>
        </Card>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleReset}
            className="gap-2 font-mono text-zinc-400 hover:text-white"
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
            {saved ? <Check className="w-3.5 h-3.5 text-zinc-950" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Preferences</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
