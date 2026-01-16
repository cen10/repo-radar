import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Header } from './Header';
import { useAuth } from '../hooks/use-auth';
import type { AuthContextType } from '../contexts/auth-context';

vi.mock('../hooks/use-auth');

const mockUser = {
  id: '123',
  email: 'test@example.com',
  login: 'testuser',
  name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
};

const createMockAuthContext = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
  user: mockUser,
  providerToken: 'test-github-token',
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
        providerToken: null,
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
    const mockSignOut = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext({ signOut: mockSignOut }));

    render(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    expect(screen.getByText(/signing out/i)).toBeInTheDocument();
    expect(signOutButton).toBeDisabled();

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(signOutButton).not.toBeDisabled();
      expect(screen.getByText(/sign out/i)).toBeInTheDocument();
    });
  });

  it('displays error message when sign out fails', async () => {
    const errorMessage = 'Failed to sign out';
    const mockSignOut = vi.fn().mockRejectedValue(new Error(errorMessage));
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext({ signOut: mockSignOut }));

    render(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to sign out/i)).toBeInTheDocument();
    });

    expect(signOutButton).not.toBeDisabled();
  });

  it('handles sign out with unexpected error', async () => {
    const mockSignOut = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext({ signOut: mockSignOut }));

    render(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    expect(signOutButton).not.toBeDisabled();
  });

  it('handles sign out with error without message', async () => {
    const mockSignOut = vi.fn().mockRejectedValue(new Error(''));
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext({ signOut: mockSignOut }));

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
    const mockSignOut = vi.fn().mockRejectedValue(new Error('Test error'));
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext({ signOut: mockSignOut }));

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
    // Simulate network error with "Failed to fetch" message
    const mockSignOut = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext({ signOut: mockSignOut }));

    render(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(screen.getByText(/unable to sign out due to connection issues/i)).toBeInTheDocument();
      expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
    });
  });

  it('displays user-friendly message for NetworkError name', async () => {
    // Simulate network error with NetworkError name
    const networkError = new Error('Some network issue');
    networkError.name = 'NetworkError';
    const mockSignOut = vi.fn().mockRejectedValue(networkError);
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext({ signOut: mockSignOut }));

    render(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(screen.getByText(/unable to sign out due to connection issues/i)).toBeInTheDocument();
      expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
    });
  });

  it('returns focus to sign out button after error', async () => {
    const mockSignOut = vi.fn().mockRejectedValue(new Error('Sign out failed'));
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext({ signOut: mockSignOut }));

    render(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(screen.getByText(/sign out failed/i)).toBeInTheDocument();
    });

    expect(signOutButton).toHaveFocus();
  });
});
