'use client';

import { use } from 'react';
import { useParams } from 'next/navigation';
import { LineageContent } from '@/components/lineage/lineage-content';

export default function LineagePage({ params }: { params: Promise<{ id: string }> }) {
  const routeParams = useParams();
  const resolved = params ? use(params) : null;
  const runId = (routeParams?.id as string) || resolved?.id || '';

  return <LineageContent runId={runId} />;
}
