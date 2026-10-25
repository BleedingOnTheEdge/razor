import React from 'react';

export default function MarketplaceStandaloneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-900 text-white font-mono flex flex-col justify-between">
      {/* Dedicated Marketplace Independent Header */}
      <header className="h-14 px-6 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-indigo-600 text-white flex items-center justify-center font-bold text-xs rounded">
            M
          </div>
          <div>
            <span className="font-bold text-xs tracking-tight text-white block">
              RAZOR MARKETPLACE ECOSYSTEM
            </span>
            <span className="text-[9px] text-zinc-400 uppercase tracking-widest block font-sans">
              Dedicated Additives & Community Hub
            </span>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 border border-zinc-700 bg-zinc-800 text-zinc-300 font-bold">
          STANDALONE PORTAL
        </span>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6">
        {children}
      </main>

      <footer className="h-12 px-6 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-[11px] text-zinc-500">
        <span>Razor Marketplace Architecture</span>
        <span>Independent Community & Income Plane</span>
      </footer>
    </div>
  );
}
