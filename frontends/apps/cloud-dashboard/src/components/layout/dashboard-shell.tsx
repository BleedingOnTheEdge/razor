'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useAuth } from '@/context/auth-context';
import { AlertTriangle, Sparkles, ArrowRight, ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@razor/ui-kit';

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
      <div className="min-h-screen bg-[#0f0f0f] text-zinc-100 font-sans flex items-center justify-center p-6 text-center">
        <div className="p-8 rounded-2xl border border-[#262626] bg-[#171717] space-y-3 shadow-2xl">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#3ECF8E]" />
          <div className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-widest">
            Authenticating Operator Session…
          </div>
        </div>
      </div>
    );
  }

  // Strictly block unauthenticated access to the panel
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-zinc-100 font-sans flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full border border-rose-500/30 bg-rose-500/10 flex items-center justify-center font-bold text-rose-400 text-lg">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-100">Restricted Operator Surface</h1>
        <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
          Access to this execution surface requires active operator authentication. Redirecting to sign in…
        </p>
        <Link href="/auth/login">
          <Button variant="primary" pill size="sm">
            Go to Sign In
          </Button>
        </Link>
      </div>
    );
  }

  // Footer promotion logic without emojis
  const currentTier = user?.subscriptionTier?.toUpperCase();
  let promoContent: React.ReactNode = null;

  if (currentTier === 'ENTERPRISE') {
    promoContent = (
      <span className="text-[#3ECF8E] font-medium text-xs tracking-tight flex items-center justify-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-[#3ECF8E]" />
        <span>Razor Enterprise Active — Unlimited Execution Nodes & Sub-Millisecond Priority Sockets</span>
      </span>
    );
  } else if (currentTier === 'PRO') {
    promoContent = (
      <Link
        href="/panel/admin"
        className="text-amber-400 hover:text-amber-300 font-medium text-xs tracking-tight flex items-center justify-center gap-2 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Scale to Enterprise — Dedicated Cluster Nodes, Zero Rate-Limits & Unlimited Instances &rarr;</span>
      </Link>
    );
  } else {
    promoContent = (
      <Link
        href="/panel/admin"
        className="text-[#3ECF8E] hover:text-[#34b27b] font-medium text-xs tracking-tight flex items-center justify-center gap-2 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5 text-[#3ECF8E]" />
        <span>Upgrade to Pro — Multi-Engine Parallel Execution, Live Trading Manager & Telemetry Fills &rarr;</span>
      </Link>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f0f0f] text-zinc-100 font-sans">
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0f0f0f]">
        {/* Top Persistent Impersonation Alert Banner */}
        {isImpersonating && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-300 px-4 py-2 text-xs font-mono font-medium flex items-center justify-between z-30 shadow-sm shrink-0">
            <div className="flex items-center gap-2 truncate">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <span className="truncate">
                [IMPERSONATION ACTIVE]: Operating as [{user?.userName || 'User'}]
              </span>
            </div>
            <button
              onClick={exitImpersonation}
              className="bg-amber-400 hover:bg-amber-300 text-black px-2.5 py-1 text-[11px] font-semibold rounded-full uppercase shrink-0 transition-colors"
            >
              Exit Impersonation
            </button>
          </div>
        )}

        <Header onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-20 md:pb-6 bg-[#0f0f0f] text-zinc-100 min-h-0">
          {children}
        </main>

        {/* Global Footer Marketing Promotional Banner */}
        <footer className="w-full bg-[#171717] border-t border-[#262626] py-2.5 px-4 text-center select-none shrink-0 font-sans">
          {promoContent}
        </footer>
      </div>

      <MobileBottomNav onOpenSidebar={() => setIsMobileMenuOpen(true)} />
    </div>
  );
}
