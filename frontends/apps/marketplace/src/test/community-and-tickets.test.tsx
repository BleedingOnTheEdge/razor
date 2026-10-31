import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CommunityPage from '@/app/community/page';
import TicketsPage from '@/app/tickets/page';
import { ToastProvider } from '@/components/ui/toast';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/lib/api-client', () => ({
  getApiClient: () => ({
    GET: mockGet,
    POST: mockPost,
  }),
}));

const mockThreads = [
  {
    id: 'thread-1',
    title: 'Zero-Allocation Hook Plugins for Sub-Microsecond Interception',
    category: 'Additives',
    authorName: 'LowLatencyEngineer',
    authorBadge: 'Verified Dev',
    content: 'When authoring IHookCapability extensions, ensure your interceptors avoid heap allocations on the hot path.',
    upvotes: 42,
    repliesCount: 2,
    createdAt: '2026-10-12T00:00:00Z',
    replies: [],
  },
];

const mockTickets = [
  {
    id: 'ticket-1',
    accountId: 'acc-1',
    userId: 'user-1',
    authorName: 'DevTrader',
    targetType: 'SystemManager',
    targetItemName: null,
    title: 'Dedicated compute capacity requested',
    description: 'We need ultra-low latency co-location in EU-Central.',
    category: 'Incident',
    priority: 'High',
    status: 'Open',
    createdAt: '2026-10-12T00:00:00Z',
    updatedAt: '2026-10-12T00:00:00Z',
    messages: [],
  },
];

const mockUser = {
  userId: 'user-1',
  accountId: 'acc-1',
  userName: 'dev-operator',
  accountName: 'dev-operator-Workspace',
  role: 'Developer',
  subscriptionTier: 'Free',
  maxInstances: 1,
  canManageFleet: false,
  canExecuteLive: false,
  canPublishMarketplace: true,
  createdAt: '2026-10-10T00:00:00Z',
};

describe('Marketplace Community and Ticketing Views', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders community forum with discussion threads and allows upvoting', async () => {
    mockGet.mockResolvedValueOnce({ data: mockThreads, error: null });
    mockPost.mockResolvedValueOnce({ data: { upvotes: 43 }, error: null });

    render(
      <ToastProvider>
        <CommunityPage />
      </ToastProvider>
    );

    expect(screen.getByText('Additives, Indicators & Strategy Discussions')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Zero-Allocation Hook Plugins for Sub-Microsecond Interception')).toBeInTheDocument();
      expect(screen.getByText('LowLatencyEngineer')).toBeInTheDocument();
    });

    const upvoteButton = screen.getByLabelText('Upvote discussion');
    await act(async () => { fireEvent.click(upvoteButton); });

    expect(mockPost).toHaveBeenCalledWith(
      '/api/community/threads/{threadId}/upvote',
      expect.objectContaining({ params: { path: { threadId: 'thread-1' } } })
    );
  });

  it('renders support ticketing center with ticket list and selection', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/users/me') return Promise.resolve({ data: mockUser, error: null });
      if (url === '/api/tickets') return Promise.resolve({ data: mockTickets, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    render(
      <ToastProvider>
        <TicketsPage />
      </ToastProvider>
    );

    expect(screen.getByText('Unified Ticketing Center')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Dedicated compute capacity requested')).toBeInTheDocument();
    });

    const ticketItem = screen.getByText('Dedicated compute capacity requested');
    fireEvent.click(ticketItem);

    await waitFor(() => {
      expect(screen.getAllByText('We need ultra-low latency co-location in EU-Central.').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByPlaceholderText('Type your response to the support team or developer...')).toBeInTheDocument();
    });
  });
});
