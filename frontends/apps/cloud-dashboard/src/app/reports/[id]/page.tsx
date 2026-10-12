'use client';

import { use } from 'react';
import { RunReportContent } from '@/components/reports/report-content';

export default function RunReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: runId } = use(params);
  return <RunReportContent runId={runId} />;
}
