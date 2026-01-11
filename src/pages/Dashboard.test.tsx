import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './Dashboard';
import * as githubService from '../services/github';
import { GitHubReauthRequiredError } from '../services/github-token';
import type { User, Repository } from '../types';

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock the GitHub service
vi.mock('../services/github', () => ({
  fetchAllStarredRepositories: vi.fn(),
  fetchStarredRepositories: vi.fn(),
  fetchStarredRepoCount: vi.fn(),
  searchRepositories: vi.fn(),
  searchStarredRepositories: vi.fn(),
  starRepository: vi.fn(),
  unstarRepository: vi.fn(),
  fetchRateLimit: vi.fn(),
}));

// Mock RepositoryList component with new infinite scroll interface
vi.mock('../components/RepositoryList', () => ({
  default: vi.fn(
    ({
      repositories,
      isLoading,
      isFetchingMore,
      hasMore,
      error,
      searchQuery,
      onSearchChange,
      onSearchSubmit,
      isSearching,
      viewMode,
      onViewChange,
      sortBy,
      onSortChange,
      onStar,
      onUnstar,
      onLoadMore,
    }) => {
      if (isLoading && repositories.length === 0) {
        return <div>Loading repositories...</div>;
      }
      if (error) {
        return <div>Error: {error.message}</div>;
      }
      return (
        <div data-testid="repository-list">
          <span data-testid="has-more">{hasMore ? 'true' : 'false'}</span>
          <span data-testid="sort-by">{sortBy}</span>
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
          {onViewChange && (
            <div>
              <label htmlFor="view-select">View:</label>
              <select
                id="view-select"
                data-testid="view-select"
                value={viewMode || 'starred'}
                onChange={(e) => onViewChange(e.target.value as 'all' | 'starred')}
              >
                <option value="starred">Starred</option>
                <option value="all">All Repositories</option>
              </select>
            </div>
          )}
          {onSortChange && (
            <div>
              <label htmlFor="sort-select">Sort:</label>
              <select
                id="sort-select"
                data-testid="sort-select"
                value={sortBy || 'updated'}
                onChange={(e) => onSortChange(e.target.value)}
              >
                <option value="updated">Recently Updated</option>
                <option value="created">Recently Starred</option>
                <option value="stars">Most Stars</option>
              </select>
            </div>
          )}
          {isSearching && <div>Searching GitHub...</div>}
          {isFetchingMore && <div>Loading more...</div>}
          <div data-testid="repo-count">{repositories.length} repositories</div>
          {repositories.map((repo: { id: number; name: string; is_starred?: boolean }) => (
            <div key={repo.id} data-testid={`repo-${repo.id}`}>
              {repo.name}
              {onUnstar && repo.is_starred && (
                <button data-testid={`unstar-${repo.id}`} onClick={() => onUnstar(repo)}>
                  Unstar
                </button>
              )}
              {onStar && !repo.is_starred && (
                <button data-testid={`star-${repo.id}`} onClick={() => onStar(repo)}>
                  Star
                </button>
              )}
            </div>
          ))}
          {hasMore && onLoadMore && (
            <button data-testid="load-more" onClick={onLoadMore}>
              Load More
            </button>
          )}
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

// Helper to create QueryClient for tests
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 1000 * 60, // Keep cache for 1 minute during tests
        staleTime: 0, // Always refetch on mount
      },
    },
  });

// Wrapper component with QueryClientProvider
const renderWithProviders = (ui: React.ReactElement, queryClient?: QueryClient) => {
  const client = queryClient ?? createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Dashboard', () => {
  const mockUser: User = {
    id: '1',
    login: 'testuser',
    name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    email: 'test@example.com',
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

    // Default mocks for the GitHub service
    vi.mocked(githubService.fetchStarredRepositories).mockResolvedValue(mockRepositories);
    vi.mocked(githubService.fetchAllStarredRepositories).mockResolvedValue({
      repositories: mockRepositories,
      totalFetched: mockRepositories.length,
    });
    vi.mocked(githubService.searchRepositories).mockResolvedValue({
      repositories: [],
      totalCount: 0,
      apiSearchResultTotal: 0,
    });
    vi.mocked(githubService.searchStarredRepositories).mockResolvedValue({
      repositories: [],
      totalCount: 0,
      apiSearchResultTotal: 0,
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

    renderWithProviders(<Dashboard />);

    // Check for the loading spinner div with animate-spin class
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('renders dashboard when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      providerToken: 'test-github-token',
      loading: false,
      signOut: vi.fn(),
    });

    renderWithProviders(<Dashboard />);

    expect(screen.getByText('Repository Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/track and manage/i)).toBeInTheDocument();

    // Wait for repositories to load
    await waitFor(() => {
      expect(screen.getByTestId('repository-list')).toBeInTheDocument();
    });

    // Check that mock repositories are displayed
    await waitFor(() => {
      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('typescript')).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching repositories', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      providerToken: 'test-github-token',
      loading: false,
      signOut: vi.fn(),
    });

    // Make the fetch never resolve
    vi.mocked(githubService.fetchStarredRepositories).mockImplementation(
      () => new Promise(() => {})
    );

    renderWithProviders(<Dashboard />);

    // Initially shows loading
    expect(screen.getByText('Loading repositories...')).toBeInTheDocument();
  });

  describe('Search Functionality', () => {
    it('performs search on form submission', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        providerToken: 'test-github-token',
        loading: false,
        signOut: vi.fn(),
      });

      vi.mocked(githubService.searchStarredRepositories).mockResolvedValue({
        repositories: [mockRepositories[0]],
        totalCount: 1,
        apiSearchResultTotal: 1,
      });

      renderWithProviders(<Dashboard />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('react')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search repositories/i);
      const searchButton = screen.getByTestId('search-button');

      // Type in search input and submit
      fireEvent.change(searchInput, { target: { value: 'react' } });
      fireEvent.click(searchButton);

      // Verify search was triggered
      await waitFor(() => {
        expect(vi.mocked(githubService.searchStarredRepositories)).toHaveBeenCalled();
      });
    });

    it('shows search status in subtitle', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        providerToken: 'test-github-token',
        loading: false,
        signOut: vi.fn(),
      });

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('react')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search repositories/i);
      const searchButton = screen.getByTestId('search-button');

      // Type and submit search
      fireEvent.change(searchInput, { target: { value: 'test' } });
      fireEvent.click(searchButton);

      // Should show search status
      await waitFor(() => {
        expect(screen.getByText(/Searching for "test"/)).toBeInTheDocument();
      });
    });
  });

  describe('View switching', () => {
    it('switches to Explore All view', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        providerToken: 'test-github-token',
        loading: false,
        signOut: vi.fn(),
      });

      const allRepos: Repository[] = [{ ...mockRepositories[0], id: 100, name: 'popular-repo' }];

      vi.mocked(githubService.searchRepositories).mockResolvedValue({
        repositories: allRepos,
        totalCount: 1,
        apiSearchResultTotal: 1,
      });

      renderWithProviders(<Dashboard />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('react')).toBeInTheDocument();
      });

      // Switch to "all" view
      const viewSelect = screen.getByTestId('view-select');
      fireEvent.change(viewSelect, { target: { value: 'all' } });

      // Should show search results
      await waitFor(() => {
        expect(vi.mocked(githubService.searchRepositories)).toHaveBeenCalled();
      });
    });

    it('clears search when switching from all to starred tab', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        providerToken: 'test-github-token',
        loading: false,
        signOut: vi.fn(),
      });

      renderWithProviders(<Dashboard />);

      // Wait for initial starred repos load
      await waitFor(() => {
        expect(screen.getByText('react')).toBeInTheDocument();
      });

      // Switch to "all" tab
      const viewSelect = screen.getByTestId('view-select');
      fireEvent.change(viewSelect, { target: { value: 'all' } });

      // Wait for all tab to be active
      await waitFor(() => {
        expect(screen.getByTestId('search-input')).toBeInTheDocument();
      });

      // Type in the search input (this updates searchQuery state)
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test query' } });
      expect(searchInput).toHaveValue('test query');

      // Re-query the filter select to get fresh reference
      const viewSelectAfterSearch = screen.getByTestId('view-select');

      // Switch back to "starred" tab - should clear search
      fireEvent.change(viewSelectAfterSearch, { target: { value: 'starred' } });

      // Search input should be cleared
      await waitFor(() => {
        expect(screen.getByTestId('search-input')).toHaveValue('');
      });
    });
  });

  describe('Sort functionality', () => {
    it('changes sort option', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        providerToken: 'test-github-token',
        loading: false,
        signOut: vi.fn(),
      });

      renderWithProviders(<Dashboard />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('react')).toBeInTheDocument();
      });

      // Default sort should be 'created' (Recently Starred) for My Stars tab
      expect(screen.getByTestId('sort-by')).toHaveTextContent('created');

      // Change sort to 'stars'
      const sortSelect = screen.getByTestId('sort-select');
      fireEvent.change(sortSelect, { target: { value: 'stars' } });

      // Sort should update
      await waitFor(() => {
        expect(screen.getByTestId('sort-by')).toHaveTextContent('stars');
      });
    });

    it('resets sort to best-match when switching to Explore All with Recently Starred selected', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        providerToken: 'test-github-token',
        loading: false,
        signOut: vi.fn(),
      });

      renderWithProviders(<Dashboard />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('react')).toBeInTheDocument();
      });

      // Change sort to 'created' (Recently Starred)
      const sortSelect = screen.getByTestId('sort-select');
      fireEvent.change(sortSelect, { target: { value: 'created' } });

      await waitFor(() => {
        expect(screen.getByTestId('sort-by')).toHaveTextContent('created');
      });

      // Switch to "Explore All" tab
      const viewSelect = screen.getByTestId('view-select');
      fireEvent.change(viewSelect, { target: { value: 'all' } });

      // Sort should reset to 'best-match' since 'created' is not available in Explore All
      await waitFor(() => {
        expect(screen.getByTestId('sort-by')).toHaveTextContent('best-match');
      });
    });

    it('resets sort to created when switching back to My Stars tab', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        providerToken: 'test-github-token',
        loading: false,
        signOut: vi.fn(),
      });

      renderWithProviders(<Dashboard />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('react')).toBeInTheDocument();
      });

      // Switch to "Explore All" tab
      fireEvent.change(screen.getByTestId('view-select'), { target: { value: 'all' } });

      // Sort should be 'best-match' in Explore All
      await waitFor(() => {
        expect(screen.getByTestId('sort-by')).toHaveTextContent('best-match');
      });

      // Change sort to 'stars' while in Explore All
      fireEvent.change(screen.getByTestId('sort-select'), { target: { value: 'stars' } });

      await waitFor(() => {
        expect(screen.getByTestId('sort-by')).toHaveTextContent('stars');
      });

      // Switch back to "My Stars" tab - should reset sort to 'created'
      fireEvent.change(screen.getByTestId('view-select'), { target: { value: 'starred' } });

      // Sort should reset to 'created' (Recently Starred) for My Stars
      await waitFor(() => {
        expect(screen.getByTestId('sort-by')).toHaveTextContent('created');
      });
    });
  });

  describe('Star/Unstar Functionality', () => {
    it('calls unstar handler when unstar button is clicked', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      mockUseAuth.mockReturnValue({
        user: mockUser,
        providerToken: 'test-github-token',
        loading: false,
        signOut: vi.fn(),
      });

      vi.mocked(githubService.unstarRepository).mockResolvedValue(undefined);

      renderWithProviders(<Dashboard />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('repo-count')).toHaveTextContent('2 repositories');
      });

      // Find and click the unstar button
      const unstarButton = screen.getByTestId('unstar-1');
      fireEvent.click(unstarButton);

      // Verify unstar was called
      await waitFor(() => {
        expect(vi.mocked(githubService.unstarRepository)).toHaveBeenCalledWith(
          'test-github-token',
          'facebook',
          'react'
        );
      });
    });

    it('invalidates all relevant caches including search when starring from search results', async () => {
      const queryClient = createTestQueryClient();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      mockUseAuth.mockReturnValue({
        user: mockUser,
        providerToken: 'test-github-token',
        loading: false,
        signOut: vi.fn(),
      });

      // Set up search results with an unstarred repo
      const searchResultRepo: Repository = {
        ...mockRepositories[0],
        id: 99,
        name: 'unstarred-repo',
        is_starred: false,
      };
      vi.mocked(githubService.searchRepositories).mockResolvedValue({
        repositories: [searchResultRepo],
        totalCount: 1,
        apiSearchResultTotal: 1,
      });
      vi.mocked(githubService.starRepository).mockResolvedValue(undefined);

      renderWithProviders(<Dashboard />, queryClient);

      // Wait for initial starred repos load
      await waitFor(() => {
        expect(screen.getByTestId('repo-count')).toHaveTextContent('2 repositories');
      });

      // Switch to "Explore All" mode
      const viewSelect = screen.getByTestId('view-select');
      fireEvent.change(viewSelect, { target: { value: 'all' } });

      // Wait for search results to load
      await waitFor(() => {
        expect(screen.getByTestId('star-99')).toBeInTheDocument();
      });

      // Clear any previous invalidations from switching tabs
      invalidateQueriesSpy.mockClear();

      // Star the repo from search results
      fireEvent.click(screen.getByTestId('star-99'));

      // Verify ALL relevant caches were invalidated
      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ['starredRepositories'],
        });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ['allStarredRepositories'],
        });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ['searchRepositories'],
        });
      });
    });

    it('invalidates all relevant caches including search when unstarring from search results', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      const queryClient = createTestQueryClient();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      mockUseAuth.mockReturnValue({
        user: mockUser,
        providerToken: 'test-github-token',
        loading: false,
        signOut: vi.fn(),
      });

      // Set up search results with a starred repo
      const searchResultRepo: Repository = {
        ...mockRepositories[0],
        id: 99,
        name: 'starred-repo',
        is_starred: true,
      };
      vi.mocked(githubService.searchRepositories).mockResolvedValue({
        repositories: [searchResultRepo],
        totalCount: 1,
        apiSearchResultTotal: 1,
      });
      vi.mocked(githubService.unstarRepository).mockResolvedValue(undefined);

      renderWithProviders(<Dashboard />, queryClient);

      // Wait for initial starred repos load
      await waitFor(() => {
        expect(screen.getByTestId('repo-count')).toHaveTextContent('2 repositories');
      });

      // Switch to "Explore All" mode
      const viewSelect = screen.getByTestId('view-select');
      fireEvent.change(viewSelect, { target: { value: 'all' } });

      // Wait for search results to load
      await waitFor(() => {
        expect(screen.getByTestId('unstar-99')).toBeInTheDocument();
      });

      // Clear any previous invalidations from switching tabs
      invalidateQueriesSpy.mockClear();

      // Unstar the repo from search results
      fireEvent.click(screen.getByTestId('unstar-99'));

      // Verify ALL relevant caches were invalidated
      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ['starredRepositories'],
        });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ['allStarredRepositories'],
        });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ['searchRepositories'],
        });
      });
    });
  });

  describe('Error handling', () => {
    it('handles repository loading errors', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      mockUseAuth.mockReturnValue({
        user: mockUser,
        providerToken: 'test-github-token',
        loading: false,
        signOut: vi.fn(),
      });

      vi.mocked(githubService.fetchStarredRepositories).mockRejectedValue(
        new Error('Failed to load')
      );

      renderWithProviders(<Dashboard />);

      await waitFor(
        () => {
          expect(screen.getByText(/Error: Failed to load/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Reauth error recovery', () => {
    it('navigates to home even when signOut throws an error', async () => {
      const mockSignOut = vi.fn().mockRejectedValue(new Error('Network error'));

      mockUseAuth.mockReturnValue({
        user: mockUser,
        providerToken: 'test-github-token',
        loading: false,
        signOut: mockSignOut,
      });

      vi.mocked(githubService.fetchStarredRepositories).mockRejectedValue(
        new GitHubReauthRequiredError('Session expired')
      );

      renderWithProviders(<Dashboard />);

      await waitFor(
        () => {
          expect(mockSignOut).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      // Navigation should happen via finally() even when signOut rejects
      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/');
        },
        { timeout: 3000 }
      );
    });

    it('navigates to home when signOut succeeds', async () => {
      const mockSignOut = vi.fn().mockResolvedValue(undefined);

      mockUseAuth.mockReturnValue({
        user: mockUser,
        providerToken: 'test-github-token',
        loading: false,
        signOut: mockSignOut,
      });

      vi.mocked(githubService.fetchStarredRepositories).mockRejectedValue(
        new GitHubReauthRequiredError('Session expired')
      );

      renderWithProviders(<Dashboard />);

      await waitFor(
        () => {
          expect(mockSignOut).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/');
        },
        { timeout: 3000 }
      );
    });
  });
});
