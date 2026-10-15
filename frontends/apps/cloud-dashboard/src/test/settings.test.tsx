import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsPage from '@/app/settings/page';
import { ToastProvider } from '@/components/ui/toast';
import * as AuthContextModule from '@/context/auth-context';

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings',
}));

describe('SettingsPage Role Permissions & Apple Design Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders restricted access notice for Trader or Developer role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        userId: 'usr-trader-1',
        accountId: 'acc-1',
        userName: 'trader-dan',
        accountName: 'Trading Desk',
        role: 'Trader',
        subscriptionTier: 'Pro',
        maxInstances: 5,
        canManageFleet: false,
        canExecuteLive: true,
        canPublishMarketplace: false,
        canAdministerCluster: false,
        createdAt: new Date().toISOString(),
      },
      token: 'token-123',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      quickDemoLogin: vi.fn(),
    });

    render(
      <ToastProvider>
        <SettingsPage />
      </ToastProvider>
    );

    expect(screen.getByText(/Restricted Access • Administrator & Operator Only/i)).toBeInTheDocument();
    expect(screen.getByText('Trader')).toBeInTheDocument();
    expect(screen.getByText('Manage Personal Profile')).toBeInTheDocument();
  });

  it('renders operator view with operational controls editable and cluster governance locked', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        userId: 'usr-operator-1',
        accountId: 'acc-2',
        userName: 'op-sarah',
        accountName: 'Fleet Operations',
        role: 'Operator',
        subscriptionTier: 'Enterprise',
        maxInstances: 10,
        canManageFleet: true,
        canExecuteLive: true,
        canPublishMarketplace: false,
        canAdministerCluster: false,
        createdAt: new Date().toISOString(),
      },
      token: 'token-op',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      quickDemoLogin: vi.fn(),
    });

    render(
      <ToastProvider>
        <SettingsPage />
      </ToastProvider>
    );

    expect(screen.getByText('Operator Fleet View')).toBeInTheDocument();
    expect(screen.getByText(/Locked • Admin Role Required/i)).toBeInTheDocument();
    expect(screen.getByText('Save Fleet Preferences')).toBeInTheDocument();

    // Commission input should be disabled for operator
    const commissionInput = screen.getByDisplayValue('2.5');
    expect(commissionInput).toBeDisabled();
  });

  it('renders admin full control view with editable cluster governance', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        userId: 'usr-admin-1',
        accountId: 'acc-admin',
        userName: 'superadmin',
        accountName: 'Cluster Root',
        role: 'SuperAdmin',
        subscriptionTier: 'Enterprise',
        maxInstances: 100,
        canManageFleet: true,
        canExecuteLive: true,
        canPublishMarketplace: true,
        canAdministerCluster: true,
        createdAt: new Date().toISOString(),
      },
      token: 'token-admin',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      quickDemoLogin: vi.fn(),
    });

    render(
      <ToastProvider>
        <SettingsPage />
      </ToastProvider>
    );

    expect(screen.getByText('SuperAdmin Full Control')).toBeInTheDocument();
    expect(screen.getByText('Admin Unlocked')).toBeInTheDocument();
    expect(screen.getByText('Open Cluster Governance')).toBeInTheDocument();
    expect(screen.getByText('Save All Preferences')).toBeInTheDocument();

    // Commission input should be enabled for admin
    const commissionInput = screen.getByDisplayValue('2.5');
    expect(commissionInput).not.toBeDisabled();

    // Saving preferences
    fireEvent.click(screen.getByText('Save All Preferences'));
    expect(localStorage.getItem('razor_setting_fee')).toBe('2.5');
  });
});
