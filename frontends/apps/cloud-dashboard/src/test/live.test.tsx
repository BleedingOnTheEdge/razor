import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LiveManagerContent, type OpenPosition } from '@/components/live/LiveManagerContent';
import { ToastProvider } from '@/components/ui/toast';
import type { TradeItemPayload } from '@/lib/api-client';

const mockInstances = [
  {
    instanceId: 'inst-live-01',
    accountId: 'acc-1',
    licenseId: 'lic-1',
    engineId: 'engine-tokyo-01',
    name: 'Tokyo Engine Prime',
    status: 'Active',
    createdAt: '2026-10-10T12:00:00Z',
    lastSeenAt: '2026-10-12T12:00:00Z',
    isConnected: true,
  },
];

const testPositions: OpenPosition[] = [
  {
    ticket: 90211,
    symbol: 'BTC/USDT',
    side: 'BUY',
    volume: 0.75,
    openPrice: 66200.0,
    markPrice: 67450.0,
    unrealizedPnl: 937.5,
    stopLoss: 64800.0,
    takeProfit: 69500.0,
    openTime: '2026-10-10T10:00:00Z',
  },
  {
    ticket: 90214,
    symbol: 'ETH/USDT',
    side: 'SELL',
    volume: 5.0,
    openPrice: 2640.0,
    markPrice: 2577.8,
    unrealizedPnl: 311.0,
    stopLoss: 2720.0,
    takeProfit: 2480.0,
    openTime: '2026-10-10T10:30:00Z',
  },
];

const testTrades: TradeItemPayload[] = [
  {
    ticket: 90198,
    symbol: 'SOL/USDT',
    side: 'BUY',
    volume: 25.0,
    openPrice: 154.2,
    closePrice: 161.8,
    openTime: '2026-10-10T08:00:00Z',
    closeTime: '2026-10-10T09:00:00Z',
    profit: 190.0,
    returnPct: 4.93,
    commission: 1.25,
    slippageTicks: 1,
    executionVenue: 'Binance Futures Direct',
    exitReason: 'TakeProfit',
    stopLoss: 149.5,
    takeProfit: 161.8,
  },
];

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: vi.fn().mockImplementation((key: string) => (key === 'instanceId' ? 'inst-live-01' : null)),
  }),
}));

const mockPost = vi.fn().mockResolvedValue({
  data: { commandId: 'cmd-1101', correlationId: 'corr-live-01', status: 'Dispatched' },
  error: null,
});

vi.mock('@/lib/api-client', () => ({
  getApiClient: () => ({
    GET: vi.fn().mockResolvedValue({ data: mockInstances, error: null }),
    POST: mockPost,
  }),
}));

describe('LiveManagerContent Component', () => {
  it('renders live trading overview, telemetry gauges, and clean idle state by default', async () => {
    render(
      <ToastProvider>
        <LiveManagerContent />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Live Trading & Flow Manager')).toBeInTheDocument();
      expect(screen.getByText('REAL-TIME VENUE')).toBeInTheDocument();
      expect(screen.getByText('Open Unrealized PnL')).toBeInTheDocument();
      expect(screen.getByText('Realized Daily PnL')).toBeInTheDocument();
      expect(screen.getByText(/Active Open Positions \(0\)/i)).toBeInTheDocument();
      expect(screen.getByText(/All capital currently in cash reserve/i)).toBeInTheDocument();
      expect(screen.getByText(/Live Executed Trade Fill Ledger \(0\)/i)).toBeInTheDocument();
    });
  });

  it('triggers emergency stop modal and executes command 2001', async () => {
    render(
      <ToastProvider>
        <LiveManagerContent />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('EMERGENCY STOP (2001)')).toBeInTheDocument();
    });

    // Open modal
    const emergencyBtn = screen.getByText('EMERGENCY STOP (2001)');
    fireEvent.click(emergencyBtn);

    expect(screen.getByText('CONFIRM EMERGENCY STOP')).toBeInTheDocument();
    expect(screen.getByText(/Command 2001 Immediate Kill Switch Dispatch/i)).toBeInTheDocument();

    // Confirm execution
    const confirmBtn = screen.getByText('EXECUTE EMERGENCY STOP');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/instances/{instanceId}/commands',
        expect.objectContaining({
          body: expect.objectContaining({
            commandId: 2001,
            commandType: 'EmergencyStop',
          }),
        })
      );
    });
  });

  it('opens dynamic risk controls modal and submits command 1107', async () => {
    render(
      <ToastProvider>
        <LiveManagerContent />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Risk Controls (1107)')).toBeInTheDocument();
    });

    const riskBtn = screen.getByText('Risk Controls (1107)');
    fireEvent.click(riskBtn);

    expect(screen.getByText('Dynamic Risk Limits (1107)')).toBeInTheDocument();
    expect(screen.getByText('Max Daily Drawdown (%)')).toBeInTheDocument();

    const submitBtn = screen.getByText('Apply Risk Controls');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/instances/{instanceId}/commands',
        expect.objectContaining({
          body: expect.objectContaining({
            commandId: 1107,
            commandType: 'SetLiveConfig',
          }),
        })
      );
    });
  });

  it('opens granular trade detail modal when an executed trade fill row is clicked', async () => {
    render(
      <ToastProvider>
        <LiveManagerContent initialTrades={testTrades} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('#90198')).toBeInTheDocument();
    });

    const tradeRow = screen.getByText('#90198');
    fireEvent.click(tradeRow.closest('tr') || tradeRow);

    await waitFor(() => {
      expect(screen.getByText('Ticket #90198')).toBeInTheDocument();
      expect(screen.getByText(/Execution Price Level Ladder/i)).toBeInTheDocument();
      expect(screen.getAllByText('Binance Futures Direct').length).toBeGreaterThan(0);
    });

    const closeBtn = screen.getByText('Close Telemetry');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Execution Price Level Ladder/i)).not.toBeInTheDocument();
    });
  });

  it('flattens and closes an open position upon clicking Flatten / Close', async () => {
    render(
      <ToastProvider>
        <LiveManagerContent initialPositions={testPositions} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Flatten / Close').length).toBe(2);
      expect(screen.getByText('Active Open Positions (2)')).toBeInTheDocument();
    });

    const flattenButtons = screen.getAllByText('Flatten / Close');
    fireEvent.click(flattenButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByText('Flatten / Close').length).toBe(1);
      expect(screen.getByText('Active Open Positions (1)')).toBeInTheDocument();
    });
  });
});
