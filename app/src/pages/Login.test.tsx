import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';
import type { User } from '../types';
import { LOGIN_FAILED } from '../constants/errorMessages';

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

      expect(screen.getByText(/repo radar/i)).toBeInTheDocument();
      expect(
        screen.getByText(
          /track star growth, releases, and issue activity across your starred repositories/i
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
        screen.getByText(/we'll access your starred repositories to show you personalized metrics/i)
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

      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
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
        expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
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

      expect(screen.getByText(/successfully logged in/i)).toBeInTheDocument();
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      expect(screen.getByText(/^testuser$/i)).toBeInTheDocument();
    });

    it('should display sign out button', () => {
      render(<Login />);

      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });

    it('should display informational message', () => {
      render(<Login />);

      expect(
        screen.getByText(
          /you're now connected to github\. ready to track your starred repositories!/i
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

      expect(screen.getByText(/signing out/i)).toBeInTheDocument();
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
        expect(screen.getByText(/sign out failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should not proceed with sign in when connection retry fails', async () => {
      const signInWithGitHub = vi.fn();
      const retryAuth = vi.fn().mockResolvedValue(undefined); // retryAuth doesn't throw, just sets state

      const authStateWithError = {
        user: null,
        loading: false,
        connectionError: 'Connection failed',
        signInWithGitHub,
        signOut: vi.fn(),
        retryAuth,
      };

      // Mock that connectionError persists after retry
      mockUseAuth.mockReturnValue(authStateWithError);

      const { rerender } = render(<Login />);

      const loginButton = screen.getByRole('button', { name: /try again/i });
      await userEvent.click(loginButton);

      // Force re-render to simulate state update
      rerender(<Login />);

      await waitFor(() => {
        expect(retryAuth).toHaveBeenCalled();
        expect(signInWithGitHub).not.toHaveBeenCalled(); // Should NOT be called when retry fails
      });
    });

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
        expect(screen.getByText(new RegExp(LOGIN_FAILED, 'i'))).toBeInTheDocument();
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
        expect(screen.getByText(new RegExp(LOGIN_FAILED, 'i'))).toBeInTheDocument();
      });
    });
  });
});
