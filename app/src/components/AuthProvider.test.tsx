import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthProvider';
import { useAuth } from '../hooks/use-auth';

// Importing mockSupabaseClient also executes vi.mock() for ../services/supabase
import { mockSupabaseClient } from '../test/mocks/supabase';

const TestComponent = () => {
  const { user, loading, session } = useAuth();
  return (
    <div>
      {loading && <span>Loading...</span>}
      {user && <span>User: {user.login}</span>}
      {session && <span>Session exists</span>}
      {!loading && !user && <span>No user</span>}
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

  it('should provide auth methods through context', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const TestMethodComponent = () => {
      const { signInWithGitHub, signOut } = useAuth();

      expect(typeof signInWithGitHub).toBe('function');
      expect(typeof signOut).toBe('function');

      return <div>Methods Available</div>;
    };

    render(<TestMethodComponent />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Methods Available')).toBeInTheDocument();
    });
  });
});
