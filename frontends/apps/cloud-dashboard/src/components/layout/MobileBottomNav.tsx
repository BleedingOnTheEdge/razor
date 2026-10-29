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
      label: 'Menu',
      icon: Menu,
      onClick: onOpenSidebar,
      active: false,
    },
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      href: '/panel',
      active: pathname === '/panel' || pathname === '/',
    },
    {
      id: 'fleet',
      label: 'Fleet',
      icon: Server,
      href: '/panel/instances',
      active: pathname.startsWith('/panel/instances') || pathname.startsWith('/instances'),
    },
    {
      id: 'live',
      label: 'Live',
      icon: Radio,
      href: '/panel/live',
      active: pathname.startsWith('/panel/live') || pathname.startsWith('/live'),
    },
    {
      id: 'runs',
      label: 'Runs',
      icon: Activity,
      href: '/panel/runs',
      active: pathname.startsWith('/panel/runs') || pathname.startsWith('/panel/reports') || pathname.startsWith('/runs') || pathname.startsWith('/reports'),
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#171717] border-t border-[#262626] flex items-center justify-around font-sans text-[11px] select-none h-14"
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
              className="flex-1 h-full flex flex-col items-center justify-center text-zinc-400 hover:text-white hover:bg-[#222222] transition-colors"
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="font-medium tracking-tight">{item.label}</span>
            </button>
          );
        }

        return (
          <Link
            key={item.id}
            href={item.href!}
            className={clsx(
              'flex-1 h-full flex flex-col items-center justify-center transition-colors border-r border-[#262626] last:border-r-0',
              item.active
                ? 'bg-[#222222] text-[#3ECF8E] font-medium'
                : 'text-zinc-400 hover:text-white hover:bg-[#1f1f1f]'
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
