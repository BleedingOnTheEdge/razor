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
      href: '/',
      label: 'System Overview',
      icon: LayoutDashboard,
      active: pathname === '/',
      visible: true,
    },
    {
      href: '/instances',
      label: 'Engine Fleet',
      icon: Server,
      active: pathname.startsWith('/instances'),
      visible: true,
    },
    {
      href: '/maintenance',
      label: 'Maintenance Console',
      icon: Terminal,
      active: pathname.startsWith('/maintenance'),
      visible: true,
    },
    {
      href: '/runs',
      label: 'Flow Runs & Lineage',
      icon: Activity,
      active: pathname.startsWith('/runs') || pathname.startsWith('/reports'),
      visible: true,
    },
    {
      href: '/admin',
      label: 'Admin Governance',
      icon: ShieldAlert,
      active: pathname.startsWith('/admin'),
      visible: isAdmin,
    },
    {
      href: '/settings',
      label: 'Preferences',
      icon: Settings,
      active: pathname.startsWith('/settings'),
      visible: isOperatorOrAdmin || !user,
    },
    {
      href: '/profile',
      label: 'User Profile',
      icon: User,
      active: pathname.startsWith('/profile'),
      visible: true,
    },
    {
      href: '/tickets',
      label: 'Support & Triage',
      icon: LifeBuoy,
      active: pathname.startsWith('/tickets'),
      visible: true,
    },
  ];

  const visibleLinks = allLinks.filter((l) => l.visible);

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full bg-white">
      <div>
        {/* Brand */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-zinc-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-zinc-950 shadow-md shadow-cyan-500/20">
              R
            </div>
            <div>
              <span className="font-bold tracking-tight text-zinc-900 block text-sm">RAZOR CLOUD</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Control Plane</span>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
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
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  link.active
                    ? 'bg-cyan-50 text-cyan-700 font-semibold shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                )}
              >
                <Icon className={clsx('w-4 h-4', link.active ? 'text-cyan-600' : 'text-zinc-400')} />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <a
            href="http://localhost:3001"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4 text-zinc-400" />
              <span>Marketplace</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 font-mono text-zinc-500">:3001</span>
          </a>
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-zinc-200 bg-zinc-50/80">
        <div className="flex items-center justify-between text-xs text-zinc-600">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
            <span>Engine Sockets</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-zinc-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Listening
          </span>
        </div>
        <div className="mt-2 text-[11px] text-zinc-500 font-mono">
          Cloud API v1.0 • .NET 10
        </div>
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
