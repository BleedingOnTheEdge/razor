'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useAuth } from '@/context/auth-context';
import { AlertTriangle, Sparkles, ArrowRight, ShieldAlert, Loader2 } from 'lucide-react';

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/about',
  '/contact',
  '/terms',
  '/docs',
  '/marketplace',
];

function isPathPublic(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  if (pathname.startsWith('/auth') || pathname.startsWith('/docs') || pathname.startsWith('/marketplace')) return true;
  return false;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading, isImpersonating, impersonatedBy, exitImpersonation } = useAuth();

  const isPublic = isPathPublic(pathname);

  // Strict Authentication Guard for all non-public surfaces
  useEffect(() => {
    if (!isPublic && !isLoading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isPublic, isLoading, isAuthenticated, router]);

  // On public pages, render full screen without dashboard chrome
  if (isPublic) {
    return <>{children}</>;
  }

  // Loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-black font-mono flex items-center justify-center p-6 text-center">
        <div className="p-8 border border-black space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-black" />
          <div className="text-xs font-bold uppercase tracking-widest">[AUTHENTICATING OPERATOR SESSION...]</div>
        </div>
      </div>
    );
  }

  // Strictly block unauthenticated access to the panel
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white text-black font-mono flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 border border-black flex items-center justify-center font-bold text-red-600 text-lg">
          [!]
        </div>
        <h1 className="text-lg font-bold uppercase">Restricted Operator Surface</h1>
        <p className="text-xs text-black max-w-sm">
          Access to this execution surface requires active operator authentication. Redirecting to sign in...
        </p>
        <Link
          href="/auth/login"
          className="px-4 py-2 bg-black text-white hover:bg-zinc-800 font-bold text-xs border border-black transition-colors"
        >
          [GO TO SIGN IN]
        </Link>
      </div>
    );
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
        <span>Scale to ENTERPRISE — Dedicated Cluster Nodes, Zero Rate-Limits & Unlimited Instances &rarr;</span>
      </Link>
    );
  } else {
    promoContent = (
      <Link
        href="/panel/admin"
        className="text-[#D97706] hover:text-[#B45309] font-extrabold text-base tracking-tight flex items-center justify-center gap-2 transition-colors"
      >
        <Sparkles className="w-5 h-5 text-[#D97706]" />
        <span>Upgrade to PRO — Multi-Engine Parallel Execution, Live Trading Manager & Telemetry Fills &rarr;</span>
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
              </span>
            </div>
            <button
              onClick={exitImpersonation}
              className="bg-black hover:bg-zinc-800 text-white px-2.5 py-1 text-[11px] font-bold border border-black uppercase shrink-0 transition-colors"
            >
              Exit Impersonation
            </button>
          </div>
        )}

        <Header onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-20 md:pb-6 bg-white text-black min-h-0">
          {children}
        </main>

        {/* Global Footer Marketing Promotional Banner */}
        <footer className="w-full bg-[#FEF3C7] border-t border-[#F59E0B] py-3 px-4 text-center select-none shrink-0 font-sans">
          {promoContent}
        </footer>
      </div>

      <MobileBottomNav onOpenSidebar={() => setIsMobileMenuOpen(true)} />
    </div>
  );
}
