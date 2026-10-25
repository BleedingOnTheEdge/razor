'use client';

import React, { Suspense } from 'react';
import { LiveManagerContent } from '@/components/live/LiveManagerContent';

export default function PanelLivePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-mono text-black font-bold">[LOADING LIVE MANAGER...]</div>}>
      <LiveManagerContent />
    </Suspense>
  );
}
