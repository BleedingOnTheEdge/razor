import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ToastProvider, useToast } from '@/components/ui/toast';

function TestConsumer() {
  const { success, error, info } = useToast();
  return (
    <div>
      <button onClick={() => success('Success Title', 'Success Detail')}>Trigger Success</button>
      <button onClick={() => error('Error Title', 'Error Detail')}>Trigger Error</button>
      <button onClick={() => info('Info Title', 'Info Detail')}>Trigger Info</button>
    </div>
  );
}

describe('Marketplace Toast Notification System', () => {
  it('renders and displays toasts with accessible roles', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Trigger Success'));
    expect(screen.getByText('Success Title')).toBeInTheDocument();
    expect(screen.getByText('Success Detail')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Trigger Error'));
    expect(screen.getByText('Error Title')).toBeInTheDocument();
    expect(screen.getByText('Error Detail')).toBeInTheDocument();
  });

  it('allows manual dismissal of active toast', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Trigger Info'));
    expect(screen.getByText('Info Title')).toBeInTheDocument();

    const dismissButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissButton);

    expect(screen.queryByText('Info Title')).not.toBeInTheDocument();
  });
});
