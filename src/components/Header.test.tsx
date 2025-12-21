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

    expect(screen.getByText(/repo radar/i)).toBeInTheDocument();
    expect(screen.getByText(/test user/i)).toBeInTheDocument();
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

    expect(screen.getByText(/^testuser$/)).toBeInTheDocument();
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
      expect(signOutButton).not.toBeDisabled();
      expect(screen.getByText(/sign out/i)).toBeInTheDocument();
    });
  });

  it('displays error message when sign out fails', async () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext());

    const errorMessage = 'Failed to sign out';
    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: new AuthError(errorMessage),
    });

    render(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to sign out/i)).toBeInTheDocument();
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
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    expect(signOutButton).not.toBeDisabled();
  });

  it('handles sign out with error without message', async () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext());

    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: new AuthError(''),
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
      error: new AuthError('Test error'),
    });

    render(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
      expect(screen.getByText(/test error/i)).toBeInTheDocument();
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
