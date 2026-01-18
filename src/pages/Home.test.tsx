import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { BrowserRouter } from 'react-router-dom';
import Home from './Home';
import type { User } from '../types';
import type { AuthContextType } from '../contexts/auth-context';

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

const mockUser: User = {
  id: '1',
  login: 'testuser',
  name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  email: 'test@example.com',
};

const createMockAuthContext = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
  user: null,
  providerToken: null,
  loading: false,
  connectionError: null,
  signInWithGitHub: vi.fn(),
  signOut: vi.fn(),
  retryAuth: vi.fn(),
  ...overrides,
});

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the home page content', () => {
    mockUseAuth.mockReturnValue(createMockAuthContext());

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
    mockUseAuth.mockReturnValue(createMockAuthContext());

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    const signInButton = screen.getByRole('button', { name: /sign in with github/i });
    expect(signInButton).toHaveFocus();
  });

  it('displays feature cards', () => {
    mockUseAuth.mockReturnValue(createMockAuthContext());

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
    mockUseAuth.mockReturnValue(createMockAuthContext({ signInWithGitHub: mockSignIn }));

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
    mockUseAuth.mockReturnValue(createMockAuthContext({ signInWithGitHub: mockSignIn }));

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
    mockUseAuth.mockReturnValue(createMockAuthContext({ signInWithGitHub: mockSignIn }));

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
});
