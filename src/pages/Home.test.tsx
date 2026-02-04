import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { BrowserRouter } from 'react-router-dom';
import Home from './Home';
import { createMockUser, createMockAuthContext } from '../../tests/mocks/factories';

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUser = createMockUser();

// Helper for creating unauthenticated context
const unauthenticatedContext = () => createMockAuthContext({ user: null, providerToken: null });

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders the home page content', () => {
    mockUseAuth.mockReturnValue(unauthenticatedContext());

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(screen.getByText('Repo Radar')).toBeInTheDocument();
    expect(screen.getByText(/track momentum and activity/i)).toBeInTheDocument();
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

    expect(screen.getByText('Track Growth')).toBeInTheDocument();
    expect(screen.getByText(/monitor star counts/i)).toBeInTheDocument();

    expect(screen.getByText('Release Updates')).toBeInTheDocument();
    expect(screen.getByText(/stay informed about new releases/i)).toBeInTheDocument();

    expect(screen.getByText('Activity Alerts')).toBeInTheDocument();
    expect(screen.getByText(/get notified about trending/i)).toBeInTheDocument();
  });

  it('redirects to dashboard when user is authenticated', () => {
    mockUseAuth.mockReturnValue(createMockAuthContext({ user: mockUser }));

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/stars');
  });

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
});
