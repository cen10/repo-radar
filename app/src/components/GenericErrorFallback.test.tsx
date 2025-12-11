import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from 'react-error-boundary';
import { GenericErrorFallback } from './GenericErrorFallback';

// Test component that throws an error
function ThrowError({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No Error</div>;
}

describe('GenericErrorFallback', () => {
  // Suppress console.error for these tests since we expect errors
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  it('should render the expected error message and action button', () => {
    render(
      <ErrorBoundary FallbackComponent={GenericErrorFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('should re-render the component when Try Again is clicked', async () => {
    const user = userEvent.setup();
    let shouldThrow = true;

    const TestComponent = () => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>Success on retry!</div>;
    };

    render(
      <ErrorBoundary FallbackComponent={GenericErrorFallback}>
        <TestComponent />
      </ErrorBoundary>
    );

    // Error fallback should be shown
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Flip the flag before clicking retry
    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));

    // Component successfully renders on retry
    await waitFor(() => {
      expect(screen.getByText('Success on retry!')).toBeInTheDocument();
    });
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  it('should show error details in development', () => {
    // Mock development environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary FallbackComponent={GenericErrorFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/error details \(development only\)/i)).toBeInTheDocument();

    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });
});
