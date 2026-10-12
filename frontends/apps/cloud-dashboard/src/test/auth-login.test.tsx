import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '@/app/login/page';
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
  }),
}));

describe('Cloud Dashboard LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders login form and quick demo accounts', () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    expect(screen.getByText('Operator Control Plane')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. dev-operator')).toBeInTheDocument();
    expect(screen.getByText('Quick Demo Accounts')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Operator')).toBeInTheDocument();
  });

  it('performs quick demo sign-in and navigates to dashboard', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        token: 'dev-cloud-management-key-3000',
        user: {
          userId: 'usr-1',
          accountId: 'acc-1',
          userName: 'dev-operator',
          accountName: 'dev-operator-Workspace',
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
        <LoginPage />
      </AuthProvider>
    );

    const operatorBtn = screen.getByText('Operator');
    fireEvent.click(operatorBtn);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          body: { userName: 'dev-operator', password: 'operator123' },
        })
      );
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});
