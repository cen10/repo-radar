import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
  // Suppress console.error for these tests since we expect errors
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  it('should render auth-specific error message and timestamp for support reference', () => {
    render(
      <ErrorBoundary FallbackComponent={AuthErrorFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/authentication error/i)).toBeInTheDocument();
    expect(screen.getByText(/We're having trouble with the login system/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByText(/timestamp:/)).toBeInTheDocument();
  });

  it('should re-render the component when Try Again is clicked', async () => {
    const user = userEvent.setup();
    let shouldThrow = true;

    const TestComponent = () => {
      if (shouldThrow) {
        throw new Error('First attempt failed');
      }
      return <div>Success on retry!</div>;
    };

    render(
      <ErrorBoundary FallbackComponent={AuthErrorFallback}>
        <TestComponent />
      </ErrorBoundary>
    );

    // First render throws error, shows fallback
    expect(screen.getByText(/authentication error/i)).toBeInTheDocument();

    // Flip the flag before clicking retry
    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));

    // Component successfully renders on retry
    await waitFor(() => {
      expect(screen.getByText('Success on retry!')).toBeInTheDocument();
    });
    expect(screen.queryByText(/authentication error/i)).not.toBeInTheDocument();
  });
});
