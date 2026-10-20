'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { User, LogOut, LogIn, Menu } from 'lucide-react';

export interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export function Header({ onToggleMobileMenu }: HeaderProps = {}) {
  const { user, isAuthenticated, logout } = useAuth();

  // Display nickname if available, else username
  const displayName = user?.displayName || user?.userName || 'User';

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
        <Link href="/panel" className="text-base font-bold text-black uppercase tracking-tight hover:underline" aria-label="Razor Operator Dashboard">
          <span className="sr-only">Razor Operator Dashboard</span>
        </Link>
      </div>

      <div className="flex items-center gap-3 text-xs font-mono">
        <span className="sr-only">SSE LIVE STREAM</span>
        {/* Miniprofile */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            {/* Clickable username/nickname redirecting to profile */}
            <Link
              href="/panel/profile"
              className="flex items-center gap-2 px-3 py-1.5 border border-black bg-white hover:bg-black hover:text-white text-black font-bold transition-colors"
              title="Click to view and edit profile"
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="font-bold">{displayName}</span>
            </Link>

            {/* Subscription Name Badge */}
            <div className="hidden sm:flex items-center px-2.5 py-1.5 border border-black bg-zinc-50 text-black font-bold">
              <span>[{user.subscriptionTier?.toUpperCase() || 'FREE'} TIER]</span>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={logout}
              title="Sign Out"
              className="px-2.5 py-1.5 border border-black bg-white hover:bg-red-600 hover:text-white text-black font-bold transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <Link
            href="/auth/login"
            className="flex items-center gap-1.5 px-3.5 py-1.5 border border-black bg-black text-white font-bold text-xs transition-all hover:bg-zinc-800"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
}

