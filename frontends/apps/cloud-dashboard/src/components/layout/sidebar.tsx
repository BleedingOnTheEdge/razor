'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Server, Activity, ShoppingBag, ShieldCheck, LayoutDashboard } from 'lucide-react';
import clsx from 'clsx';

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    {
      href: '/',
      label: 'System Overview',
      icon: LayoutDashboard,
      active: pathname === '/',
    },
    {
      href: '/instances',
      label: 'Engine Fleet',
      icon: Server,
      active: pathname.startsWith('/instances'),
    },
    {
      href: '/runs',
      label: 'Flow Runs & Lineage',
      icon: Activity,
      active: pathname.startsWith('/runs') || pathname.startsWith('/reports'),
    },
  ];

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-900/60 flex flex-col justify-between shrink-0" aria-label="Sidebar Navigation">
      <div>
        {/* Brand */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-zinc-800/80">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-zinc-950 shadow-lg shadow-cyan-500/20">
            R
          </div>
          <div>
            <span className="font-bold tracking-tight text-white block text-sm">RAZOR CLOUD</span>
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">Control Plane</span>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="p-4 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  link.active
                    ? 'bg-zinc-800 text-cyan-400 font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                )}
              >
                <Icon className={clsx('w-4 h-4', link.active ? 'text-cyan-400' : 'text-zinc-400')} />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <a
            href="http://localhost:3001"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4 text-zinc-400" />
              <span>Marketplace</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 font-mono text-zinc-400">:3001</span>
          </a>
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/40">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Engine Sockets</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Listening
          </span>
        </div>
        <div className="mt-2 text-[11px] text-zinc-400 font-mono">
          Cloud API v1.0 • .NET 10
        </div>
      </div>
    </aside>
  );
}
