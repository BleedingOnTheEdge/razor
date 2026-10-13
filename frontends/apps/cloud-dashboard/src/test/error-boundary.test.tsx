import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GlobalError from '@/app/error';

describe('Global Error Boundary', () => {
  it('renders fault message and allows retry reset', () => {
    const resetFn = vi.fn();
    const errorObj = new Error('Database connection failed');

    render(<GlobalError error={errorObj} reset={resetFn} />);

    expect(screen.getByText('Application Error Encounted')).toBeInTheDocument();
    expect(screen.getByText('Database connection failed')).toBeInTheDocument();

    const tryAgainBtn = screen.getByText('Try Again');
    fireEvent.click(tryAgainBtn);
    expect(resetFn).toHaveBeenCalledTimes(1);
  });
});
