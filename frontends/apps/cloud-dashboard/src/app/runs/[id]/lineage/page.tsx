'use client';

import { use } from 'react';
import { LineageContent } from '@/components/lineage/lineage-content';

export default function LineagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: runId } = use(params);
  return <LineageContent runId={runId} />;
}
