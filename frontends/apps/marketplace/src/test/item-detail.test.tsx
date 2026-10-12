import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ItemDetailContent } from '@/components/items/item-detail-content';
import { ToastProvider } from '@/components/ui/toast';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/lib/api-client', () => ({
  getApiClient: () => ({
    GET: mockGet,
    POST: mockPost,
  }),
}));

const mockItem = {
  id: 'item-101',
  name: 'VolArbNeuralModel',
  kind: 'NeuralNetwork',
  version: '2.0.1',
  author: 'DeepQuant',
  description: 'Deep ONNX inference network optimizing statistical arbitrage execution.',
  price: 199.99,
  sdkVersion: '1.0.0',
  isCurated: true,
  downloadsCount: 88,
  downloads: 88,
  rating: 4.8,
  createdAt: '2026-10-12T00:00:00Z',
};

const mockInstances = [
  {
    instanceId: 'inst-ny4-live-1',
    accountId: 'acc-operator-default',
    licenseId: 'lic-1',
    engineId: 'eng-1',
    name: 'NY4-Live-Engine-1',
    status: 'ACTIVE',
    createdAt: '2026-10-12T00:00:00Z',
    isConnected: true,
    manifestExtensionCount: 2,
  },
];

describe('Marketplace Item Detail & Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders extension specification, compatibility matrix, and pricing', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/api/marketplace/items/')) {
        return Promise.resolve({ data: mockItem, error: null });
      }
      if (url === '/api/instances') {
        return Promise.resolve({ data: mockInstances, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    render(
      <ToastProvider>
        <ItemDetailContent itemId="item-101" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('VolArbNeuralModel').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/DeepQuant/i)).toBeInTheDocument();
    });

    expect(screen.getByText('$199.99')).toBeInTheDocument();
    expect(screen.getByText('Razor Engine .NET 10 LTS')).toBeInTheDocument();
    expect(screen.getByText('NeuralNetwork Slot')).toBeInTheDocument();
  });

  it('acquires license and displays issued cryptographic key', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/api/marketplace/items/')) {
        return Promise.resolve({ data: mockItem, error: null });
      }
      if (url === '/api/instances') {
        return Promise.resolve({ data: mockInstances, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    mockPost.mockResolvedValueOnce({
      data: {
        id: 'acq-1',
        itemId: 'item-101',
        accountId: 'acc-operator-default',
        licenseKey: 'MKPL-A1B2C3D4E5F6G7H8',
        acquiredAt: '2026-10-12T12:00:00Z',
      },
      error: null,
    });

    render(
      <ToastProvider>
        <ItemDetailContent itemId="item-101" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('VolArbNeuralModel').length).toBeGreaterThanOrEqual(1);
    });

    const acquireButton = screen.getByRole('button', { name: /Acquire License & Deploy/i });
    fireEvent.click(acquireButton);

    await waitFor(() => {
      expect(screen.getByText('License Acquired Successfully!')).toBeInTheDocument();
      expect(screen.getByDisplayValue('MKPL-A1B2C3D4E5F6G7H8')).toBeInTheDocument();
    });

    expect(mockPost).toHaveBeenCalledWith('/api/marketplace/items/{itemId}/acquire', expect.objectContaining({
      params: { path: { itemId: 'item-101' } },
      body: expect.objectContaining({ accountId: 'acc-operator-default' }),
    }));
  });

  it('opens review modal and submits operator rating', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/api/marketplace/items/')) {
        return Promise.resolve({ data: mockItem, error: null });
      }
      if (url === '/api/instances') {
        return Promise.resolve({ data: mockInstances, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    mockPost.mockResolvedValueOnce({
      data: {
        itemId: 'item-101',
        newRating: 4.9,
        message: 'Review submitted successfully.',
      },
      error: null,
    });

    render(
      <ToastProvider>
        <ItemDetailContent itemId="item-101" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('VolArbNeuralModel').length).toBeGreaterThanOrEqual(1);
    });

    const openReviewBtn = screen.getByRole('button', { name: /Submit Review/i });
    fireEvent.click(openReviewBtn);

    expect(screen.getByText('Submit Operator Review')).toBeInTheDocument();

    const postReviewBtn = screen.getByRole('button', { name: /Post Review/i });
    fireEvent.click(postReviewBtn);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/marketplace/items/{itemId}/reviews', expect.objectContaining({
        params: { path: { itemId: 'item-101' } },
        body: expect.objectContaining({ rating: 5 }),
      }));
    });
  });
});
