'use client';

import { useState, useEffect } from 'react';
import { useSseStream } from '@/hooks/use-sse-stream';
import { getApiClient } from '@/lib/api-client';
import type { UserProfilePayload } from '@razor/api-client';
import { User, Shield, Zap } from 'lucide-react';
import clsx from 'clsx';

export function Header() {
  const { isConnected } = useSseStream();
  const [profile, setProfile] = useState<UserProfilePayload | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const client = getApiClient();
        const res = await client.GET('/api/users/me');
        if (res.data) {
          setProfile(res.data);
        }
      } catch {
        // Fallback to static display
      }
    }
    void loadUser();
  }, []);

  return (
    <header className="h-16 border-b border-zinc-800 px-8 flex items-center justify-between bg-zinc-900/30" role="banner">
      <div className="flex items-center gap-4">
        <h1 className="text-base font-semibold text-zinc-200">
          Razor Operator Dashboard
        </h1>
      </div>

      <div className="flex items-center gap-3 text-xs font-mono">
        {/* User Identity & Role Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-300">
          <User className="w-3.5 h-3.5 text-cyan-400" />
          <span>{profile?.userName ?? 'dev-operator'}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold uppercase">
            {profile?.role ?? 'Operator'}
          </span>
        </div>

        {/* Subscription Tier Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-300">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>{profile?.subscriptionTier ?? 'Free'} Plan</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400">
            {profile?.maxInstances ?? 1} inst cap
          </span>
        </div>

        {/* SSE status pill */}
        <div
          className={clsx(
            'flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs',
            isConnected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          )}
          aria-live="polite"
        >
          <span
            className={clsx(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            )}
          />
          <span>{isConnected ? 'SSE LIVE STREAM' : 'SSE RECONNECTING'}</span>
        </div>

        <div className="hidden lg:block px-3 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-300">
          Cluster: <span className="text-cyan-400">Localhost:5000</span>
        </div>
      </div>
    </header>
  );
}
