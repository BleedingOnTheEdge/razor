'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useAuth } from '@/context/auth-context';
import { AlertTriangle, Sparkles, ArrowRight } from 'lucide-react';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isImpersonating, impersonatedBy, exitImpersonation } = useAuth();

  // On landing page (/) and auth pages like /login, /auth/..., render full screen without dashboard chrome
  if (pathname === '/' || pathname === '/login' || pathname.startsWith('/auth')) {
    return <>{children}</>;
  }

  // Footer promotion logic:
  // - No subscription or Free -> Promote Pro
  // - Pro -> Promote Enterprise
  // - Enterprise -> "Enjoy Razor ❤️"
  const currentTier = user?.subscriptionTier?.toUpperCase();
  let promoContent: React.ReactNode = null;

  if (currentTier === 'ENTERPRISE') {
    promoContent = (
      <span className="text-[#D97706] font-extrabold text-base tracking-tight flex items-center justify-center gap-2">
        Enjoy Razor ❤️
      </span>
    );
  } else if (currentTier === 'PRO') {
    promoContent = (
      <Link
        href="/panel/admin"
        className="text-[#D97706] hover:text-[#B45309] font-extrabold text-base tracking-tight flex items-center justify-center gap-2 transition-colors"
      >
        <Sparkles className="w-5 h-5 text-[#D97706]" />
        <span>Scale to ENTERPRISE — Dedicated Cluster Nodes, Zero Rate-Limits & Unlimited Instances →</span>
      </Link>
    );
  } else {
    promoContent = (
      <Link
        href="/panel/admin"
        className="text-[#D97706] hover:text-[#B45309] font-extrabold text-base tracking-tight flex items-center justify-center gap-2 transition-colors"
      >
        <Sparkles className="w-5 h-5 text-[#D97706]" />
        <span>Upgrade to PRO — Multi-Engine Parallel Execution, Live Trading Manager & Telemetry Fills →</span>
      </Link>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white text-black font-sans">
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        {/* Top Persistent Impersonation Alert Banner */}
        {isImpersonating && (
          <div className="bg-amber-300 text-black px-4 py-2 text-xs font-mono font-bold flex items-center justify-between border-b-2 border-black z-30 shadow-sm shrink-0">
            <div className="flex items-center gap-2 truncate">
              <AlertTriangle className="w-4 h-4 text-black shrink-0 animate-pulse" />
              <span className="truncate">
                [IMPERSONATION ACTIVE]: Operating as [{user?.userName || 'User'}]
                {impersonatedBy ? ` (Impersonated by ${impersonatedBy})` : ''}
                {user?.role === 'Operator' ? ' — [OPERATOR RESTRICTED: Live Deploy Blocked]' : ' — [ADMIN FULL ACCESS]'}
              </span>
            </div>
            <button
              type="button"
              onClick={exitImpersonation}
              className="px-3 py-1 bg-black text-white hover:bg-zinc-800 text-xs font-mono font-bold shrink-0 transition-colors ml-2"
            >
              [EXIT IMPERSONATION]
            </button>
          </div>
        )}

        <Header onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)} />

        <main
          className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 bg-white"
          role="main"
        >
          {children}
        </main>

        {/* Base Footer with Gold Promotion */}
        <footer className="border-t border-black bg-zinc-50 px-4 py-3 text-center shrink-0">
          {promoContent}
        </footer>
      </div>
      <MobileBottomNav onOpenSidebar={() => setIsMobileMenuOpen(true)} />
    </div>
  );
}

