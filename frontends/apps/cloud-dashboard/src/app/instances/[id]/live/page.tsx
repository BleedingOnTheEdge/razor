'use client';

import { use } from 'react';
import { useParams, redirect } from 'next/navigation';

export default function InstanceLivePage({ params }: { params: Promise<{ id: string }> }) {
  const routeParams = useParams();
  const resolved = params ? use(params) : null;
  const instanceId = (routeParams?.id as string) || resolved?.id || '';

  redirect(`/live?instanceId=${instanceId}`);
}
