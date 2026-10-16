'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Server, LayoutDashboard, Activity, Terminal } from 'lucide-react';
import clsx from 'clsx';

export interface MobileBottomNavProps {
  onOpenSidebar: () => void;
}

/**
 * Apple Design System mobile bottom navigation bar.
 * Features 5 primary touch destinations with tactile active states and safe bottom padding.
 */
export function MobileBottomNav({ onOpenSidebar }: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      id: 'menu',
      label: 'Menu',
      icon: Menu,
      onClick: onOpenSidebar,
      active: false,
    },
    {
      id: 'fleet',
      label: 'Fleet',
      icon: Server,
      href: '/instances',
      active: pathname.startsWith('/instances'),
    },
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      href: '/',
      isCenter: true,
      active: pathname === '/',
    },
    {
      id: 'runs',
      label: 'Runs',
      icon: Activity,
      href: '/runs',
      active: pathname.startsWith('/runs') || pathname.startsWith('/reports'),
    },
    {
      id: 'maintenance',
      label: 'Maintenance',
      icon: Terminal,
      href: '/maintenance',
      active: pathname.startsWith('/maintenance'),
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-zinc-200 px-2 py-1.5 flex items-center justify-around shadow-lg select-none"
    >
      {navItems.map((item) => {
        const Icon = item.icon;

        if (item.onClick) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              aria-label="Open sidebar menu"
              className="flex flex-col items-center justify-center w-14 py-1 text-zinc-500 hover:text-zinc-900 active:scale-90 transition-transform"
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
            </button>
          );
        }

        if (item.isCenter) {
          return (
            <Link
              key={item.id}
              href={item.href!}
              aria-label={item.label}
              className={clsx(
                'flex flex-col items-center justify-center -mt-3 w-12 h-12 rounded-full shadow-md active:scale-95 transition-all',
                item.active
                  ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-cyan-500/25 ring-2 ring-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        }

        return (
          <Link
            key={item.id}
            href={item.href!}
            className={clsx(
              'flex flex-col items-center justify-center w-14 py-1 active:scale-90 transition-transform',
              item.active
                ? 'text-cyan-600 font-semibold'
                : 'text-zinc-500 hover:text-zinc-900'
            )}
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
