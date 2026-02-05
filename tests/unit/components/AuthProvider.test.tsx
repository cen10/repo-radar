import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/components/AuthProvider';
import { useAuth } from '@/hooks/use-auth';
import { CONNECTION_FAILED, UNEXPECTED_ERROR } from '@/constants/errorMessages';
import { createTestQueryClient } from '../../helpers/query-client';

// Importing mockSupabaseClient also executes vi.mock() for ../services/supabase
import {
  mockSupabaseClient,
  mockSession,
  setInitialSession,
  resetAuthMockState,
} from '../../mocks/supabase';
import type { GetSessionResponse } from '../../mocks/supabase';
import { mockLogger } from '../../mocks/logger';

// Mock github-token service to control stored token behavior
vi.mock('../../../src/services/github-token', () => ({
  storeAccessToken: vi.fn(),
  getStoredAccessToken: vi.fn(() => null),
  clearStoredAccessToken: vi.fn(),
}));

const TestComponent = () => {
  const { user, authLoading, providerToken, connectionError } = useAuth();
  return (
    <div>
      {authLoading && <span>Loading...</span>}
      {user && <span>User: {user.login}</span>}
      {providerToken && <span>Token exists</span>}
      {connectionError && <span>Connection Error: {connectionError}</span>}
      {!authLoading && !user && !connectionError && <span>No user</span>}
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

// Type assertion helper - narrows T | undefined to T, throws if undefined
function assertDefined<T>(val: T | undefined, name: string): asserts val is T {
  if (val === undefined) {
    throw new Error(`Expected ${name} to be defined after render`);
  }
}

// Wrapper component that provides QueryClient context
const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return {
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
    queryClient,
  };
};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAuthMockState();
    mockGetSession(); // Still needed for retryAuth tests
  });

  it('should provide auth context to children', async () => {
    renderWithQueryClient(
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
    renderWithQueryClient(
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

    renderWithQueryClient(
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
      setInitialSession(mockSession);

      renderWithQueryClient(
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
      const { unmount } = renderWithQueryClient(
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
    it('should handle connection errors from retryAuth API error', async () => {
      let retryAuth: (() => Promise<boolean>) | undefined;

      const TestRetryComponent = () => {
        const auth = useAuth();
        retryAuth = auth.retryAuth;
        return <TestComponent />;
      };

      renderWithQueryClient(
        <AuthProvider>
          <TestRetryComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Now trigger an error via retryAuth
      mockGetSession(null, new Error('Network error'));
      assertDefined(retryAuth, 'retryAuth');
      await retryAuth();

      await waitFor(() => {
        expect(
          screen.getByText(new RegExp(`connection error: ${CONNECTION_FAILED}`, 'i'))
        ).toBeInTheDocument();
      });
    });

    it('should handle unexpected errors during retryAuth', async () => {
      let retryAuth: (() => Promise<boolean>) | undefined;

      const TestRetryComponent = () => {
        const auth = useAuth();
        retryAuth = auth.retryAuth;
        return <TestComponent />;
      };

      renderWithQueryClient(
        <AuthProvider>
          <TestRetryComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Now trigger an unexpected error via retryAuth
      mockSupabaseClient.auth.getSession.mockRejectedValue(new Error('Unexpected error'));
      assertDefined(retryAuth, 'retryAuth');
      await retryAuth();

      await waitFor(() => {
        expect(
          screen.getByText(new RegExp(`connection error: ${UNEXPECTED_ERROR}`, 'i'))
        ).toBeInTheDocument();
      });
    });

    it('should clear connection error on successful auth state change', async () => {
      let retryAuth: (() => Promise<boolean>) | undefined;

      const TestRetryComponent = () => {
        const auth = useAuth();
        retryAuth = auth.retryAuth;
        return <TestComponent />;
      };

      renderWithQueryClient(
        <AuthProvider>
          <TestRetryComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Trigger connection error via retryAuth
      mockGetSession(null, new Error('Network error'));
      assertDefined(retryAuth, 'retryAuth');
      await retryAuth();

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
            <div>Loading: {auth.authLoading ? 'yes' : 'no'}</div>
          </div>
        );
      };

      renderWithQueryClient(
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
      setInitialSession(mockSession);

      renderWithQueryClient(
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

      renderWithQueryClient(
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
      assertDefined(retryAuth, 'retryAuth');
      await expect(retryAuth()).resolves.toBe(true);

      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalledTimes(1);
    });

    it('should clear connection error when retryAuth succeeds after a failure', async () => {
      let retryAuth: (() => Promise<boolean>) | undefined;

      const TestRetryComponent = () => {
        const auth = useAuth();
        retryAuth = auth.retryAuth;
        return (
          <div>
            <div>Connection: {auth.connectionError ?? 'none'}</div>
            <div>Loading: {auth.authLoading ? 'yes' : 'no'}</div>
          </div>
        );
      };

      renderWithQueryClient(
        <AuthProvider>
          <TestRetryComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/loading: no/i)).toBeInTheDocument();
      });

      // First retryAuth call - trigger error
      mockGetSessionOnce(null, new Error('Network error'));
      assertDefined(retryAuth, 'retryAuth');
      await retryAuth();

      await waitFor(() => {
        expect(screen.getByText(new RegExp(CONNECTION_FAILED, 'i'))).toBeInTheDocument();
      });

      // Second retryAuth call - success
      mockGetSessionOnce();
      await retryAuth();

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

      renderWithQueryClient(
        <AuthProvider>
          <TestMethodComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(typeof signInWithGitHub).toBe('function');
      });

      assertDefined(signInWithGitHub, 'signInWithGitHub');
      await expect(signInWithGitHub()).rejects.toThrow('OAuth failed');
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

      renderWithQueryClient(
        <AuthProvider>
          <TestMethodComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(typeof signOut).toBe('function');
      });

      assertDefined(signOut, 'signOut');
      await expect(signOut()).rejects.toThrow('Sign out failed');
    });

    it('should clear React Query cache on signOut', async () => {
      let signOut: (() => Promise<void>) | undefined;

      const TestMethodComponent = () => {
        const auth = useAuth();
        signOut = auth.signOut;
        return null;
      };

      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const { queryClient } = renderWithQueryClient(
        <AuthProvider>
          <TestMethodComponent />
        </AuthProvider>
      );

      // Spy on the clear method
      const clearSpy = vi.spyOn(queryClient, 'clear');

      await waitFor(() => {
        expect(typeof signOut).toBe('function');
      });

      assertDefined(signOut, 'signOut');
      await signOut();

      expect(clearSpy).toHaveBeenCalledTimes(1);
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

      renderWithQueryClient(
        <AuthProvider>
          <TestMethodComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(typeof signInWithGitHub).toBe('function');
      });

      assertDefined(signInWithGitHub, 'signInWithGitHub');
      await signInWithGitHub();

      expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'github',
        options: {
          scopes: 'read:user user:email public_repo',
          redirectTo: `${window.location.origin}/stars`,
        },
      });
    });
  });

  describe('User mapping fallback scenarios', () => {
    it('should fall back to email when user_name is missing and log a warning', async () => {
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

      setInitialSession(sessionWithoutUsername);

      renderWithQueryClient(
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
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'GitHub OAuth response missing user_name, falling back to email',
        expect.objectContaining({
          userId: mockSession.user.id,
          email: 'johndoe@example.com',
          userMetadata: expect.any(Object),
        })
      );
    });

    it('should fall back to email on auth state change when user_name is missing', async () => {
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

      renderWithQueryClient(
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
      expect(mockLogger.warn).toHaveBeenCalledWith(
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
        const { user, authLoading } = useAuth();
        return (
          <div>
            {authLoading && <span>Loading...</span>}
            {user && <span>Name: {user.name || 'none'}</span>}
          </div>
        );
      };

      setInitialSession(sessionWithNameOnly);

      renderWithQueryClient(
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
        const { user, authLoading } = useAuth();
        return (
          <div>
            {authLoading && <span>Loading...</span>}
            {user && <span>Name: {user.name || 'none'}</span>}
          </div>
        );
      };

      setInitialSession(sessionWithoutName);

      renderWithQueryClient(
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
        const { user, authLoading } = useAuth();
        return (
          <div>
            {authLoading && <span>Loading...</span>}
            {user && <span>Avatar: {user.avatar_url || 'empty'}</span>}
          </div>
        );
      };

      setInitialSession(sessionWithoutAvatar);

      renderWithQueryClient(
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
        const { user, authLoading } = useAuth();
        return (
          <div>
            {authLoading && <span>Loading...</span>}
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

      setInitialSession(sessionWithMinimalOptionalFields);

      renderWithQueryClient(
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
