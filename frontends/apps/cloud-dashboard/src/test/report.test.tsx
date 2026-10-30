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

const mockGranularReport = {
  ...mockReport,
  runId: '100b05e8-c826-4eba-9159-d3222788da04',
  kind: 'WalkForward',
  winningDna: {
    genes: [14.0, 48.0, 0.02, 0.05, 1.0],
    parameters: { FastPeriod: 14, SlowPeriod: 48 },
    slots: { strategy: 'TrendFollowing', adapter: 'PaperBroker' },
    execution: { symbols: ['BTC/USDT'], timeframes: ['1m'], initialBalance: 100000 },
    fitness: 0.8842,
  },
  detailedMetrics: {
    grossProfit: 5400,
    grossLoss: 1800,
    profitFactor: 3.0,
    winRate: 68.5,
    sortinoRatio: 2.85,
    calmarRatio: 1.95,
    expectancy: 120.5,
    winLossRatio: 2.2,
    averageWin: 250,
    averageLoss: 110,
    largestWin: 850,
    largestLoss: -320,
    maxConsecutiveWins: 5,
    maxConsecutiveLosses: 2,
  },
  trades: [
    {
      ticket: 1001,
      symbol: 'BTC/USDT',
      side: 'Buy',
      volume: 0.5,
      openPrice: 65000,
      openTime: '2026-10-10T12:00:00Z',
      closePrice: 65500,
      closeTime: '2026-10-10T12:30:00Z',
      profit: 250,
      returnPct: 0.77,
      commission: 1.5,
      swap: 0,
      exitReason: 'TakeProfit',
    },
  ],
  generationProgress: [
    {
      generation: 1,
      bestFitness: 0.45,
      averageFitness: 0.32,
      diversity: 0.85,
    },
  ],
  equityCurve: [
    { timestamp: '2026-10-10T12:00:00Z', balance: 100000, equity: 100000, drawdownPct: 0.0 },
    { timestamp: '2026-10-10T12:30:00Z', balance: 100250, equity: 100250, drawdownPct: 0.0 },
  ],
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/reports/run-report-01',
}));

vi.mock('@/lib/api-client', () => ({
  getApiClient: () => ({
    GET: vi.fn().mockImplementation((path: string, options?: any) => {
      const targetId = options?.params?.path?.runId;
      if (path.includes('100b05e8') || targetId?.includes('100b05e8')) {
        return Promise.resolve({ data: mockGranularReport, error: null });
      }
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

    const cancelBtn = screen.getByRole('button', { name: /^cancel$/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByText('Submit Final Run Metrics')).not.toBeInTheDocument();
  });

  it('renders granular institutional metrics, winning DNA, and GA progression without throwing', async () => {
    render(
      <ToastProvider>
        <RunReportContent runId="100b05e8-c826-4eba-9159-d3222788da04" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Winning Strategy DNA Specification')).toBeInTheDocument();
      expect(screen.getByText(/Fitness: 0.8842/i)).toBeInTheDocument();
      expect(screen.getByText('Institutional Analytics & Risk Dimensions')).toBeInTheDocument();
      expect(screen.getByText('3.00')).toBeInTheDocument();
      expect(screen.getByText('68.5%')).toBeInTheDocument();
      expect(screen.getByText(/Genetic Generational Convergence/i)).toBeInTheDocument();
      expect(screen.getByText('OPEN GENERATIONS PROGRESSION GRID')).toBeInTheDocument();
    });
  });
});
