'use client';

import React from 'react';
import Link from 'next/link';
import { useSseStream } from '@/hooks/use-sse-stream';
import { useAuth } from '@/context/auth-context';
import { User, LogOut, LogIn, Zap, Menu } from 'lucide-react';
import clsx from 'clsx';

export interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export function Header({ onToggleMobileMenu }: HeaderProps = {}) {
  const { isConnected } = useSseStream();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="h-16 border-b border-black px-4 md:px-8 flex items-center justify-between bg-white font-mono" role="banner">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          aria-label="Open Navigation Menu"
          className="md:hidden p-2 border border-black text-black hover:bg-black hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-black uppercase tracking-tight">
          Razor Operator Dashboard
        </h1>
      </div>

      <div className="flex items-center gap-3 text-xs font-mono">
        {/* User Identity or Sign In Prompt */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            <Link
              href="/panel/profile"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-black bg-white hover:bg-zinc-100 text-black font-bold transition-colors"
              title="View Profile"
            >
              <User className="w-3.5 h-3.5 text-black" />
              <span>{user.userName}</span>
              <span className="text-[10px] px-1 py-0.2 bg-black text-white font-bold uppercase">
                {user.role}
              </span>
            </Link>

            {/* Subscription Tier */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-black bg-white text-black font-bold">
              <span>{user.subscriptionTier} Plan</span>
              <span className="text-[10px] px-1 bg-zinc-200 text-black">
                {user.maxInstances} inst cap
              </span>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 border border-black bg-white hover:bg-black hover:text-white text-black font-bold transition-all flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <a
            href="/auth/login"
            className="flex items-center gap-1.5 px-3.5 py-1.5 border border-black bg-black text-white font-bold text-xs transition-all hover:bg-zinc-800"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </a>
        )}

        {/* SSE status pill */}
        <div
          className={clsx(
            'flex items-center gap-2 px-3 py-1.5 border border-black font-bold text-xs',
            isConnected
              ? 'bg-white text-green-600'
              : 'bg-white text-red-600'
          )}
          aria-live="polite"
        >
          <span
            className={clsx(
              'w-2 h-2',
              isConnected ? 'bg-green-600 animate-pulse' : 'bg-red-600'
            )}
          />
          <span>{isConnected ? 'SSE LIVE STREAM' : 'SSE RECONNECTING'}</span>
        </div>

        <div className="hidden lg:block px-3 py-1.5 border border-black bg-white text-black font-bold">
          Cluster: <span className="font-bold">Localhost:5000</span>
        </div>
      </div>
    </header>
  );
}
