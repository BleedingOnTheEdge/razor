'use client';

import { use } from 'react';
import { InstanceDetailContent } from '@/components/instances/instance-detail-content';

export default function InstanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: instanceId } = use(params);
  return <InstanceDetailContent instanceId={instanceId} />;
}
