import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Header } from './Header';
import { useAuth } from '../hooks/use-auth';
import { supabase } from '../services/supabase';
import { AuthError } from '@supabase/auth-js';
import type { AuthContextType } from '../contexts/auth-context';
import type { Session } from '@supabase/supabase-js';

vi.mock('../hooks/use-auth');
vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
    },
  },
}));

const mockUser = {
  id: '123',
  email: 'test@example.com',
  login: 'testuser',
  name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
};

const createMockAuthContext = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
  user: mockUser,
  session: {} as Session,
  loading: false,
  connectionError: null,
  signInWithGitHub: vi.fn(),
  signOut: vi.fn(),
  retryAuth: vi.fn(),
  ...overrides,
});

// Helper function to create properly typed AuthError mocks
// Following project guideline: Avoid 'as any', use real constructors for better type safety
function createMockAuthError(
  overrides: Partial<Pick<AuthError, 'message' | 'code' | 'status'>> = {}
): AuthError {
  const defaults = {
    message: 'Default error message',
    status: undefined,
    code: undefined,
  };
  const config = { ...defaults, ...overrides };

  // Use the real AuthError constructor to ensure instanceof checks work in production
  return new AuthError(config.message, config.status, config.code);
}

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no user is authenticated', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthContext({
        user: null,
        session: null,
      })
    );

    const { container } = render(<Header />);
    expect(container.firstChild).toBeNull();
  });

  it('displays user information when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext());

    render(<Header />);

    expect(screen.getByText('Repo Radar')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText(/@testuser/)).toBeInTheDocument();
    expect(screen.getByAltText("Test User's avatar")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('displays login when user has no name', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthContext({
        user: { ...mockUser, name: null },
      })
    );

    render(<Header />);

    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('displays handle when user has no email', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthContext({
        user: { ...mockUser, email: null },
      })
    );

    render(<Header />);

    expect(screen.getByText(/@testuser/)).toBeInTheDocument();
  });

  it('handles sign out successfully', async () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext());

    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    });

    render(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    expect(screen.getByText(/signing out/i)).toBeInTheDocument();
    expect(signOutButton).toBeDisabled();

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    });
  });

  it('resets loading state after successful sign out', async () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext());

    // Mock successful sign out with a delay to test loading state
    vi.mocked(supabase.auth.signOut).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
    );

    render(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    // Initially should be in loading state
    expect(screen.getByText(/signing out/i)).toBeInTheDocument();
    expect(signOutButton).toBeDisabled();

    // After successful sign out, loading state should be reset
    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
      // The button should not be disabled anymore (unless component unmounts due to user being null)
      // But since we're still mocking the user as present, the button should be enabled again
      expect(signOutButton).not.toBeDisabled();
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });
  });

  it('displays error message when sign out fails', async () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext());

    const errorMessage = 'Failed to sign out';
    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: createMockAuthError({ message: errorMessage }),
    });

    render(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(signOutButton).not.toBeDisabled();
  });

  it('handles sign out with unexpected error', async () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext());

    vi.mocked(supabase.auth.signOut).mockRejectedValue(new Error('Network error'));

    render(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    expect(signOutButton).not.toBeDisabled();
  });

  it('handles sign out with error without message', async () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext());

    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: createMockAuthError({ message: '' }),
    });

    render(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(screen.getByText(/error occurred during sign out/i)).toBeInTheDocument();
    });
  });

  it('does not display avatar when user has no avatar', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthContext({
        user: { ...mockUser, avatar_url: '' },
      })
    );

    render(<Header />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('displays error with proper accessibility attributes', async () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext());

    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: createMockAuthError({ message: 'Test error' }),
    });

    render(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
  });

  it('displays user-friendly message for network errors', async () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext());

    // Simulate network error with "Failed to fetch" message
    vi.mocked(supabase.auth.signOut).mockRejectedValue(new Error('Failed to fetch'));

    render(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(screen.getByText(/unable to sign out due to connection issues/i)).toBeInTheDocument();
      expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
    });
  });

  it('displays user-friendly message for NetworkError name', async () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext());

    // Simulate network error with NetworkError name
    const networkError = new Error('Some network issue');
    networkError.name = 'NetworkError';
    vi.mocked(supabase.auth.signOut).mockRejectedValue(networkError);

    render(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(screen.getByText(/unable to sign out due to connection issues/i)).toBeInTheDocument();
      expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
    });
  });
});
