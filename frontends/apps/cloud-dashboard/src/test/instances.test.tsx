import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InstancesPage from '@/app/instances/page';
import { ToastProvider } from '@/components/ui/toast';

const mockInstances = [
  {
    instanceId: 'inst-001',
    accountId: 'acc-1',
    licenseId: 'lic-1',
    engineId: 'engine-london-01',
    name: 'London Equities Alpha',
    status: 'Active',
    createdAt: '2026-10-10T12:00:00Z',
    lastSeenAt: '2026-10-12T12:00:00Z',
    isConnected: true,
    manifestExtensionCount: 5,
  },
  {
    instanceId: 'inst-002',
    accountId: 'acc-1',
    licenseId: 'lic-1',
    engineId: 'engine-tokyo-02',
    name: 'Tokyo FX Beta',
    status: 'Pending',
    createdAt: '2026-10-11T12:00:00Z',
    lastSeenAt: null,
    isConnected: false,
    manifestExtensionCount: 2,
  },
];

vi.mock('@/lib/api-client', () => ({
  getApiClient: () => ({
    GET: vi.fn().mockImplementation((path: string) => {
      if (path === '/api/instances') {
        return Promise.resolve({ data: mockInstances, error: null });
      }
      return Promise.resolve({ data: null, error: 'Not found' });
    }),
    POST: vi.fn().mockResolvedValue({
      data: { instanceId: 'inst-new', engineId: 'engine-new', apiKey: 'sec_xyz123' },
      error: null,
    }),
  }),
}));

describe('Instances Page', () => {
  it('renders engine fleet directory and filters by search', async () => {
    render(
      <ToastProvider>
        <InstancesPage />
      </ToastProvider>
    );

    // Await fleet items
    await waitFor(() => {
      expect(screen.getByText('London Equities Alpha')).toBeInTheDocument();
      expect(screen.getByText('Tokyo FX Beta')).toBeInTheDocument();
    });

    expect(screen.getByText('2 engines')).toBeInTheDocument();
    expect(screen.getByText('1 active')).toBeInTheDocument();

    // Filter by search
    const searchInput = screen.getByPlaceholderText('Search by engine name, ID, or instance hash...');
    fireEvent.change(searchInput, { target: { value: 'Tokyo' } });

    expect(screen.getByText('Tokyo FX Beta')).toBeInTheDocument();
    expect(screen.queryByText('London Equities Alpha')).not.toBeInTheDocument();
  });

  it('opens and closes registration modal', async () => {
    render(
      <ToastProvider>
        <InstancesPage />
      </ToastProvider>
    );

    const openBtn = screen.getByText('Register New Engine');
    fireEvent.click(openBtn);

    expect(screen.getByText('Register Engine Instance')).toBeInTheDocument();
    expect(screen.getByLabelText(/Human-Readable Name/i)).toBeInTheDocument();

    const cancelBtn = screen.getByText('✕ Cancel');
    fireEvent.click(cancelBtn);

    expect(screen.queryByText('Register Engine Instance')).not.toBeInTheDocument();
  });
});
