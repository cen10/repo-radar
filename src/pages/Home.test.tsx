import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { BrowserRouter } from 'react-router-dom';
import Home from './Home';
import type { User } from '../types';

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

describe('Home', () => {
  const mockUser: User = {
    id: '1',
    login: 'testuser',
    name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    email: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the home page content', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signInWithGitHub: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(screen.getByText('Repo Radar')).toBeInTheDocument();
    expect(screen.getByText(/track momentum and activity/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in with github/i })).toBeInTheDocument();
  });

  it('displays feature cards', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signInWithGitHub: vi.fn(),
    });

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
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signInWithGitHub: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('sign in button triggers GitHub OAuth flow', async () => {
    const mockSignIn = vi.fn();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signInWithGitHub: mockSignIn,
    });

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
});
