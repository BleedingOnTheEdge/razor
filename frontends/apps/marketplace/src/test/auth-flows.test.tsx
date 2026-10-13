import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MarketplaceLoginPage from '@/app/login/page';
import RegisterPage from '@/app/register/page';
import { AuthProvider } from '@/context/auth-context';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/login',
}));

const mockPost = vi.fn();
vi.mock('@/lib/api-client', () => ({
  getApiClient: () => ({
    POST: mockPost,
    GET: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
}));

describe('Marketplace Auth Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders login page with quick demo options', () => {
    render(
      <AuthProvider>
        <MarketplaceLoginPage />
      </AuthProvider>
    );

    expect(screen.getByText('Sign In to Razor')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. algo-developer')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  it('performs registration successfully', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        token: 'dev-token-999',
        user: {
          userId: 'usr-new',
          accountId: 'acc-new',
          userName: 'new_quant',
          accountName: 'QuantDesk Alpha',
          role: 'Developer',
          subscriptionTier: 'Pro',
          maxInstances: 5,
          canManageFleet: false,
          canExecuteLive: true,
          canPublishMarketplace: true,
          createdAt: new Date().toISOString(),
        },
      },
      error: null,
    });

    render(
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    );

    expect(screen.getByText('Create Razor Account')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('e.g. quantum-hedge'), {
      target: { value: 'new_quant' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••••••'), {
      target: { value: 'mypassword123' },
    });

    fireEvent.click(screen.getByText('Create Account'));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/auth/register',
        expect.objectContaining({
          body: expect.objectContaining({
            userName: 'new_quant',
            password: 'mypassword123',
          }),
        })
      );
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});
