import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Suspense } from 'react';
import { LineageContent } from '@/components/lineage/lineage-content';
import { ToastProvider } from '@/components/ui/toast';

const mockLineageTree = {
  run: {
    id: 'run-root-01',
    engineInstanceId: 'inst-001',
    kind: 'Backtest',
    status: 'Completed',
    parentRunId: null,
    relation: 'Original',
    continuity: 'Contiguous',
    forkPointStep: null,
    baseSeed: 42,
    isPartial: false,
    createdAt: '2026-10-10T12:00:00Z',
    metrics: { netProfit: 12500, sharpeRatio: 1.85 },
    interventionsCount: 0,
    gapsCount: 0,
  },
  children: [
    {
      run: {
        id: 'run-child-02',
        engineInstanceId: 'inst-001',
        kind: 'Backtest',
        status: 'Running',
        parentRunId: 'run-root-01',
        relation: 'Branched',
        continuity: 'Contiguous',
        forkPointStep: 150,
        baseSeed: 1337,
        isPartial: true,
        createdAt: '2026-10-11T12:00:00Z',
        metrics: { netProfit: 4200, sharpeRatio: 2.1 },
        interventionsCount: 1,
        gapsCount: 0,
      },
      children: [],
    },
  ],
};

vi.mock('@/lib/api-client', () => ({
  getApiClient: () => ({
    GET: vi.fn().mockImplementation((path: string) => {
      if (path.includes('/lineage')) {
        return Promise.resolve({ data: mockLineageTree, error: null });
      }
      return Promise.resolve({ data: null, error: 'Not found' });
    }),
    POST: vi.fn().mockResolvedValue({
      data: { id: 'run-child-03', relation: 'Branched' },
      error: null,
    }),
  }),
}));

describe('Lineage DAG Explorer', () => {
  it('renders root run and child branch checkpoint nodes', async () => {
    render(
      <ToastProvider>
        <LineageContent runId="run-root-01" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Execution Lineage & Reproduction')).toBeInTheDocument();
      expect(screen.getByText('Lineage Hierarchy')).toBeInTheDocument();
      expect(screen.getByText(/Forked at Step #150/i)).toBeInTheDocument();
      expect(screen.getByText(/1 Interventions Logged/i)).toBeInTheDocument();
    });
  });

  it('opens and closes branch modal', async () => {
    render(
      <ToastProvider>
        <LineageContent runId="run-root-01" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Branch at Checkpoint')).toBeInTheDocument();
    });

    const branchBtn = screen.getByText('Branch at Checkpoint');
    fireEvent.click(branchBtn);

    expect(screen.getByText('Branch Run at Checkpoint')).toBeInTheDocument();
    expect(screen.getByText('Fork Point Step Index')).toBeInTheDocument();

    const cancelBtn = screen.getByText('✕ Cancel');
    fireEvent.click(cancelBtn);

    expect(screen.queryByText('Branch Run at Checkpoint')).not.toBeInTheDocument();
  });
});
