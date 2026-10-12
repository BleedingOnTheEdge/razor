import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

// Mock usePathname from next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/instances',
}));

// Mock useSseStream hook
vi.mock('@/hooks/use-sse-stream', () => ({
  useSseStream: () => ({
    isConnected: true,
    events: [],
    error: null,
  }),
}));

describe('Layout Navigation Components', () => {
  it('renders Header with connected SSE indicator', () => {
    render(<Header />);
    expect(screen.getByText('Razor Operator Dashboard')).toBeInTheDocument();
    expect(screen.getByText('SSE LIVE STREAM')).toBeInTheDocument();
  });

  it('renders Sidebar with system links', () => {
    render(<Sidebar />);
    expect(screen.getByText('RAZOR CLOUD')).toBeInTheDocument();
    expect(screen.getByText('System Overview')).toBeInTheDocument();
    expect(screen.getByText('Engine Fleet')).toBeInTheDocument();
    expect(screen.getByText('Flow Runs & Lineage')).toBeInTheDocument();
    expect(screen.getByText('Marketplace')).toBeInTheDocument();
  });
});
