'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Server,
  Activity,
  ShoppingBag,
  ShieldCheck,
  LayoutDashboard,
  LifeBuoy,
  ShieldAlert,
  Settings,
  User,
  Terminal,
  X,
  Radio,
  Package,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/context/auth-context';

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps = {}) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isAdmin = user?.canAdministerCluster || user?.role === 'SuperAdmin' || user?.role === 'Admin';
  const isOperatorOrAdmin = isAdmin || user?.canManageFleet || user?.role === 'Operator';

  const allLinks = [
    {
      href: '/panel',
      label: 'System Overview',
      icon: LayoutDashboard,
      active: pathname === '/panel' || pathname === '/',
      visible: true,
    },
    {
      href: '/panel/instances',
      label: 'Engine Fleet',
      icon: Server,
      active: pathname.startsWith('/panel/instances') || (pathname.startsWith('/instances') && !pathname.includes('/live')),
      visible: true,
    },
    {
      href: '/panel/live',
      label: 'Live Trading Manager',
      icon: Radio,
      active: pathname.startsWith('/panel/live') || pathname.startsWith('/live'),
      visible: true,
    },
    {
      href: '/panel/runs',
      label: 'Flow Runs & Lineage',
      icon: Activity,
      active: pathname.startsWith('/panel/runs') || pathname.startsWith('/panel/reports') || pathname.startsWith('/runs') || pathname.startsWith('/reports'),
      visible: true,
    },
    {
      href: '/panel/bundles',
      label: 'Bundles',
      icon: Package,
      active: pathname.startsWith('/panel/bundles') || pathname.startsWith('/bundles'),
      visible: true,
    },
    {
      href: '/panel/maintenance',
      label: 'Maintenance Console',
      icon: Terminal,
      active: pathname.startsWith('/panel/maintenance') || pathname.startsWith('/maintenance'),
      visible: true,
    },
    {
      href: '/panel/admin',
      label: 'Admin Governance',
      icon: ShieldAlert,
      active: pathname.startsWith('/panel/admin') || pathname.startsWith('/admin'),
      visible: isAdmin,
    },
    {
      href: '/panel/settings',
      label: 'Preferences',
      icon: Settings,
      active: pathname.startsWith('/panel/settings') || pathname.startsWith('/settings'),
      visible: isOperatorOrAdmin || !user,
    },
    {
      href: '/panel/profile',
      label: 'User Profile',
      icon: User,
      active: pathname.startsWith('/panel/profile') || pathname.startsWith('/profile'),
      visible: true,
    },
    {
      href: '/panel/tickets',
      label: 'Support & Triage',
      icon: LifeBuoy,
      active: pathname.startsWith('/panel/tickets') || pathname.startsWith('/tickets'),
      visible: true,
    },
  ];

  const visibleLinks = allLinks.filter((l) => l.visible);

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full bg-[#171717] border-r border-[#262626] font-sans">
      <div>
        {/* Brand */}
        <div className="h-14 px-5 flex items-center justify-between border-b border-[#262626]">
          <Link href="/panel" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#3ECF8E] text-[#0f0f0f] flex items-center justify-center font-bold text-sm shadow-sm shadow-[#3ECF8E]/20">
              R
            </div>
            <div>
              <span className="font-semibold tracking-tight text-zinc-100 block text-xs">RAZOR CLOUD</span>
              <span className="text-[10px] text-zinc-500 font-mono block">Control Plane</span>
            </div>
          </Link>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="md:hidden p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#222222] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nav Items */}
        <nav className="p-3 space-y-1">
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={clsx(
                  'flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors',
                  link.active
                    ? 'bg-[#222222] text-[#3ECF8E] font-semibold border border-[#333333]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f1f] border border-transparent'
                )}
              >
                <Icon className={clsx('w-4 h-4 shrink-0', link.active ? 'text-[#3ECF8E]' : 'text-zinc-400')} />
                <span className="truncate">{link.label}</span>
              </Link>
            );
          })}

          <a
            href="/marketplace"
            onClick={onClose}
            className={clsx(
              'flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors border border-transparent',
              pathname.startsWith('/marketplace')
                ? 'bg-[#222222] text-[#3ECF8E] font-semibold border-[#333333]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f1f]'
            )}
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className={clsx('w-4 h-4 shrink-0', pathname.startsWith('/marketplace') ? 'text-[#3ECF8E]' : 'text-zinc-400')} />
              <span>Marketplace</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium bg-[#262626] text-[#3ECF8E]">
              HUB
            </span>
          </a>
        </nav>
      </div>

      {/* Mini Profile Footer */}
      <div className="p-3 border-t border-[#262626] bg-[#141414]">
        {user ? (
          <Link
            href="/panel/profile"
            onClick={onClose}
            className="flex items-center gap-2.5 p-1.5 rounded-lg border border-transparent hover:border-[#2e2e2e] hover:bg-[#1a1a1a] transition-colors group"
            title="View User Profile"
          >
            <div className="w-7 h-7 rounded-full border border-[#2e2e2e] bg-[#222222] flex items-center justify-center font-medium text-zinc-200 text-xs shrink-0 font-mono">
              {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : user.userName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-zinc-200 truncate group-hover:text-white">
                {user.displayName || user.userName}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono truncate">
                {user.role} • {user.subscriptionTier || 'Free'}
              </div>
            </div>
          </Link>
        ) : (
          <Link
            href="/auth/login"
            onClick={onClose}
            className="flex items-center justify-center gap-2 p-2 rounded-lg bg-[#222222] hover:bg-[#2a2a2a] text-zinc-200 text-xs font-medium border border-[#2e2e2e] transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex w-60 border-r border-[#262626] bg-[#171717] flex-col justify-between shrink-0"
        aria-label="Sidebar Navigation"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Off-Canvas Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true" aria-label="Mobile Navigation Drawer">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Slide-over panel */}
          <aside className="relative w-64 max-w-[85vw] h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
