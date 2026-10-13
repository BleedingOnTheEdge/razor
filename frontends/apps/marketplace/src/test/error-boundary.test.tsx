import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GlobalError from '@/app/error';

describe('Marketplace Global Error Boundary', () => {
  it('renders fault message and allows retry reset', () => {
    const reset = vi.fn();
    const testError = new Error('Database connection failed') as Error & { digest?: string };
    testError.digest = 'ERR_MKT_500';

    render(<GlobalError error={testError} reset={reset} />);

    expect(screen.getByText('Marketplace Service Exception')).toBeInTheDocument();
    expect(screen.getByText(/ERR_MKT_500/i)).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /Retry Action/i });
    fireEvent.click(retryButton);
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
