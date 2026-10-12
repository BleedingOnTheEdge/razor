import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Suspense } from 'react';
import { RunReportContent } from '@/components/reports/report-content';
import { ToastProvider } from '@/components/ui/toast';

const mockReport = {
  runId: 'run-report-01',
  engineInstanceId: 'inst-001',
  kind: 'Backtest',
  status: 'Running',
  relation: 'Original',
  continuity: 'Contiguous',
  baseSeed: 42,
  isPartial: false,
  createdAt: '2026-10-10T12:00:00Z',
  metrics: {
    netProfit: 14250.75,
    totalReturn: 0.1425,
    sharpeRatio: 2.15,
    maxDrawdown: 0.065,
    tradeCount: 148,
    bestFitness: 0.892,
  },
  interventions: [
    {
      id: 'int-01',
      stepIndex: 120,
      previousFingerprint: 'sha256:1111',
      newFingerprint: 'sha256:2222',
      actor: 'risk-manager@razor.local',
      reason: 'Circuit breaker manual override',
      modificationsSummary: 'Lowered leverage cap from 10x to 5x',
      timestamp: '2026-10-10T14:30:00Z',
    },
  ],
  gaps: [
    {
      id: 'gap-01',
      startStep: 400,
      endStep: 420,
      reason: 'Upstream exchange feed disconnect',
      recordedAt: '2026-10-10T15:00:00Z',
    },
  ],
  comparable: true,
};

vi.mock('@/lib/api-client', () => ({
  getApiClient: () => ({
    GET: vi.fn().mockImplementation((path: string) => {
      if (path.includes('/report')) {
        return Promise.resolve({ data: mockReport, error: null });
      }
      return Promise.resolve({ data: null, error: 'Not found' });
    }),
    POST: vi.fn().mockResolvedValue({
      data: { ...mockReport, status: 'Paused' },
      error: null,
    }),
  }),
}));

describe('Run Report & Audit View', () => {
  it('renders performance metrics and audit trail', async () => {
    render(
      <ToastProvider>
        <RunReportContent runId="run-report-01" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Flow Run Report')).toBeInTheDocument();
      expect(screen.getByText('Comparable / Certified')).toBeInTheDocument();
      expect(screen.getByText('$14,250.75')).toBeInTheDocument();
      expect(screen.getByText('+14.25%')).toBeInTheDocument();
      expect(screen.getByText('2.15')).toBeInTheDocument();
      expect(screen.getByText('Circuit breaker manual override')).toBeInTheDocument();
      expect(screen.getByText(/Lowered leverage cap from 10x to 5x/i)).toBeInTheDocument();
      expect(screen.getByText(/Steps 400 – 420/i)).toBeInTheDocument();
    });
  });

  it('triggers pause and complete run modals', async () => {
    render(
      <ToastProvider>
        <RunReportContent runId="run-report-01" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Flow Run Report')).toBeInTheDocument();
    });

    const completeBtn = screen.getByText('Complete Run');
    fireEvent.click(completeBtn);

    expect(screen.getByText('Submit Final Run Metrics')).toBeInTheDocument();
    expect(screen.getByText('Net Profit ($)')).toBeInTheDocument();

    const cancelBtn = screen.getByText('✕ Cancel');
    fireEvent.click(cancelBtn);

    expect(screen.queryByText('Submit Final Run Metrics')).not.toBeInTheDocument();
  });
});
