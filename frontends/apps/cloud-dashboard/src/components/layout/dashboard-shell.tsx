'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // On landing page (/) and auth pages like /login, /auth/..., render full screen without dashboard chrome
  if (pathname === '/' || pathname === '/login' || pathname.startsWith('/auth')) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white text-black">
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        <Header onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)} />
        <main
          className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 bg-white"
          role="main"
        >
          {children}
        </main>
      </div>
      <MobileBottomNav onOpenSidebar={() => setIsMobileMenuOpen(true)} />
    </div>
  );
}
