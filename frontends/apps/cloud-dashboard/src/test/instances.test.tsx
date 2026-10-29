import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InstancesPage from '@/app/instances/page';
import PanelInstancesPage from '@/app/panel/instances/page';
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
  getApiBaseUrl: () => 'http://localhost:5000',
  getAuthHeaders: () => ({ Authorization: 'Bearer test' }),
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

describe('Panel Instances Page (Engine Fleet & Node Management)', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockInstances,
    });
  });

  it('renders Engine Fleet header and action buttons', async () => {
    render(
      <ToastProvider>
        <PanelInstancesPage />
      </ToastProvider>
    );

    expect(screen.getByText('Engine Fleet & Node Management')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register Engine/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Runner Guide/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('London Equities Alpha')).toBeInTheDocument();
      expect(screen.getByText('Tokyo FX Beta')).toBeInTheDocument();
    });
  });

  it('opens and closes registration modal from panel instances', async () => {
    render(
      <ToastProvider>
        <PanelInstancesPage />
      </ToastProvider>
    );

    const registerBtn = screen.getByRole('button', { name: /Register Engine/i });
    fireEvent.click(registerBtn);

    expect(screen.getByText('Register Engine Instance')).toBeInTheDocument();
    expect(screen.getByLabelText(/Human-Readable Name/i)).toBeInTheDocument();

    const cancelBtn = screen.getByText('✕ Cancel');
    fireEvent.click(cancelBtn);

    expect(screen.queryByText('Register Engine Instance')).not.toBeInTheDocument();
  });

  it('opens runner guide modal from panel instances', async () => {
    render(
      <ToastProvider>
        <PanelInstancesPage />
      </ToastProvider>
    );

    const guideBtn = screen.getByRole('button', { name: /Runner Guide/i });
    fireEvent.click(guideBtn);

    expect(screen.getByText(/Local Engine Runner & Instancing Guide/i)).toBeInTheDocument();
  });

  it('renders registration and guide action buttons on empty state', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(
      <ToastProvider>
        <PanelInstancesPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No Engines Found')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Register New Engine/i })).toBeInTheDocument();
  });
});
