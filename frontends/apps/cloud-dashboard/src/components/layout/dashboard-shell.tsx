'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // On auth pages like /login, render full screen without dashboard chrome
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 text-zinc-900">
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)} />
        <main
          className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 bg-zinc-100/70"
          role="main"
        >
          {children}
        </main>
      </div>
      <MobileBottomNav onOpenSidebar={() => setIsMobileMenuOpen(true)} />
    </div>
  );
}
