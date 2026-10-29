'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-[#0f0f0f] text-zinc-100 font-sans">
        <div className="p-6 rounded-xl border border-[#262626] bg-[#171717] text-center flex items-center gap-3 shadow-xl">
          <Loader2 className="w-5 h-5 animate-spin text-[#3ECF8E]" />
          <span className="text-xs font-mono font-medium text-zinc-300">Authenticating operator session…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
