'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { User, LogOut, LogIn, Menu, Shield } from 'lucide-react';
import { Button, Badge } from '@razor/ui-kit';

export interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export function Header({ onToggleMobileMenu }: HeaderProps = {}) {
  const { user, isAuthenticated, logout } = useAuth();

  // Display nickname if available, else username
  const displayName = user?.displayName || user?.userName || 'User';

  return (
    <header className="h-14 border-b border-[#262626] px-4 md:px-8 flex items-center justify-between bg-[#171717]/80 backdrop-blur-md font-sans" role="banner">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          aria-label="Open Navigation Menu"
          className="md:hidden p-1.5 rounded-lg border border-[#262626] text-zinc-300 hover:text-white hover:bg-[#222222] transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>
        <Link href="/panel" className="text-sm font-semibold text-zinc-100 tracking-tight hover:text-[#3ECF8E] transition-colors" aria-label="Razor Operator Dashboard">
          <span className="sr-only">Razor Operator Dashboard</span>
        </Link>
      </div>

      <div className="flex items-center gap-2.5 text-xs">
        <span className="sr-only">SSE LIVE STREAM</span>
        {/* Miniprofile */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            {/* Clickable username/nickname redirecting to profile */}
            <Link
              href="/panel/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#262626] bg-[#1a1a1a] hover:bg-[#222222] hover:border-[#383838] text-zinc-200 font-medium transition-colors"
              title="Click to view and edit profile"
            >
              <User className="w-3.5 h-3.5 text-[#3ECF8E] shrink-0" />
              <span className="font-mono text-xs font-medium">{displayName}</span>
            </Link>

            {/* Subscription Name Badge */}
            <div className="hidden sm:flex items-center">
              <Badge variant="emerald" className="font-mono text-[11px]">
                {user.subscriptionTier?.toUpperCase() || 'FREE'}
              </Badge>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={logout}
              title="Sign Out"
              className="px-2.5 py-1.5 rounded-lg border border-[#262626] bg-[#1a1a1a] hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 text-zinc-400 font-medium transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <Link href="/auth/login">
            <Button variant="primary" pill size="sm" className="gap-1.5">
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
