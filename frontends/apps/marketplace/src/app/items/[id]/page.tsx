'use client';

import { use } from 'react';
import { ItemDetailContent } from '@/components/items/item-detail-content';

interface ItemDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { id } = use(params);
  return <ItemDetailContent itemId={id} />;
}
