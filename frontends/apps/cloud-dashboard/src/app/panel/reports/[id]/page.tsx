'use client';

import { use } from 'react';
import { useParams } from 'next/navigation';
import { RunReportContent } from '@/components/reports/report-content';

export default function PanelRunReportPage({ params }: { params: Promise<{ id: string }> }) {
  const routeParams = useParams();
  const resolved = params ? use(params) : null;
  const runId = (routeParams?.id as string) || resolved?.id || '';

  return <RunReportContent runId={runId} />;
}
