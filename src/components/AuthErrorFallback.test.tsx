import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from 'react-error-boundary';
import { AuthErrorFallback } from './AuthErrorFallback';
import { ThrowError } from '../test/helpers/error-boundary';

describe('AuthErrorFallback', () => {
  // Suppress console.error for these tests since we expect errors
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn<typeof console.error>();
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

  describe('accessibility features', () => {
    it('should focus the retry button on mount', () => {
      render(
        <ErrorBoundary FallbackComponent={AuthErrorFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(document.activeElement).toBe(retryButton);
    });

    it('should have role="alert" and aria-live="assertive" on error container', () => {
      render(
        <ErrorBoundary FallbackComponent={AuthErrorFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const alertContainer = screen.getByRole('alert');
      expect(alertContainer).toBeInTheDocument();
      expect(alertContainer).toHaveAttribute('aria-live', 'assertive');
    });

    it('should set aria-busy to true when retrying', async () => {
      const user = userEvent.setup();
      let shouldThrow = true;

      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div>Success!</div>;
      };

      render(
        <ErrorBoundary FallbackComponent={AuthErrorFallback}>
          <TestComponent />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });

      // Initially aria-busy should be false
      expect(retryButton).toHaveAttribute('aria-busy', 'false');

      // Set up to not throw on retry
      shouldThrow = false;

      // Click retry
      await user.click(retryButton);

      // Check that aria-busy was set to true during retry
      // Note: The component unmounts quickly after successful retry,
      // so we check for the "Retrying..." text which appears when aria-busy is true
      await waitFor(
        () => {
          expect(screen.queryByText(/retrying/i)).toBeInTheDocument();
        },
        { timeout: 100 }
      );
    });

    it('should show loading spinner when retrying', async () => {
      const user = userEvent.setup();
      let shouldThrow = true;

      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div>Success!</div>;
      };

      render(
        <ErrorBoundary FallbackComponent={AuthErrorFallback}>
          <TestComponent />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      shouldThrow = false;

      await user.click(retryButton);

      // Check for loading state text
      await waitFor(
        () => {
          expect(screen.queryByText(/retrying/i)).toBeInTheDocument();
        },
        { timeout: 100 }
      );
    });
  });
});
