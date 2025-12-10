import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthProvider';
import { useAuth } from '../hooks/use-auth';
import { CONNECTION_FAILED, UNEXPECTED_ERROR } from '../constants/errorMessages';

// Importing mockSupabaseClient also executes vi.mock() for ../services/supabase
import { mockSupabaseClient, mockSession } from '../test/mocks/supabase';

const TestComponent = () => {
  const { user, loading, session, connectionError } = useAuth();
  return (
    <div>
      {loading && <span>Loading...</span>}
      {user && <span>User: {user.login}</span>}
      {session && <span>Session exists</span>}
      {connectionError && <span>Connection Error: {connectionError}</span>}
      {!loading && !user && !connectionError && <span>No user</span>}
    </div>
  );
};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  it('should provide auth context to children', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('No user')).toBeInTheDocument();
  });

  it('should start with loading state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should provide auth methods through context', () => {
    let signInWithGitHub: (() => Promise<void>) | undefined;
    let signOut: (() => Promise<void>) | undefined;
    let retryAuth: (() => Promise<void>) | undefined;

    const TestMethodComponent = () => {
      const auth = useAuth();
      signInWithGitHub = auth.signInWithGitHub;
      signOut = auth.signOut;
      retryAuth = auth.retryAuth;
      return null;
    };

    render(
      <AuthProvider>
        <TestMethodComponent />
      </AuthProvider>
    );

    expect(typeof signInWithGitHub).toBe('function');
    expect(typeof signOut).toBe('function');
    expect(typeof retryAuth).toBe('function');
  });

  describe('Error Handling', () => {
    it('should handle connection errors from getSession API error', async () => {
      // Use 'as any' to bypass strict Supabase types for test mocking - we only need basic error structure
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Network error' }
      } as any);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByText(`Connection Error: ${CONNECTION_FAILED}`)).toBeInTheDocument();
      expect(screen.queryByText('No user')).not.toBeInTheDocument();
    });

    it('should handle unexpected errors during getSession', async () => {
      mockSupabaseClient.auth.getSession.mockRejectedValue(new Error('Unexpected error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByText(`Connection Error: ${UNEXPECTED_ERROR}`)).toBeInTheDocument();
    });

    it('should clear connection error on successful auth state change', async () => {
      // Start with connection error
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Network error' }
      } as any);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for connection error to appear
      await waitFor(() => {
        expect(screen.getByText(`Connection Error: ${CONNECTION_FAILED}`)).toBeInTheDocument();
      });

      // Simulate successful auth state change
      const authStateChangeCallback = mockSupabaseClient.auth.onAuthStateChange.mock.calls[0][0];
      authStateChangeCallback('SIGNED_IN', mockSession);

      await waitFor(() => {
        expect(screen.queryByText(/Connection Error/)).not.toBeInTheDocument();
        expect(screen.getByText('User: testuser')).toBeInTheDocument();
      });
    });

    it('should clear user state when session is null on initial load', async () => {
      // Mock getSession to return no session (e.g., expired session)
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const TestComponent = () => {
        const auth = useAuth();
        return (
          <div>
            <div>User: {auth.user ? auth.user.login : 'none'}</div>
            <div>Session: {auth.session ? 'active' : 'none'}</div>
            <div>Loading: {auth.loading ? 'yes' : 'no'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText('Loading: no')).toBeInTheDocument();
      });

      // Verify both user and session are null
      expect(screen.getByText('User: none')).toBeInTheDocument();
      expect(screen.getByText('Session: none')).toBeInTheDocument();
    });

    it('should provide retry functionality through retryAuth', async () => {
      let retryAuth: (() => Promise<void>) | undefined;

      const TestRetryComponent = () => {
        const auth = useAuth();
        retryAuth = auth.retryAuth;
        return <div>Retry Available</div>;
      };

      // Start with successful getSession
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      render(
        <AuthProvider>
          <TestRetryComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Retry Available')).toBeInTheDocument();
      });

      expect(typeof retryAuth).toBe('function');

      // Test that retryAuth calls getSession again
      mockSupabaseClient.auth.getSession.mockClear();
      await retryAuth!();

      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('Auth Methods Error Handling', () => {
    it('should throw error from signInWithGitHub when OAuth fails', async () => {
      let signInWithGitHub: (() => Promise<void>) | undefined;

      const TestMethodComponent = () => {
        const auth = useAuth();
        signInWithGitHub = auth.signInWithGitHub;
        return null;
      };

      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        data: {},
        error: { message: 'OAuth failed' }
      } as any);

      render(
        <AuthProvider>
          <TestMethodComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(typeof signInWithGitHub).toBe('function');
      });

      await expect(signInWithGitHub!()).rejects.toThrow('OAuth failed');
    });

    it('should throw error from signOut when logout fails', async () => {
      let signOut: (() => Promise<void>) | undefined;

      const TestMethodComponent = () => {
        const auth = useAuth();
        signOut = auth.signOut;
        return null;
      };

      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: 'Sign out failed' }
      } as any);

      render(
        <AuthProvider>
          <TestMethodComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(typeof signOut).toBe('function');
      });

      await expect(signOut!()).rejects.toThrow('Sign out failed');
    });

    it('should call signInWithOAuth with correct parameters', async () => {
      let signInWithGitHub: (() => Promise<void>) | undefined;

      const TestMethodComponent = () => {
        const auth = useAuth();
        signInWithGitHub = auth.signInWithGitHub;
        return null;
      };

      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        data: {},
        error: null,
      });

      render(
        <AuthProvider>
          <TestMethodComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(typeof signInWithGitHub).toBe('function');
      });

      await signInWithGitHub!();

      expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'github',
        options: {
          scopes: 'read:user user:email',
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
    });
  });
});
