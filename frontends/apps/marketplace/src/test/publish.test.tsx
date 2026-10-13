import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublishContent } from '@/components/publish/publish-content';
import { ToastProvider } from '@/components/ui/toast';

const mockPost = vi.fn();
const mockPush = vi.fn();

vi.mock('@/lib/api-client', () => ({
  getApiClient: () => ({
    POST: mockPost,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Marketplace Publisher Submission Portal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders publisher form fields and controls', () => {
    render(
      <ToastProvider>
        <PublishContent />
      </ToastProvider>
    );

    expect(screen.getByText('Publish Extension Listing')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/AdaptiveVolatilityBreakout/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/QuantDesk-Arbitrage/i)).toBeInTheDocument();
  });

  it('submits valid extension manifest and redirects to new listing', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        id: 'new-ext-999',
        name: 'KalmanFilterTrend',
        kind: 'Strategy',
        version: '1.0.0',
        author: 'MacroDesk',
      },
      error: null,
    });

    render(
      <ToastProvider>
        <PublishContent />
      </ToastProvider>
    );

    const nameInput = screen.getByPlaceholderText(/AdaptiveVolatilityBreakout/i);
    const authorInput = screen.getByPlaceholderText(/QuantDesk-Arbitrage/i);

    fireEvent.change(nameInput, { target: { value: 'KalmanFilterTrend' } });
    fireEvent.change(authorInput, { target: { value: 'MacroDesk' } });

    const submitBtn = screen.getByRole('button', { name: /Publish to Marketplace/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/marketplace/items', expect.objectContaining({
        body: expect.objectContaining({
          name: 'KalmanFilterTrend',
          author: 'MacroDesk',
          kind: 'Strategy',
        }),
      }));
      expect(mockPush).toHaveBeenCalledWith('/items/new-ext-999');
    });
  });
});
