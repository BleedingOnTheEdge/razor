'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Terminal, LogOut, ArrowRight, User } from 'lucide-react';
import clsx from 'clsx';

export function PublicNav() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const links = [
    { href: '/', label: 'HOME' },
    { href: '/about', label: 'ABOUT' },
    { href: '/docs', label: 'DOCS' },
    { href: '/marketplace', label: 'MARKETPLACE' },
    { href: '/terms', label: 'TERMS' },
    { href: '/contact', label: 'CONTACT' },
  ];

  return (
    <nav className="h-16 px-4 md:px-12 border-b border-black flex items-center justify-between bg-white text-black font-mono text-xs select-none">
      {/* Brand & Left Links */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-base group-hover:bg-zinc-800 transition-colors">
            R
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight block">RAZOR</span>
            <span className="text-[9px] uppercase font-bold tracking-widest text-black hidden sm:block">
              QUANTITATIVE ENGINE
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-bold">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'px-2 py-1 border transition-colors',
                pathname === link.href
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-transparent hover:border-black'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Right Side: Auth-Aware Buttons */}
      <div className="flex items-center gap-2 sm:gap-3 font-bold text-xs">
        {mounted && isAuthenticated && user ? (
          <>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 border border-black bg-zinc-50 text-black">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[100px]">{user.userName}</span>
            </div>
            <Link
              href="/panel"
              className="px-3 sm:px-4 py-1.5 border border-black bg-black text-white hover:bg-white hover:text-black transition-colors flex items-center gap-1.5"
            >
              <span>[ENTER TERMINAL]</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={logout}
              title="Sign Out"
              className="px-2.5 py-1.5 border border-black bg-white hover:bg-red-600 hover:text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <Link
            href="/auth/login"
            className="px-4 py-1.5 border border-black bg-white hover:bg-black hover:text-white transition-colors uppercase"
          >
            [SIGN IN]
          </Link>
        )}
      </div>
    </nav>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-black bg-white text-black font-mono text-xs">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm">
              <div className="w-6 h-6 bg-black text-white flex items-center justify-center text-xs">
                R
              </div>
              <span>RAZOR QUANTITATIVE PLATFORM</span>
            </div>
            <p className="text-black font-normal text-xs leading-relaxed max-w-sm">
              Autonomous strategy synthesis, genetic parameter evolution, and deterministic high-frequency order execution built on .NET 10 LTS.
            </p>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-black uppercase block border-b border-black pb-1">
              Platform
            </span>
            <ul className="space-y-1.5">
              <li><Link href="/" className="hover:underline">Home</Link></li>
              <li><Link href="/about" className="hover:underline">About</Link></li>
              <li><Link href="/panel" className="hover:underline">Operator Terminal</Link></li>
              <li><Link href="/marketplace" className="hover:underline">Marketplace Hub</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-black uppercase block border-b border-black pb-1">
              Developers
            </span>
            <ul className="space-y-1.5">
              <li><Link href="/docs" className="hover:underline">Documentation</Link></li>
              <li><Link href="/docs#slots" className="hover:underline">Trading Slots</Link></li>
              <li><Link href="/docs#hooks" className="hover:underline">Fitness Hooks</Link></li>
              <li><Link href="/docs#adapters" className="hover:underline">Broker Adapters</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-black uppercase block border-b border-black pb-1">
              Governance
            </span>
            <ul className="space-y-1.5">
              <li><Link href="/terms" className="hover:underline">Terms of Service</Link></li>
              <li><Link href="/contact" className="hover:underline">Operations Contact</Link></li>
              <li><Link href="/terms#risk" className="hover:underline">Risk Disclosures</Link></li>
              <li><Link href="/auth/login" className="hover:underline">Sign In</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-black flex flex-wrap items-center justify-between gap-4 text-[11px]">
          <div>
            &copy; {new Date().getFullYear()} RAZOR TRADING TECHNOLOGIES • ALL RIGHTS RESERVED
          </div>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:underline">TERMS</Link>
            <Link href="/contact" className="hover:underline">CONTACT</Link>
            <Link href="/docs" className="hover:underline">DOCS</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
