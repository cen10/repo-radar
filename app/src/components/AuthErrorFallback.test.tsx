import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from 'react-error-boundary';
import { AuthErrorFallback } from './AuthErrorFallback';

// Test component that throws an error
function ThrowError({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No Error</div>;
}

describe('AuthErrorFallback', () => {
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  it('should render auth-specific error message', () => {
    render(
      <ErrorBoundary FallbackComponent={AuthErrorFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Authentication Error')).toBeInTheDocument();
    expect(screen.getByText(/We're having trouble with the login system/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get help/i })).toBeInTheDocument();
  });

  it('should show timestamp for support reference', () => {
    render(
      <ErrorBoundary FallbackComponent={AuthErrorFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/timestamp:/)).toBeInTheDocument();
  });

  it('should call resetErrorBoundary when Try Again is clicked', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();

    render(
      <ErrorBoundary FallbackComponent={AuthErrorFallback} onReset={onReset}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(onReset).toHaveBeenCalled();
  });
});
