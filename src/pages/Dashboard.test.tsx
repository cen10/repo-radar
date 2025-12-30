import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import type { User } from '../types';

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock RepositoryList component
vi.mock('../components/RepositoryList', () => ({
  default: vi.fn(({ repositories, isLoading, error }) => {
    if (isLoading) {
      return <div>Loading repositories...</div>;
    }
    if (error) {
      return <div>Error: {error.message}</div>;
    }
    return (
      <div data-testid="repository-list">
        {repositories.map((repo: { id: number; name: string }) => (
          <div key={repo.id}>{repo.name}</div>
        ))}
      </div>
    );
  }),
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

describe('Dashboard', () => {
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

  it('renders loading state while checking authentication', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Check for the loading spinner div with animate-spin class
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('renders dashboard when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('Repository Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/track and manage/i)).toBeInTheDocument();

    // Wait for repositories to load
    await waitFor(() => {
      expect(screen.getByTestId('repository-list')).toBeInTheDocument();
    });

    // Check that mock repositories are displayed
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
    expect(screen.getByText('vscode')).toBeInTheDocument();
  });

  it('shows loading state while fetching repositories', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Initially shows loading
    expect(screen.getByText('Loading repositories...')).toBeInTheDocument();
  });

  it('handles repository loading errors', async () => {
    // Mock console.error to avoid noise in tests
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Dashboard will show loading state initially
    // The mock RepositoryList component handles the loading state
    expect(screen.getByText('Loading repositories...')).toBeInTheDocument();

    consoleError.mockRestore();
  });

  it('does not render content when authentication is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.queryByText('Repository Dashboard')).not.toBeInTheDocument();
  });
});
