'use client';

import { use } from 'react';
import { useParams } from 'next/navigation';
import { ItemDetailContent } from '@/components/items/item-detail-content';

interface ItemDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ItemDetailPage({ params }: ItemDetailPageProps) {
  const routeParams = useParams();
  const resolved = params ? use(params) : null;
  const id = (routeParams?.id as string) || resolved?.id || '';

  return <ItemDetailContent itemId={id} />;
}
