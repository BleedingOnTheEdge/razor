import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ToastProvider, useToast } from '@/components/ui/toast';

function TestConsumer() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success('Success Title', 'Success Detail')}>Trigger Success</button>
      <button onClick={() => toast.error('Error Title', 'Error Detail')}>Trigger Error</button>
      <button onClick={() => toast.info('Info Title')}>Trigger Info</button>
    </div>
  );
}

describe('Toast Notification System', () => {
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

    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBeGreaterThanOrEqual(1);
  });

  it('allows manual dismissal of a toast', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Trigger Info'));
    expect(screen.getByText('Info Title')).toBeInTheDocument();

    const dismissBtn = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissBtn);

    expect(screen.queryByText('Info Title')).not.toBeInTheDocument();
  });
});
