'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { User, LogOut, LogIn, Menu, ChevronRight } from 'lucide-react';
import { Button, Badge } from '@razor/ui-kit';

export interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export function Header({ onToggleMobileMenu }: HeaderProps = {}) {
  const pathname = usePathname() || '';
  const { user, isAuthenticated, logout } = useAuth();

  const getPageTitle = (p: string) => {
    if (p.startsWith('/panel/instances')) return 'Engine Fleet';
    if (p.startsWith('/panel/live')) return 'Live Trading Manager';
    if (p.startsWith('/panel/runs') || p.startsWith('/panel/reports')) return 'Flow Runs & Lineage';
    if (p.startsWith('/panel/bundles')) return 'Bundles';
    if (p.startsWith('/panel/maintenance')) return 'Maintenance Console';
    if (p.startsWith('/panel/admin')) return 'Admin Governance';
    if (p.startsWith('/panel/settings')) return 'Preferences';
    if (p.startsWith('/panel/profile')) return 'User Profile';
    if (p.startsWith('/panel/tickets')) return 'Support & Triage';
    return 'System Overview';
  };

  // Display nickname if available, else username
  const displayName = user?.displayName || user?.userName || 'User';

  return (
    <header className="h-14 border-b border-zinc-200 px-4 md:px-8 flex items-center justify-between bg-white/90 backdrop-blur-md font-sans text-zinc-900" role="banner">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          aria-label="Open Navigation Menu"
          className="md:hidden p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-xs font-medium">
          <Link href="/panel" className="text-zinc-500 hover:text-zinc-900 transition-colors" aria-label="Razor Operator Dashboard">
            <span className="sr-only">Razor Operator Dashboard</span>
            Control Plane
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-900 font-semibold">{getPageTitle(pathname)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 text-xs">
        <span className="sr-only">SSE LIVE STREAM</span>
        {/* Miniprofile */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            {/* Clickable username/nickname redirecting to profile */}
            <Link
              href="/panel/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 text-zinc-800 font-medium transition-colors shadow-sm"
              title="Click to view and edit profile"
            >
              <User className="w-3.5 h-3.5 text-[#3ECF8E] shrink-0" />
              <span className="font-mono text-xs font-medium text-zinc-900">{displayName}</span>
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
              className="px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-zinc-600 font-medium transition-all flex items-center gap-1.5 shadow-sm"
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
