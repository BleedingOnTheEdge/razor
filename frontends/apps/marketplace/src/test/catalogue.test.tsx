import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MarketplaceCataloguePage from '@/app/page';

const mockGet = vi.fn();

vi.mock('@/lib/api-client', () => ({
  getApiClient: () => ({
    GET: mockGet,
  }),
}));

const mockItems = [
  {
    id: 'item-1',
    name: 'BinanceFuturesDirect',
    kind: 'Adapter',
    version: '1.4.0',
    author: 'RazorCore',
    description: 'Zero-alloc WebSocket & REST gateway for Binance USD-M Futures.',
    price: 0,
    sdkVersion: '1.0.0',
    isCurated: true,
    downloadsCount: 1420,
    downloads: 1420,
    rating: 4.9,
    createdAt: '2026-10-10T00:00:00Z',
  },
  {
    id: 'item-2',
    name: 'OrderFlowImbalance',
    kind: 'Strategy',
    version: '2.1.0',
    author: 'AlphaResearch',
    description: 'High-frequency market-making strategy based on Level-3 order book imbalance.',
    price: 250,
    sdkVersion: '1.0.0',
    isCurated: false,
    downloadsCount: 310,
    downloads: 310,
    rating: 4.7,
    createdAt: '2026-10-11T00:00:00Z',
  },
];

describe('Marketplace Catalogue Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders extension items with verified badges, ratings, and prices', async () => {
    mockGet.mockResolvedValueOnce({ data: mockItems, error: null });

    render(<MarketplaceCataloguePage />);

    expect(screen.getByText('Extend Your Razor Trading Engine')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('BinanceFuturesDirect')).toBeInTheDocument();
      expect(screen.getByText('OrderFlowImbalance')).toBeInTheDocument();
    });

    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();
    expect(screen.getByText('Curated')).toBeInTheDocument();
    expect(screen.getByText('4.9')).toBeInTheDocument();
  });

  it('filters by category kind and search query', async () => {
    mockGet.mockResolvedValue({ data: mockItems, error: null });

    render(<MarketplaceCataloguePage />);

    await waitFor(() => {
      expect(screen.getByText('BinanceFuturesDirect')).toBeInTheDocument();
    });

    const strategyTab = screen.getByRole('tab', { name: 'Strategy' });
    fireEvent.click(strategyTab);

    expect(mockGet).toHaveBeenCalledWith('/api/marketplace/items', expect.objectContaining({
      params: expect.objectContaining({
        query: expect.objectContaining({ kind: 'Strategy' }),
      }),
    }));

    const searchInput = screen.getByPlaceholderText(/Search extensions/i);
    fireEvent.change(searchInput, { target: { value: 'Imbalance' } });

    expect(mockGet).toHaveBeenCalledWith('/api/marketplace/items', expect.objectContaining({
      params: expect.objectContaining({
        query: expect.objectContaining({ query: 'Imbalance' }),
      }),
    }));
  });
});
