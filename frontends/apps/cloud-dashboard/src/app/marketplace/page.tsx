'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, ExternalLink, ArrowRight, Store, Compass, KeyRound, MessageSquare } from 'lucide-react';

export default function MarketplaceGatewayPage() {
  const marketplaceUrl = process.env.NEXT_PUBLIC_MARKETPLACE_URL || 'http://localhost:3001';

  return (
    <div className="py-12 space-y-8 max-w-3xl mx-auto text-center font-mono">
      <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/10">
        <Store className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-white uppercase">
          Razor Marketplace Ecosystem
        </h1>
        <p className="text-xs text-zinc-400 font-sans max-w-md mx-auto leading-relaxed">
          The Marketplace runs as an independent focused ecosystem dedicated to community discussions, publishing, extension acquisitions, and multi-tenant payment gateways.
        </p>
      </div>

      {/* Primary Action to Open in New Tab */}
      <div className="pt-2">
        <a
          href={marketplaceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase transition-all shadow-lg shadow-indigo-600/25 border border-indigo-400"
        >
          <span>Launch Marketplace in Dedicated Tab</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Feature Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left pt-6 border-t border-zinc-800">
        <div className="p-4 border border-zinc-800 bg-zinc-950/50 space-y-2">
          <div className="flex items-center gap-2 text-indigo-400">
            <Compass className="w-4 h-4" />
            <span className="font-bold text-xs uppercase">Curated Catalog</span>
          </div>
          <p className="text-[11px] text-zinc-400 font-sans">
            Browse verified strategies, adapter connectors, and machine learning models with immutable versioning.
          </p>
        </div>

        <div className="p-4 border border-zinc-800 bg-zinc-950/50 space-y-2">
          <div className="flex items-center gap-2 text-indigo-400">
            <KeyRound className="w-4 h-4" />
            <span className="font-bold text-xs uppercase">Licensing Rights</span>
          </div>
          <p className="text-[11px] text-zinc-400 font-sans">
            Cryptographic perpetual licenses pin exact purchased versions so your live execution is never broken.
          </p>
        </div>

        <div className="p-4 border border-zinc-800 bg-zinc-950/50 space-y-2">
          <div className="flex items-center gap-2 text-indigo-400">
            <MessageSquare className="w-4 h-4" />
            <span className="font-bold text-xs uppercase">Community Hub</span>
          </div>
          <p className="text-[11px] text-zinc-400 font-sans">
            Engage with algorithmic quantitative traders and publisher authors directly in dedicated discussion threads.
          </p>
        </div>
      </div>
    </div>
  );
}
