import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Header } from './Header';
import { useAuth } from '../hooks/use-auth';
import { supabase } from '../services/supabase';

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
  avatarUrl: 'https://example.com/avatar.jpg',
};

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no user is authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      connectionError: null,
      retryAuth: vi.fn(),
    });

    const { container } = render(<Header />);
    expect(container.firstChild).toBeNull();
  });

  it('displays user information when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      session: {} as any,
      loading: false,
      connectionError: null,
      retryAuth: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByText('Repo Radar')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByAltText("Test User's avatar")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('displays login when user has no name', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { ...mockUser, name: undefined },
      session: {} as any,
      loading: false,
      connectionError: null,
      retryAuth: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('does not display email when user has no email', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { ...mockUser, email: undefined },
      session: {} as any,
      loading: false,
      connectionError: null,
      retryAuth: vi.fn(),
    });

    render(<Header />);

    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
  });

  it('handles sign out successfully', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      session: {} as any,
      loading: false,
      connectionError: null,
      retryAuth: vi.fn(),
    });

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

  it('displays error message when sign out fails', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      session: {} as any,
      loading: false,
      connectionError: null,
      retryAuth: vi.fn(),
    });

    const errorMessage = 'Failed to sign out';
    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: new Error(errorMessage),
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
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      session: {} as any,
      loading: false,
      connectionError: null,
      retryAuth: vi.fn(),
    });

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
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      session: {} as any,
      loading: false,
      connectionError: null,
      retryAuth: vi.fn(),
    });

    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: new Error(''),
    });

    render(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(screen.getByText(/error occurred during sign out/i)).toBeInTheDocument();
    });
  });

  it('does not display avatar when user has no avatarUrl', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { ...mockUser, avatarUrl: undefined },
      session: {} as any,
      loading: false,
      connectionError: null,
      retryAuth: vi.fn(),
    });

    render(<Header />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
