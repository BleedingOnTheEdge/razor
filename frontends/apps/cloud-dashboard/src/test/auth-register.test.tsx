import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RegisterPage from '@/app/register/page';
import { AuthProvider } from '@/context/auth-context';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/register',
}));

const mockPost = vi.fn();
vi.mock('@/lib/api-client', () => ({
  getApiClient: () => ({
    POST: mockPost,
  }),
}));

describe('Cloud Dashboard RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders register form, inputs, and role selectors', () => {
    render(
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    );

    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. quant-lead')).toBeInTheDocument();
    expect(screen.getByText('Operator')).toBeInTheDocument();
    expect(screen.getByText('Trader')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  it('shows error if passwords do not match', async () => {
    render(
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    );

    fireEvent.change(screen.getByPlaceholderText('e.g. quant-lead'), {
      target: { value: 'new-trader' },
    });
    const passwordInputs = screen.getAllByPlaceholderText('••••••••••••');
    fireEvent.change(passwordInputs[0], { target: { value: 'password123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'mismatch456' } });

    fireEvent.click(screen.getByRole('button', { name: /Register & Open Terminal/i }));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  it('successfully registers and redirects to /panel', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        token: 'new-reg-session-token',
        user: {
          userId: 'usr-new',
          accountId: 'acc-new',
          userName: 'quant-lead',
          accountName: 'Quant Research Lab',
          role: 'Operator',
          subscriptionTier: 'Free',
          maxInstances: 1,
          canManageFleet: true,
          canExecuteLive: false,
          canPublishMarketplace: false,
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

    fireEvent.change(screen.getByPlaceholderText('e.g. quant-lead'), {
      target: { value: 'quant-lead' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Alpha Quant Lab'), {
      target: { value: 'Quant Research Lab' },
    });
    const passwordInputs = screen.getAllByPlaceholderText('••••••••••••');
    fireEvent.change(passwordInputs[0], { target: { value: 'secret123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'secret123' } });

    fireEvent.click(screen.getByRole('button', { name: /Register & Open Terminal/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/auth/register',
        expect.objectContaining({
          body: {
            userName: 'quant-lead',
            password: 'secret123',
            accountName: 'Quant Research Lab',
            role: 'Operator',
            subscriptionTier: 'Free',
          },
        })
      );
      expect(mockPush).toHaveBeenCalledWith('/panel');
    });
  });
});
