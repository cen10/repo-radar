import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/use-auth';
import { renderWithRouter } from '../../helpers/render';
import { createMockUser, createMockAuthContext } from '../../mocks/factories';

vi.mock('@/hooks/use-auth');

const mockUser = createMockUser();

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no user is authenticated', () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext({ user: null, providerToken: null }));

    const { container } = renderWithRouter(<Header />);
    expect(container.firstChild).toBeNull();
  });

  it('displays user information when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext({ user: mockUser }));

    renderWithRouter(<Header />);

    expect(screen.getByText(/repo radar/i)).toBeInTheDocument();
    expect(screen.getByText(/test user/i)).toBeInTheDocument();
    expect(screen.getByText(/@testuser/)).toBeInTheDocument();
    expect(screen.getByAltText("Test User's avatar")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('displays login when user has no name', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthContext({ user: createMockUser({ name: null }) })
    );

    renderWithRouter(<Header />);

    expect(screen.getByText(/^testuser$/)).toBeInTheDocument();
  });

  it('displays handle when user has no email', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthContext({ user: createMockUser({ email: null }) })
    );

    renderWithRouter(<Header />);

    expect(screen.getByText(/@testuser/)).toBeInTheDocument();
  });

  it('handles sign out successfully', async () => {
    const mockSignOut = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthContext({ user: mockUser, signOut: mockSignOut })
    );

    renderWithRouter(<Header />);

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
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthContext({ user: mockUser, signOut: mockSignOut })
    );

    renderWithRouter(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to sign out/i)).toBeInTheDocument();
    });

    expect(signOutButton).not.toBeDisabled();
  });

  it('handles sign out with unexpected error', async () => {
    const mockSignOut = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthContext({ user: mockUser, signOut: mockSignOut })
    );

    renderWithRouter(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    expect(signOutButton).not.toBeDisabled();
  });

  it('handles sign out with error without message', async () => {
    const mockSignOut = vi.fn().mockRejectedValue(new Error(''));
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthContext({ user: mockUser, signOut: mockSignOut })
    );

    renderWithRouter(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(screen.getByText(/error occurred during sign out/i)).toBeInTheDocument();
    });
  });

  it('does not display avatar when user has no avatar', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthContext({ user: createMockUser({ avatar_url: '' }) })
    );

    renderWithRouter(<Header />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('displays error with proper accessibility attributes', async () => {
    const mockSignOut = vi.fn().mockRejectedValue(new Error('Test error'));
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthContext({ user: mockUser, signOut: mockSignOut })
    );

    renderWithRouter(<Header />);

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
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthContext({ user: mockUser, signOut: mockSignOut })
    );

    renderWithRouter(<Header />);

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
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthContext({ user: mockUser, signOut: mockSignOut })
    );

    renderWithRouter(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(screen.getByText(/unable to sign out due to connection issues/i)).toBeInTheDocument();
      expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
    });
  });

  it('returns focus to sign out button after error', async () => {
    const mockSignOut = vi.fn().mockRejectedValue(new Error('Sign out failed'));
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthContext({ user: mockUser, signOut: mockSignOut })
    );

    renderWithRouter(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(screen.getByText(/sign out failed/i)).toBeInTheDocument();
    });

    expect(signOutButton).toHaveFocus();
  });

  describe('Help menu', () => {
    it('hides tour link on mobile via CSS class', async () => {
      vi.mocked(useAuth).mockReturnValue(createMockAuthContext({ user: mockUser }));

      renderWithRouter(<Header />);

      // Open the help menu
      const helpButton = screen.getByRole('button', { name: /help/i });
      fireEvent.click(helpButton);

      // Find the tour link and verify its wrapper has the mobile-hiding class
      const tourLink = await screen.findByRole('button', { name: /take the onboarding tour/i });
      const tourLinkWrapper = tourLink.parentElement;
      expect(tourLinkWrapper).toHaveClass('hidden', 'lg:block');
    });
  });

  describe('Mobile menu button', () => {
    it('renders hamburger menu button when onMenuToggle is provided', () => {
      vi.mocked(useAuth).mockReturnValue(createMockAuthContext({ user: mockUser }));

      renderWithRouter(<Header onMenuToggle={() => {}} />);

      expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeInTheDocument();
    });

    it('does not render hamburger menu button when onMenuToggle is not provided', () => {
      vi.mocked(useAuth).mockReturnValue(createMockAuthContext({ user: mockUser }));

      renderWithRouter(<Header />);

      expect(
        screen.queryByRole('button', { name: /open navigation menu/i })
      ).not.toBeInTheDocument();
    });

    it('calls onMenuToggle when hamburger button is clicked', () => {
      vi.mocked(useAuth).mockReturnValue(createMockAuthContext({ user: mockUser }));
      const onMenuToggle = vi.fn();

      renderWithRouter(<Header onMenuToggle={onMenuToggle} />);

      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      fireEvent.click(menuButton);

      expect(onMenuToggle).toHaveBeenCalledTimes(1);
    });
  });
});
