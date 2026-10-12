import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { InstanceDetailContent } from '@/components/instances/instance-detail-content';
import { ToastProvider } from '@/components/ui/toast';

const mockInstance = {
  instanceId: 'inst-test-01',
  accountId: 'acc-1',
  licenseId: 'lic-1',
  engineId: 'engine-tokyo-01',
  name: 'Tokyo Engine Prime',
  status: 'Active',
  createdAt: '2026-10-10T12:00:00Z',
  lastSeenAt: '2026-10-12T12:00:00Z',
  isConnected: true,
  activeSelections: {
    adapter: 'BinanceFuturesAdapter',
    strategy: 'TrendFollowerV2',
    neuralNetwork: null,
    hookPlugins: ['RiskGuardHook'],
  },
  manifest: [
    { kind: 'Adapter', name: 'BinanceFuturesAdapter', reportedAt: '2026-10-10T12:00:00Z' },
    { kind: 'Strategy', name: 'TrendFollowerV2', reportedAt: '2026-10-10T12:00:00Z' },
    { kind: 'Strategy', name: 'MeanReversionV1', reportedAt: '2026-10-10T12:00:00Z' },
  ],
};

const mockCommands = [
  {
    commandId: 'cmd-01',
    numericCommandId: 1001,
    commandType: 'Ping',
    correlationId: 'corr-01',
    status: 'Completed',
    submittedAt: '2026-10-12T12:05:00Z',
  },
];

vi.mock('@/lib/api-client', () => ({
  getApiClient: () => ({
    GET: vi.fn().mockImplementation((path: string) => {
      if (path.includes('/commands')) {
        return Promise.resolve({ data: mockCommands, error: null });
      }
      return Promise.resolve({ data: mockInstance, error: null });
    }),
    POST: vi.fn().mockResolvedValue({
      data: { commandId: 'cmd-new', correlationId: 'corr-new', status: 'Dispatched', delivered: true },
      error: null,
    }),
    PUT: vi.fn().mockResolvedValue({
      data: {
        activeSelections: { ...mockInstance.activeSelections, strategy: 'MeanReversionV1' },
      },
      error: null,
    }),
  }),
}));

describe('InstanceDetailContent Component', () => {
  it('renders active slots, manifest, and command history', async () => {
    render(
      <ToastProvider>
        <InstanceDetailContent instanceId="inst-test-01" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Tokyo Engine Prime')).toBeInTheDocument();
      expect(screen.getAllByText('BinanceFuturesAdapter').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('TrendFollowerV2').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('MeanReversionV1')).toBeInTheDocument();
      expect(screen.getByText('#1001 Ping')).toBeInTheDocument();
    });
  });

  it('populates command form when a quick preset is clicked', async () => {
    render(
      <ToastProvider>
        <InstanceDetailContent instanceId="inst-test-01" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Tokyo Engine Prime')).toBeInTheDocument();
    });

    const softReloadBtn = screen.getByText('SoftReload');
    fireEvent.click(softReloadBtn);

    const typeInput = screen.getByPlaceholderText('Ping / SoftReload') as HTMLInputElement;
    expect(typeInput.value).toBe('SoftReload');
  });

  it('opens slot configuration modal and allows slot assignment', async () => {
    render(
      <ToastProvider>
        <InstanceDetailContent instanceId="inst-test-01" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Tokyo Engine Prime')).toBeInTheDocument();
    });

    const configSlotBtn = screen.getByText('Configure Slot');
    fireEvent.click(configSlotBtn);

    expect(screen.getByText('Configure Extension Slot')).toBeInTheDocument();

    const cancelBtn = screen.getByText('✕ Cancel');
    fireEvent.click(cancelBtn);

    expect(screen.queryByText('Configure Extension Slot')).not.toBeInTheDocument();
  });
});
