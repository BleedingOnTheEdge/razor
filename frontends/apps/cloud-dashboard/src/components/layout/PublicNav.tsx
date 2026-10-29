'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { LogOut, ArrowRight, User } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@razor/ui-kit';

export function PublicNav() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const links = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/docs', label: 'Docs' },
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/terms', label: 'Terms' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <nav className="h-14 px-4 md:px-12 border-b border-[#262626] flex items-center justify-between bg-[#171717] text-zinc-100 font-sans text-xs select-none">
      {/* Brand & Left Links */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-[#3ECF8E] text-[#0f0f0f] flex items-center justify-center font-bold text-sm shadow-sm shadow-[#3ECF8E]/20">
            R
          </div>
          <div>
            <span className="font-semibold text-xs tracking-tight block text-zinc-100">RAZOR</span>
            <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 hidden sm:block">
              QUANTITATIVE ENGINE
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-medium">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'px-2.5 py-1 rounded-md transition-colors',
                pathname === link.href
                  ? 'bg-[#222222] text-[#3ECF8E] font-medium'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f1f]'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Right Side: Auth-Aware Buttons */}
      <div className="flex items-center gap-2 sm:gap-2.5 font-medium text-xs">
        {mounted && isAuthenticated && user ? (
          <>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#262626] bg-[#1a1a1a] text-zinc-300 font-mono text-[11px]">
              <User className="w-3.5 h-3.5 text-[#3ECF8E] shrink-0" />
              <span className="truncate max-w-[100px]">{user.userName}</span>
            </div>
            <Link href="/panel">
              <Button variant="primary" pill size="sm" className="gap-1.5 shadow-sm shadow-[#3ECF8E]/20">
                <span>Enter Terminal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg border border-[#262626] bg-[#1a1a1a] hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 text-zinc-400 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <Link href="/auth/login">
            <Button variant="primary" pill size="sm">
              Sign In
            </Button>
          </Link>
        )}
      </div>
    </nav>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-[#262626] bg-[#171717] py-8 text-xs text-zinc-400 font-sans">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span>Razor Quantitative Engine • Institutional High-Frequency Architecture</span>
        <span className="font-mono text-zinc-500">v1.0.0 LTS • Supabase Design System</span>
      </div>
    </footer>
  );
}
