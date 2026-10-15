'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // On auth pages like /login, render full screen without dashboard chrome
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8 bg-zinc-100/70 dark:bg-zinc-950/80" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}
