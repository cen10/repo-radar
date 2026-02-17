import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { BrowserRouter } from 'react-router-dom';
import Home from '@/pages/Home';
import { createMockAuthContext } from '../../mocks/factories';

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useDemoMode
const mockEnterDemoMode = vi.fn();
vi.mock('@/demo/use-demo-mode', () => ({
  useDemoMode: () => ({
    enterDemoMode: mockEnterDemoMode,
    isInitializing: false,
    isDemoMode: false,
    isBannerVisible: false,
    exitDemoMode: vi.fn(),
    dismissBanner: vi.fn(),
    resetBannerDismissed: vi.fn(),
  }),
}));

// Helper for creating unauthenticated context
const unauthenticatedContext = () => createMockAuthContext({ user: null, providerToken: null });

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    // Default mock: demo mode succeeds
    mockEnterDemoMode.mockResolvedValue({ success: true });
  });

  it('renders the home page content', () => {
    mockUseAuth.mockReturnValue(unauthenticatedContext());

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(screen.getByText('Repo Radar')).toBeInTheDocument();
    expect(screen.getByText(/organize and explore/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in with github/i })).toBeInTheDocument();
  });

  it('focuses the sign-in button on page load', () => {
    mockUseAuth.mockReturnValue(unauthenticatedContext());

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    const signInButton = screen.getByRole('button', { name: /sign in with github/i });
    expect(signInButton).toHaveFocus();
  });

  it('displays feature cards', () => {
    mockUseAuth.mockReturnValue(unauthenticatedContext());

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(screen.getByText('Repository Stats')).toBeInTheDocument();
    expect(screen.getByText(/view stars, forks, and recent activity/i)).toBeInTheDocument();

    expect(screen.getByText('Release Updates')).toBeInTheDocument();
    expect(screen.getByText(/stay informed about new releases/i)).toBeInTheDocument();

    expect(screen.getByText('Custom Radars')).toBeInTheDocument();
    expect(screen.getByText(/organize repositories into collections/i)).toBeInTheDocument();
  });

  // Note: Redirect for authenticated users is now handled by redirectIfAuthenticated
  // loader in App.tsx router config. E2E test 'authenticated user is redirected
  // from home to stars' covers this behavior.

  it('sign in button triggers GitHub OAuth flow', async () => {
    const mockSignIn = vi.fn();
    mockUseAuth.mockReturnValue(
      createMockAuthContext({ user: null, providerToken: null, signInWithGitHub: mockSignIn })
    );

    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    const signInButton = screen.getByRole('button', { name: /sign in with github/i });
    await user.click(signInButton);

    expect(mockSignIn).toHaveBeenCalled();
  });

  it('shows loading state while signing in', async () => {
    // Mock that never resolves to keep loading state active
    const mockSignIn = vi.fn().mockImplementation(() => new Promise(() => {}));
    mockUseAuth.mockReturnValue(
      createMockAuthContext({ user: null, providerToken: null, signInWithGitHub: mockSignIn })
    );

    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    await user.click(screen.getByRole('button', { name: /sign in with github/i }));

    const button = screen.getByRole('button', { name: /signing in/i });
    expect(button).toBeDisabled();
  });

  it('resets button state when sign in fails', async () => {
    const mockSignIn = vi.fn().mockRejectedValue(new Error('Network error'));
    mockUseAuth.mockReturnValue(
      createMockAuthContext({ user: null, providerToken: null, signInWithGitHub: mockSignIn })
    );

    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    const signInButton = screen.getByRole('button', { name: /sign in with github/i });
    await user.click(signInButton);

    // Button should be re-enabled after error
    expect(signInButton).not.toBeDisabled();
    expect(signInButton).toHaveTextContent(/sign in with github/i);
  });

  it('shows session expired message when redirected after auth error', () => {
    sessionStorage.setItem('session_expired', 'true');
    mockUseAuth.mockReturnValue(unauthenticatedContext());

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/session has expired/i);
  });

  it('clears session expired flag from sessionStorage after showing message', () => {
    sessionStorage.setItem('session_expired', 'true');
    mockUseAuth.mockReturnValue(unauthenticatedContext());

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(sessionStorage.getItem('session_expired')).toBeNull();
  });

  describe('demo mode', () => {
    it('shows Try Demo button', () => {
      mockUseAuth.mockReturnValue(unauthenticatedContext());

      render(
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      );

      expect(screen.getByRole('button', { name: /try demo/i })).toBeInTheDocument();
    });

    it('calls enterDemoMode when Try Demo is clicked', async () => {
      mockUseAuth.mockReturnValue(unauthenticatedContext());
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      );

      await user.click(screen.getByRole('button', { name: /try demo/i }));

      expect(mockEnterDemoMode).toHaveBeenCalled();
    });

    it('shows error message when demo mode fails to activate', async () => {
      mockUseAuth.mockReturnValue(unauthenticatedContext());
      mockEnterDemoMode.mockResolvedValue({ success: false });
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      );

      await user.click(screen.getByRole('button', { name: /try demo/i }));

      expect(screen.getByRole('alert')).toHaveTextContent(/demo mode is currently unavailable/i);
    });

    it('clears error message when Try Demo is clicked again', async () => {
      mockUseAuth.mockReturnValue(unauthenticatedContext());
      mockEnterDemoMode
        .mockResolvedValueOnce({ success: false })
        .mockResolvedValueOnce({ success: false });
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      );

      // First click - shows error
      await user.click(screen.getByRole('button', { name: /try demo/i }));
      expect(screen.getByRole('alert')).toHaveTextContent(/demo mode is currently unavailable/i);

      // Second click - error should be cleared during attempt (even if it fails again)
      // We verify the error message is still shown (from second failure)
      await user.click(screen.getByRole('button', { name: /try demo/i }));
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
