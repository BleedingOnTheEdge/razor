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
    <div className="flex flex-col justify-between h-full bg-white border-r border-black font-mono">
      <div>
        {/* Brand */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-black">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-base">
              R
            </div>
            <div>
              <span className="font-bold tracking-tight text-black block text-sm">RAZOR CLOUD</span>
              <span className="text-[10px] text-black uppercase tracking-widest font-bold">Control Plane</span>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="md:hidden p-1.5 text-black hover:bg-black hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nav Items */}
        <nav className="p-4 space-y-1">
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 text-sm font-bold border transition-colors',
                  link.active
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-transparent hover:border-black hover:bg-zinc-100'
                )}
              >
                <Icon className={clsx('w-4 h-4', link.active ? 'text-white' : 'text-black')} />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <a
            href="http://localhost:3001"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3 py-2 text-sm font-bold border border-transparent hover:border-black hover:bg-zinc-100 text-black transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4 text-black" />
              <span>Marketplace</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 border border-black font-bold">:3001</span>
          </a>
        </nav>
      </div>

      {/* Mini Profile Footer */}
      <div className="p-3 border-t border-black bg-white">
        {user ? (
          <Link
            href="/panel/profile"
            onClick={onClose}
            className="flex items-center gap-3 p-1.5 border border-transparent hover:border-black hover:bg-zinc-50 transition-colors group"
            title="View User Profile"
          >
            <div className="w-8 h-8 rounded-full border border-black bg-zinc-100 flex items-center justify-center font-bold text-black text-xs shrink-0">
              {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : user.userName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-black truncate group-hover:underline">
                {user.displayName || user.userName}
              </div>
              <div className="text-[10px] text-zinc-600 font-bold uppercase truncate">
                {user.role} • {user.subscriptionTier || 'Free'}
              </div>
            </div>
          </Link>
        ) : (
          <Link
            href="/auth/login"
            onClick={onClose}
            className="flex items-center justify-center gap-2 p-2 border border-black bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-colors"
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
        className="hidden md:flex w-64 border-r border-zinc-200 bg-white/90 backdrop-blur-md flex-col justify-between shrink-0"
        aria-label="Sidebar Navigation"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Off-Canvas Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true" aria-label="Mobile Navigation Drawer">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Slide-over panel */}
          <aside className="relative w-72 max-w-[85vw] h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
