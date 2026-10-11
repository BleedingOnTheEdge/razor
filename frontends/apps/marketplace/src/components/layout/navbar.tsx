'use client';

import Link from 'next/link';
import { ShoppingBag, ArrowUpRight } from 'lucide-react';

export function Navbar() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center font-bold text-zinc-950 shadow-lg shadow-indigo-500/20">
            <ShoppingBag className="w-4 h-4 text-zinc-950" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-white block text-sm">RAZOR MARKETPLACE</span>
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">Curated Extensions</span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <a
            href="http://localhost:3002"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 transition-colors"
          >
            <span>Operator Dashboard</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
          </a>
        </div>
      </div>
    </header>
  );
}
