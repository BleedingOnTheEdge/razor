'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Server, LayoutDashboard, Activity, Radio } from 'lucide-react';
import clsx from 'clsx';

export interface MobileBottomNavProps {
  onOpenSidebar: () => void;
}

export function MobileBottomNav({ onOpenSidebar }: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      id: 'menu',
      label: 'MENU',
      icon: Menu,
      onClick: onOpenSidebar,
      active: false,
    },
    {
      id: 'overview',
      label: 'OVERVIEW',
      icon: LayoutDashboard,
      href: '/panel',
      active: pathname === '/panel' || pathname === '/',
    },
    {
      id: 'fleet',
      label: 'FLEET',
      icon: Server,
      href: '/panel/instances',
      active: pathname.startsWith('/panel/instances') || pathname.startsWith('/instances'),
    },
    {
      id: 'live',
      label: 'LIVE',
      icon: Radio,
      href: '/panel/live',
      active: pathname.startsWith('/panel/live') || pathname.startsWith('/live'),
    },
    {
      id: 'runs',
      label: 'RUNS',
      icon: Activity,
      href: '/panel/runs',
      active: pathname.startsWith('/panel/runs') || pathname.startsWith('/panel/reports') || pathname.startsWith('/runs') || pathname.startsWith('/reports'),
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-black flex items-center justify-around font-mono text-[11px] select-none h-14"
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
              className="flex-1 h-full flex flex-col items-center justify-center bg-white text-black hover:bg-black hover:text-white transition-colors"
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="font-bold tracking-tight">{item.label}</span>
            </button>
          );
        }

        return (
          <Link
            key={item.id}
            href={item.href!}
            className={clsx(
              'flex-1 h-full flex flex-col items-center justify-center transition-colors border-r border-black last:border-r-0',
              item.active
                ? 'bg-black text-white font-bold'
                : 'bg-white text-black hover:bg-black hover:text-white font-bold'
            )}
          >
            <Icon className="w-4 h-4 mb-0.5" />
            <span className="tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
