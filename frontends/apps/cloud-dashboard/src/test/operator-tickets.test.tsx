import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OperatorTicketsPage from '@/app/panel/tickets/page';
import { ToastProvider } from '@/components/ui/toast';

const mockGet = vi.fn();
const mockPatch = vi.fn();
const mockPost = vi.fn();

vi.mock('@/lib/api-client', () => ({
  getApiClient: () => ({
    GET: mockGet,
    PATCH: mockPatch,
    POST: mockPost,
  }),
}));

const mockTickets = [
  {
    id: 'ticket-101',
    accountId: 'acc-1',
    userId: 'user-1',
    authorName: 'AlphaTrader',
    targetType: 'SystemManager',
    targetItemName: null,
    title: 'Critical: Latency spike detected on gateway',
    description: 'We observed a 50ms latency spike during New York open.',
    category: 'Incident',
    priority: 'Critical',
    status: 'Open',
    createdAt: '2026-10-12T00:00:00Z',
    updatedAt: '2026-10-12T00:00:00Z',
    messages: [],
  },
];

describe('Cloud Dashboard Operator Tickets Triage Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders triage queues, metrics counters, and allows status transitions', async () => {
    mockGet.mockResolvedValue({ data: mockTickets, error: null });
    mockPatch.mockResolvedValue({ data: null, error: null });

    render(
      <ToastProvider>
        <OperatorTicketsPage />
      </ToastProvider>
    );

    expect(screen.getByText('Operations Support & Incident Triage')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Critical: Latency spike detected on gateway')).toBeInTheDocument();
    });

    // Click on ticket to view details
    fireEvent.click(screen.getByText('Critical: Latency spike detected on gateway'));

    await waitFor(() => {
      expect(screen.getByText('Initial Description:')).toBeInTheDocument();
      expect(screen.getByText('Mark In-Progress')).toBeInTheDocument();
    });

    // Click Mark In-Progress
    fireEvent.click(screen.getByText('Mark In-Progress'));

    expect(mockPatch).toHaveBeenCalledWith(
      '/api/tickets/{ticketId}/status',
      expect.objectContaining({
        params: { path: { ticketId: 'ticket-101' } },
        body: { status: 'InProgress' },
      })
    );
  });
});
