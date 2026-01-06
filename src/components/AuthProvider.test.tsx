import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthProvider';
import { useAuth } from '../hooks/use-auth';
import { CONNECTION_FAILED, UNEXPECTED_ERROR } from '../constants/errorMessages';

// Importing mockSupabaseClient also executes vi.mock() for ../services/supabase
import { mockSupabaseClient, mockSession } from '../test/mocks/supabase';
import type { GetSessionResponse } from '../test/mocks/supabase';
import type { logger } from '../utils/logger';

// Mock the logger to silence test output
vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn<typeof logger.error>(),
    warn: vi.fn<typeof logger.warn>(),
    info: vi.fn<typeof logger.info>(),
    debug: vi.fn<typeof logger.debug>(),
  },
}));

const TestComponent = () => {
  const { user, loading, providerToken, connectionError } = useAuth();
  return (
    <div>
      {loading && <span>Loading...</span>}
      {user && <span>User: {user.login}</span>}
      {providerToken && <span>Token exists</span>}
      {connectionError && <span>Connection Error: {connectionError}</span>}
      {!loading && !user && !connectionError && <span>No user</span>}
    </div>
  );
};

// Stub getSession for all subsequent calls until changed.
const mockGetSession = (session: typeof mockSession | null = null, error: Error | null = null) => {
  const response: GetSessionResponse =
    error === null ? { data: { session }, error: null } : { data: { session: null }, error };

  mockSupabaseClient.auth.getSession.mockResolvedValue(response);
};

