'use client';

import { use } from 'react';
import { useParams } from 'next/navigation';
import { InstanceDetailContent } from '@/components/instances/instance-detail-content';

export default function InstanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const routeParams = useParams();
  const resolved = params ? use(params) : null;
  const instanceId = (routeParams?.id as string) || resolved?.id || '';

  return <InstanceDetailContent instanceId={instanceId} />;
}
