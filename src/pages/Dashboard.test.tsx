import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import * as githubService from '../services/github';
import type { User, Repository } from '../types';

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock the GitHub service
vi.mock('../services/github', () => ({
  fetchAllStarredRepositories: vi.fn(),
  searchRepositories: vi.fn(),
  searchStarredRepositories: vi.fn(),
  fetchRateLimit: vi.fn(),
}));

// Mock RepositoryList component with search functionality
vi.mock('../components/RepositoryList', () => ({
  default: vi.fn(
    ({
      repositories,
      isLoading,
      error,
      searchQuery,
      onSearchChange,
      onSearchSubmit,
      isSearching,
    }) => {
      if (isLoading) {
        return <div>Loading repositories...</div>;
      }
      if (error) {
        return <div>Error: {error.message}</div>;
      }
      return (
        <div data-testid="repository-list">
          {onSearchChange && onSearchSubmit && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const query = formData.get('search') as string;
                onSearchSubmit(query);
              }}
            >
              <input
                name="search"
                data-testid="search-input"
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search repositories..."
              />
              <button type="submit" data-testid="search-button">
                Search
              </button>
            </form>
          )}
          {isSearching && <div>Searching GitHub...</div>}
          <div data-testid="repo-count">{repositories.length} repositories</div>
          {repositories.map((repo: { id: number; name: string }) => (
            <div key={repo.id} data-testid={`repo-${repo.id}`}>
              {repo.name}
            </div>
          ))}
        </div>
      );
    }
  ),
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

  const mockSession = {
    provider_token: 'test-github-token',
    access_token: 'test-access-token',
    token_type: 'bearer' as const,
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    refresh_token: 'test-refresh-token',
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: {},
      app_metadata: {},
      aud: 'authenticated',
      created_at: '2024-01-01T00:00:00Z',
    },
  };

  const mockRepositories: Repository[] = [
    {
      id: 1,
      name: 'react',
      full_name: 'facebook/react',
      owner: {
        login: 'facebook',
        avatar_url: 'https://avatars.githubusercontent.com/u/69631?v=4',
      },
      description: 'The library for web and native user interfaces',
      html_url: 'https://github.com/facebook/react',
      stargazers_count: 234567,
      open_issues_count: 892,
      language: 'JavaScript',
      topics: ['javascript', 'react', 'frontend'],
      updated_at: '2024-01-15T10:30:00Z',
      pushed_at: '2024-01-15T10:30:00Z',
      created_at: '2013-05-24T16:15:54Z',
      metrics: {
        stars_growth_rate: 12.5,
        issues_growth_rate: -3.2,
        is_trending: true,
      },
      is_following: false,
      is_starred: true,
    },
    {
      id: 2,
      name: 'typescript',
      full_name: 'microsoft/typescript',
      owner: {
        login: 'microsoft',
        avatar_url: 'https://avatars.githubusercontent.com/u/6154722?v=4',
      },
      description: 'TypeScript is a superset of JavaScript',
      html_url: 'https://github.com/microsoft/typescript',
      stargazers_count: 98765,
      open_issues_count: 456,
      language: 'TypeScript',
      topics: ['typescript', 'javascript'],
      updated_at: '2024-01-14T08:45:00Z',
      pushed_at: '2024-01-14T08:45:00Z',
      created_at: '2014-06-17T15:28:39Z',
      metrics: {
        stars_growth_rate: 8.1,
        issues_growth_rate: 2.4,
        is_trending: false,
      },
      is_following: false,
      is_starred: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(githubService.fetchAllStarredRepositories).mockResolvedValue({
      repositories: mockRepositories,
      totalFetched: mockRepositories.length,
      totalStarred: mockRepositories.length,
      isLimited: false,
      hasMore: false,
    });
    vi.mocked(githubService.searchRepositories).mockResolvedValue({
      repositories: [],
      totalCount: 0,
      effectiveTotal: 0,
      isLimited: false,
    });
    vi.mocked(githubService.searchStarredRepositories).mockResolvedValue({
      repositories: [],
      totalCount: 0,
      effectiveTotal: 0,
      isLimited: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
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
      session: mockSession,
      loading: false,
      signOut: vi.fn(),
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
  });

  it('shows loading state while fetching repositories', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      session: mockSession,
      loading: false,
      signOut: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Initially shows loading
    expect(screen.getByText('Loading repositories...')).toBeInTheDocument();
  });

  describe('Search Functionality', () => {
    it('performs search on form submission', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        signOut: vi.fn(),
      });

      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      await vi.waitFor(() => {
        expect(vi.mocked(githubService.fetchAllStarredRepositories)).toHaveBeenCalled();
      });

      // Wait for the repositories to be displayed
      await vi.waitFor(() => {
        expect(screen.getByText(/react/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search repositories/i);
      const searchButton = screen.getByTestId('search-button');

      // Type in search input
      fireEvent.change(searchInput, { target: { value: 'vue' } });

      // Search should not be called immediately after typing
      expect(vi.mocked(githubService.searchRepositories)).not.toHaveBeenCalled();

      // Submit the form by clicking search button
      fireEvent.click(searchButton);

      expect(vi.mocked(githubService.searchStarredRepositories)).toHaveBeenCalledWith(
        mockSession,
        'vue',
        1,
        30,
        mockRepositories
      );
    });

    it('filters starred repositories locally', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        signOut: vi.fn(),
      });

      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(vi.mocked(githubService.fetchAllStarredRepositories)).toHaveBeenCalled();
      });

      const searchInput = screen.getByPlaceholderText(/search repositories/i);
      await userEvent.type(searchInput, 'type');

      // Local filtering should happen immediately
      await waitFor(() => {
        // Only TypeScript repo should match locally
        expect(screen.getByText(/typeScript/i)).toBeInTheDocument();
        expect(screen.queryByText('React')).not.toBeInTheDocument();
      });
    });

    it('shows search status in subtitle', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        signOut: vi.fn(),
      });

      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(vi.mocked(githubService.fetchAllStarredRepositories)).toHaveBeenCalled();
      });

      const searchInput = screen.getByPlaceholderText(/search repositories/i);
      await userEvent.type(searchInput, 'test');

      // Should show search status
      await waitFor(() => {
        expect(screen.getByText(/Searching for "test"/)).toBeInTheDocument();
      });
    });
  });

  it('handles repository loading errors', async () => {
    // Mock console.error to avoid noise in tests
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockUseAuth.mockReturnValue({
      user: mockUser,
      session: mockSession,
      loading: false,
      signOut: vi.fn(),
    });

    vi.mocked(githubService.fetchAllStarredRepositories).mockRejectedValue(
      new Error('Failed to load')
    );

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to load')).toBeInTheDocument();
    });

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