// Stub getSession for a single call (useful for sequential flows).
const mockGetSessionOnce = (
  session: typeof mockSession | null = null,
  error: Error | null = null
) => {
  const response: GetSessionResponse =
    error === null ? { data: { session }, error: null } : { data: { session: null }, error };

  mockSupabaseClient.auth.getSession.mockResolvedValueOnce(response);
};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession();
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

    expect(screen.getByText(/no user/i)).toBeInTheDocument();
  });

  it('should start with loading state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should provide auth methods through context', () => {
    let signInWithGitHub: (() => Promise<void>) | undefined;
    let signOut: (() => Promise<void>) | undefined;
    let retryAuth: (() => Promise<boolean>) | undefined;

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

  describe('Auth state changes', () => {
    it('should clear user and session on SIGNED_OUT event', async () => {
      mockGetSession(mockSession);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/user: testuser/i)).toBeInTheDocument();
      });

      const authStateChangeCallback = mockSupabaseClient.auth.onAuthStateChange.mock.calls[0][0];
      authStateChangeCallback('SIGNED_OUT', null);

      await waitFor(() => {
        expect(screen.queryByText(/user: testuser/i)).not.toBeInTheDocument();
        expect(screen.getByText(/no user/i)).toBeInTheDocument();
      });
    });

    it('should unsubscribe from auth changes on unmount', () => {
      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const unsubscribe =
        mockSupabaseClient.auth.onAuthStateChange.mock.results[0].value.data.subscription
          .unsubscribe;

      unmount();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors from getSession API error', async () => {
      mockGetSession(null, new Error('Network error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(
        screen.getByText(new RegExp(`connection error: ${CONNECTION_FAILED}`, 'i'))
      ).toBeInTheDocument();
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

      expect(
        screen.getByText(new RegExp(`connection error: ${UNEXPECTED_ERROR}`, 'i'))
      ).toBeInTheDocument();
    });

    it('should clear connection error on successful auth state change', async () => {
      // Start with connection error
      mockGetSession(null, new Error('Network error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for connection error to appear
      await waitFor(() => {
        expect(
          screen.getByText(new RegExp(`connection error: ${CONNECTION_FAILED}`, 'i'))
        ).toBeInTheDocument();
      });

      // Simulate successful auth state change
      const authStateChangeCallback = mockSupabaseClient.auth.onAuthStateChange.mock.calls[0][0];
      authStateChangeCallback('SIGNED_IN', mockSession);

      await waitFor(() => {
        expect(screen.queryByText(/Connection Error/)).not.toBeInTheDocument();
        expect(screen.getByText(/user: testuser/i)).toBeInTheDocument();
      });
    });

    it('should clear user state when session is null on initial load', async () => {
      // Mock getSession to return no session (e.g., expired session)
      mockGetSession();

      const TestComponent = () => {
        const auth = useAuth();
        return (
          <div>
            <div>User: {auth.user ? auth.user.login : 'none'}</div>
            <div>Token: {auth.providerToken ? 'active' : 'none'}</div>
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
        expect(screen.getByText(/loading: no/i)).toBeInTheDocument();
      });

      // Verify both user and providerToken are null
      expect(screen.getByText(/user: none/i)).toBeInTheDocument();
      expect(screen.getByText(/token: none/i)).toBeInTheDocument();
    });

    it('should set user and session when initial session exists', async () => {
      mockGetSession(mockSession);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/user: testuser/i)).toBeInTheDocument();
      expect(screen.getByText(/token exists/i)).toBeInTheDocument();
    });

    it('should provide retry functionality through retryAuth', async () => {
      let retryAuth: (() => Promise<boolean>) | undefined;

      const TestRetryComponent = () => {
        const auth = useAuth();
        retryAuth = auth.retryAuth;
        return <div>Retry Available</div>;
      };

      // Start with successful getSession
      mockGetSession();

      render(
        <AuthProvider>
          <TestRetryComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/retry available/i)).toBeInTheDocument();
      });

      expect(typeof retryAuth).toBe('function');

      // Test that retryAuth calls getSession again
      mockSupabaseClient.auth.getSession.mockClear();
      await expect(retryAuth!()).resolves.toBe(true);

      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalledTimes(1);
    });

    it('should clear connection error when retryAuth succeeds after a failure', async () => {
      mockGetSessionOnce(null, new Error('Network error'));
      mockGetSessionOnce();

      let retryAuth: (() => Promise<boolean>) | undefined;

      const TestRetryComponent = () => {
        const auth = useAuth();
        retryAuth = auth.retryAuth;
        return (
          <div>
            <div>Connection: {auth.connectionError ?? 'none'}</div>
            <div>Loading: {auth.loading ? 'yes' : 'no'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestRetryComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(new RegExp(CONNECTION_FAILED, 'i'))).toBeInTheDocument();
      });

      await retryAuth!();

      await waitFor(() => {
        expect(screen.getByText(/connection: none/i)).toBeInTheDocument();
        expect(screen.getByText(/loading: no/i)).toBeInTheDocument();
      });
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
        data: null,
        error: new Error('OAuth failed'),
      });

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
        error: new Error('Sign out failed'),
      });

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
          scopes: 'read:user user:email public_repo',
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
    });
  });

  describe('User mapping fallback scenarios', () => {
    it('should fall back to email when user_name is missing and log a warning', async () => {
      const { logger } = await import('../utils/logger');

      const sessionWithoutUsername = {
        ...mockSession,
        user: {
          ...mockSession.user,
          email: 'johndoe@example.com',
          user_metadata: {
            // No user_name field
            full_name: 'John Doe',
            avatar_url: 'https://example.com/avatar.jpg',
          },
        },
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: sessionWithoutUsername },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Should fall back to email as login
      expect(screen.getByText(/user: johndoe@example.com/i)).toBeInTheDocument();

      // Should log a warning with debugging context
      expect(logger.warn).toHaveBeenCalledWith(
        'GitHub OAuth response missing user_name, falling back to email',
        expect.objectContaining({
          userId: mockSession.user.id,
          email: 'johndoe@example.com',
          userMetadata: expect.any(Object),
        })
      );
    });

    it('should fall back to email on auth state change when user_name is missing', async () => {
      const { logger } = await import('../utils/logger');

      const sessionWithoutUsername = {
        ...mockSession,
        user: {
          ...mockSession.user,
          email: 'janedoe@example.com',
          user_metadata: {
            full_name: 'Jane Doe',
          },
        },
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Simulate auth state change with missing user_name
      const authStateChangeCallback = mockSupabaseClient.auth.onAuthStateChange.mock.calls[0][0];
      authStateChangeCallback('SIGNED_IN', sessionWithoutUsername);

      await waitFor(() => {
        expect(screen.getByText(/user: janedoe@example.com/i)).toBeInTheDocument();
      });

      // Should log a warning
      expect(logger.warn).toHaveBeenCalledWith(
        'GitHub OAuth response missing user_name, falling back to email',
        expect.objectContaining({
          email: 'janedoe@example.com',
        })
      );
    });

    it('should use name field when full_name is missing', async () => {
      const sessionWithNameOnly = {
        ...mockSession,
        user: {
          ...mockSession.user,
          user_metadata: {
            user_name: 'testuser',
            name: 'Fallback Name', // Using 'name' instead of 'full_name'
            avatar_url: 'https://example.com/avatar.jpg',
          },
        },
      };

      const TestComponentWithName = () => {
        const { user, loading } = useAuth();
        return (
          <div>
            {loading && <span>Loading...</span>}
            {user && <span>Name: {user.name || 'none'}</span>}
          </div>
        );
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: sessionWithNameOnly },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponentWithName />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/name: fallback name/i)).toBeInTheDocument();
    });

    it('should use null for name when both full_name and name are missing', async () => {
      const sessionWithoutName = {
        ...mockSession,
        user: {
          ...mockSession.user,
          user_metadata: {
            user_name: 'testuser',
            // No full_name or name field
            avatar_url: 'https://example.com/avatar.jpg',
          },
        },
      };

      const TestComponentWithName = () => {
        const { user, loading } = useAuth();
        return (
          <div>
            {loading && <span>Loading...</span>}
            {user && <span>Name: {user.name || 'none'}</span>}
          </div>
        );
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: sessionWithoutName },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponentWithName />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/name: none/i)).toBeInTheDocument();
    });

    it('should use empty string for avatar_url when missing', async () => {
      const sessionWithoutAvatar = {
        ...mockSession,
        user: {
          ...mockSession.user,
          user_metadata: {
            user_name: 'testuser',
            full_name: 'Test User',
            // No avatar_url field
          },
        },
      };

      const TestComponentWithAvatar = () => {
        const { user, loading } = useAuth();
        return (
          <div>
            {loading && <span>Loading...</span>}
            {user && <span>Avatar: {user.avatar_url || 'empty'}</span>}
          </div>
        );
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: sessionWithoutAvatar },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponentWithAvatar />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/avatar: empty/i)).toBeInTheDocument();
    });

    it('should handle optional field fallbacks when user_name is present', async () => {
      const sessionWithMinimalOptionalFields = {
        ...mockSession,
        user: {
          ...mockSession.user,
          email: undefined,
          user_metadata: {
            user_name: 'testuser', // Required field is present
            // No full_name, name, or avatar_url
          },
        },
      };

      const TestComponentFull = () => {
        const { user, loading } = useAuth();
        return (
          <div>
            {loading && <span>Loading...</span>}
            {user && (
              <>
                <span>Login: {user.login}</span>
                <span>Name: {user.name || 'none'}</span>
                <span>Avatar: {user.avatar_url || 'empty'}</span>
                <span>Email: {user.email || 'none'}</span>
              </>
            )}
          </div>
        );
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: sessionWithMinimalOptionalFields },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponentFull />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // User should be created with fallbacks for optional fields
      expect(screen.getByText(/login: testuser/i)).toBeInTheDocument();
      expect(screen.getByText(/name: none/i)).toBeInTheDocument();
      expect(screen.getByText(/avatar: empty/i)).toBeInTheDocument();
      expect(screen.getByText(/email: none/i)).toBeInTheDocument();
    });
  });
});
