'use client';

import React, { Suspense } from 'react';
import { LiveManagerContent } from '@/components/live/LiveManagerContent';

export default function LivePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-mono text-zinc-400">Loading Live Manager...</div>}>
      <LiveManagerContent />
    </Suspense>
  );
}
