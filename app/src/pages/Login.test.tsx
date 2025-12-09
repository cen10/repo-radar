import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';
import type { User } from '../types';

const mockUseAuth = vi.fn();

vi.mock('../hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUser: User = {
  id: 'user-123',
  login: 'testuser',
  name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  email: 'test@example.com',
};

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signInWithGitHub: vi.fn(),
      signOut: vi.fn(),
    });
  });

  describe('when user is not logged in', () => {
    it('should render login page with title and description', () => {
      render(<Login />);

      expect(screen.getByText('Repo Radar')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Track star growth, releases, and issue activity across your starred repositories'
        )
      ).toBeInTheDocument();
    });

    it('should render GitHub login button', () => {
      render(<Login />);

      const loginButton = screen.getByRole('button', { name: /continue with github/i });
      expect(loginButton).toBeInTheDocument();
    });

    it('should display helper text', () => {
      render(<Login />);

      expect(
        screen.getByText("We'll access your starred repositories to show you personalized metrics")
      ).toBeInTheDocument();
    });

    it('should call signInWithGitHub when login button is clicked', async () => {
      const signInWithGitHub = vi.fn();
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signInWithGitHub,
        signOut: vi.fn(),
      });

      render(<Login />);

      const loginButton = screen.getByRole('button', { name: /continue with github/i });
      await userEvent.click(loginButton);

      expect(signInWithGitHub).toHaveBeenCalled();
    });

    it('should show loading state when signing in', async () => {
      const signInWithGitHub = vi.fn(() => new Promise(() => {}));
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signInWithGitHub,
        signOut: vi.fn(),
      });

      render(<Login />);

      const loginButton = screen.getByRole('button', { name: /continue with github/i });
      await userEvent.click(loginButton);

      expect(screen.getByText('Signing in...')).toBeInTheDocument();
      expect(loginButton).toBeDisabled();
    });

    it('should display error message when login fails', async () => {
      const signInWithGitHub = vi.fn().mockRejectedValue(new Error('Authentication failed'));
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signInWithGitHub,
        signOut: vi.fn(),
      });

      render(<Login />);

      const loginButton = screen.getByRole('button', { name: /continue with github/i });
      await userEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Login Failed')).toBeInTheDocument();
        expect(screen.getByText('Authentication failed')).toBeInTheDocument();
      });
    });

    it('should show "Try Again" on button after error', async () => {
      const signInWithGitHub = vi.fn().mockRejectedValue(new Error('Authentication failed'));
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signInWithGitHub,
        signOut: vi.fn(),
      });

      render(<Login />);

      const loginButton = screen.getByRole('button', { name: /continue with github/i });
      await userEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('should disable button when loading prop is true', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        signInWithGitHub: vi.fn(),
        signOut: vi.fn(),
      });

      render(<Login />);

      const loginButton = screen.getByRole('button', { name: /continue with github/i });
      expect(loginButton).toBeDisabled();
    });
  });

  describe('when user is logged in', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        signInWithGitHub: vi.fn(),
        signOut: vi.fn(),
      });
    });

    it('should display welcome message with username', () => {
      render(<Login />);

      expect(screen.getByText('Successfully logged in!')).toBeInTheDocument();
      expect(screen.getByText(/Welcome back/)).toBeInTheDocument();
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    it('should display sign out button', () => {
      render(<Login />);

      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });

    it('should display informational message', () => {
      render(<Login />);

      expect(
        screen.getByText(
          "You're now connected to GitHub. Ready to track your starred repositories!"
        )
      ).toBeInTheDocument();
    });

    it('should call signOut when sign out button is clicked', async () => {
      const signOut = vi.fn();
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        signInWithGitHub: vi.fn(),
        signOut,
      });

      render(<Login />);

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      await userEvent.click(signOutButton);

      expect(signOut).toHaveBeenCalled();
    });

    it('should show loading state when signing out', async () => {
      const signOut = vi.fn(() => new Promise(() => {}));
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        signInWithGitHub: vi.fn(),
        signOut,
      });

      render(<Login />);

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      await userEvent.click(signOutButton);

      expect(screen.getByText('Signing out...')).toBeInTheDocument();
      expect(signOutButton).toBeDisabled();
    });

    it('should display error message when sign out fails', async () => {
      const signOut = vi.fn().mockRejectedValue(new Error('Sign out failed'));
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        signInWithGitHub: vi.fn(),
        signOut,
      });

      render(<Login />);

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      await userEvent.click(signOutButton);

      await waitFor(() => {
        expect(screen.getByText('Sign Out Failed')).toBeInTheDocument();
        expect(screen.getByText('Sign out failed')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle errors without message gracefully', async () => {
      const signInWithGitHub = vi.fn().mockRejectedValue(new Error(''));
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signInWithGitHub,
        signOut: vi.fn(),
      });

      render(<Login />);

      const loginButton = screen.getByRole('button', { name: /continue with github/i });
      await userEvent.click(loginButton);

      await waitFor(() => {
        expect(
          screen.getByText('An unexpected error occurred during login. Please try again.')
        ).toBeInTheDocument();
      });
    });

    it('should handle non-Error objects', async () => {
      const signInWithGitHub = vi.fn().mockRejectedValue('String error');
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signInWithGitHub,
        signOut: vi.fn(),
      });

      render(<Login />);

      const loginButton = screen.getByRole('button', { name: /continue with github/i });
      await userEvent.click(loginButton);

      await waitFor(() => {
        expect(
          screen.getByText('An unexpected error occurred during login. Please try again.')
        ).toBeInTheDocument();
      });
    });
  });
});
