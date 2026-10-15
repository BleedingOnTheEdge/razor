'use client';

import React from 'react';
import Link from 'next/link';
import { useSseStream } from '@/hooks/use-sse-stream';
import { useAuth } from '@/context/auth-context';
import { User, LogOut, LogIn, Zap, Shield } from 'lucide-react';
import { ThemeToggle } from '@razor/ui-kit';
import clsx from 'clsx';

export function Header() {
  const { isConnected } = useSseStream();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="h-16 border-b border-zinc-800 px-8 flex items-center justify-between bg-zinc-900/30" role="banner">
      <div className="flex items-center gap-4">
        <h1 className="text-base font-semibold text-zinc-200">
          Razor Operator Dashboard
        </h1>
      </div>

      <div className="flex items-center gap-3 text-xs font-mono">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Identity or Sign In Prompt */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 text-zinc-300 transition-colors"
              title="View Profile"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>{user.userName}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold uppercase">
                {user.role}
              </span>
            </Link>

            {/* Subscription Tier */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-300">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{user.subscriptionTier} Plan</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400">
                {user.maxInstances} inst cap
              </span>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-full bg-zinc-800/60 hover:bg-rose-500/10 hover:border-rose-500/30 border border-zinc-700/60 text-zinc-400 hover:text-rose-400 transition-all flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <a
            href="/login"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs transition-all shadow-md shadow-cyan-500/10"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </a>
        )}

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
