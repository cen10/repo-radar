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

// Mock RepositoryList component with search and filter functionality
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
      filterBy,
      onFilterChange,
      dataIsPrepaginated,
    }) => {
      if (isLoading) {
        return <div>Loading repositories...</div>;
      }
      if (error) {
        return <div>Error: {error.message}</div>;
      }
      return (
        <div data-testid="repository-list">
          <span data-testid="data-is-prepaginated">{dataIsPrepaginated ? 'true' : 'false'}</span>
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
          {onFilterChange && (
            <div>
              <label htmlFor="filter-select">Filter:</label>
              <select
                id="filter-select"
                data-testid="filter-select"
                value={filterBy || 'starred'}
                onChange={(e) => onFilterChange(e.target.value as 'all' | 'starred')}
              >
                <option value="starred">Starred</option>
                <option value="all">All Repositories</option>
              </select>
            </div>
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
      apiSearchResultTotal: 0,
      isLimited: false,
    });
    vi.mocked(githubService.searchStarredRepositories).mockResolvedValue({
      repositories: [],
      totalCount: 0,
      apiSearchResultTotal: 0,
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
        'test-github-token',
        'vue',
        1,
        30,
        mockRepositories,
        expect.any(AbortSignal)
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

  describe('Filter behavior with empty search', () => {
    const mockHighStarredRepos: Repository[] = [
      {
        id: 3,
        name: 'kubernetes',
        full_name: 'kubernetes/kubernetes',
        owner: {
          login: 'kubernetes',
          avatar_url: 'https://avatars.githubusercontent.com/u/13629408?v=4',
        },
        description: 'Production-Grade Container Scheduling and Management',
        html_url: 'https://github.com/kubernetes/kubernetes',
        stargazers_count: 150000,
        open_issues_count: 2000,
        language: 'Go',
        topics: ['kubernetes', 'containers'],
        updated_at: '2024-01-15T10:30:00Z',
        pushed_at: '2024-01-15T10:30:00Z',
        created_at: '2014-06-06T22:56:04Z',
        metrics: {
          stars_growth_rate: 15.2,
          issues_growth_rate: -1.5,
          is_trending: true,
        },
        is_following: false,
        is_starred: false,
      },
    ];

    it('shows starred repos when filter is "starred" and search is empty', async () => {
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

      // Should show starred repositories by default
      expect(screen.getByText('2 repositories')).toBeInTheDocument();
      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('typescript')).toBeInTheDocument();
    });

    it('searches for high starred repos when filter is "all" and search is empty', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        signOut: vi.fn(),
      });

      vi.mocked(githubService.searchRepositories).mockResolvedValue({
        repositories: mockHighStarredRepos,
        totalCount: 1000000,
        apiSearchResultTotal: 1000,
        isLimited: true,
      });

      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(vi.mocked(githubService.fetchAllStarredRepositories)).toHaveBeenCalled();
      });

      // Change filter to "all"
      const filterSelect = screen.getByTestId('filter-select');
      fireEvent.change(filterSelect, { target: { value: 'all' } });

      // Should search for most starred repositories
      await waitFor(() => {
        expect(vi.mocked(githubService.searchRepositories)).toHaveBeenCalledWith(
          'test-github-token',
          'stars:>1',
          1,
          30,
          expect.any(AbortSignal)
        );
      });

      // Should show high starred repositories
      expect(screen.getByText('1 repositories')).toBeInTheDocument();
      expect(screen.getByText('kubernetes')).toBeInTheDocument();
    });

    it('switches between filter modes correctly with empty search', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        signOut: vi.fn(),
      });

      vi.mocked(githubService.searchRepositories).mockResolvedValue({
        repositories: mockHighStarredRepos,
        totalCount: 1000000,
        apiSearchResultTotal: 1000,
        isLimited: true,
      });

      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(vi.mocked(githubService.fetchAllStarredRepositories)).toHaveBeenCalled();
      });

      const filterSelect = screen.getByTestId('filter-select');

      // Switch to "all" - should search for high starred repos
      fireEvent.change(filterSelect, { target: { value: 'all' } });

      await waitFor(() => {
        expect(vi.mocked(githubService.searchRepositories)).toHaveBeenCalledWith(
          'test-github-token',
          'stars:>1',
          1,
          30,
          expect.any(AbortSignal)
        );
      });

      // Switch back to "starred" - should show user's starred repos
      fireEvent.change(filterSelect, { target: { value: 'starred' } });

      await waitFor(() => {
        expect(screen.getByText('2 repositories')).toBeInTheDocument();
        expect(screen.getByText('react')).toBeInTheDocument();
      });
    });
  });

  describe('dataIsPrepaginated prop', () => {
    it('sets dataIsPrepaginated to false when showing default starred view', async () => {
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

      // Default starred view should not use pre-paginated data
      expect(screen.getByTestId('data-is-prepaginated')).toHaveTextContent('false');
    });

    it('sets dataIsPrepaginated to true when searching starred repos', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        signOut: vi.fn(),
      });

      vi.mocked(githubService.searchStarredRepositories).mockResolvedValue({
        repositories: mockRepositories,
        totalCount: 2,
        apiSearchResultTotal: 2,
        isLimited: false,
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
      const searchButton = screen.getByTestId('search-button');

      fireEvent.change(searchInput, { target: { value: 'react' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByTestId('data-is-prepaginated')).toHaveTextContent('true');
      });
    });

    it('sets dataIsPrepaginated to true when searching all repos', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        signOut: vi.fn(),
      });

      vi.mocked(githubService.searchRepositories).mockResolvedValue({
        repositories: mockRepositories,
        totalCount: 100,
        apiSearchResultTotal: 100,
        isLimited: false,
      });

      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(vi.mocked(githubService.fetchAllStarredRepositories)).toHaveBeenCalled();
      });

      // Change filter to "all"
      const filterSelect = screen.getByTestId('filter-select');
      fireEvent.change(filterSelect, { target: { value: 'all' } });

      await waitFor(() => {
        expect(screen.getByTestId('data-is-prepaginated')).toHaveTextContent('true');
      });
    });

    it('resets dataIsPrepaginated to false when clearing search and returning to starred view', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        signOut: vi.fn(),
      });

      vi.mocked(githubService.searchStarredRepositories).mockResolvedValue({
        repositories: mockRepositories,
        totalCount: 2,
        apiSearchResultTotal: 2,
        isLimited: false,
      });

      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(vi.mocked(githubService.fetchAllStarredRepositories)).toHaveBeenCalled();
      });

      // Perform a search first
      const searchInput = screen.getByPlaceholderText(/search repositories/i);
      const searchButton = screen.getByTestId('search-button');

      fireEvent.change(searchInput, { target: { value: 'react' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByTestId('data-is-prepaginated')).toHaveTextContent('true');
      });

      // Clear search and submit empty query
      fireEvent.change(searchInput, { target: { value: '' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByTestId('data-is-prepaginated')).toHaveTextContent('false');
      });
    });
  });

  // Add this describe block to Dashboard.test.tsx
  // NOTE: These tests require the signal parameter to be passed through to the mocked functions

  describe('Search race condition handling', () => {
    it('ignores stale search results when a newer search is initiated', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        signOut: vi.fn(),
      });

      const vueRepos: Repository[] = [
        {
          ...mockRepositories[0],
          id: 100,
          name: 'vue',
          full_name: 'vuejs/vue',
        },
      ];

      const reactRepos: Repository[] = [
        {
          ...mockRepositories[0],
          id: 101,
          name: 'react-query',
          full_name: 'tanstack/react-query',
        },
      ];

      let firstSearchResolve: (value: unknown) => void;
      const firstSearchPromise = new Promise((resolve) => {
        firstSearchResolve = resolve;
      });

      let searchCallCount = 0;
      vi.mocked(githubService.searchStarredRepositories).mockImplementation(
        async (_session, _query, _page, _perPage, _allStarredRepos, signal) => {
          searchCallCount++;
          const callNumber = searchCallCount;

          if (callNumber === 1) {
            // First search: wait for manual resolution (simulates slow response)
            await firstSearchPromise;

            // Check abort after delay - simulates real fetch behavior
            if (signal?.aborted) {
              throw new DOMException('Aborted', 'AbortError');
            }

            return {
              repositories: vueRepos,
              totalCount: 1,
              apiSearchResultTotal: 1,
              isLimited: false,
            };
          } else {
            // Second search: resolve immediately (simulates fast response)
            return {
              repositories: reactRepos,
              totalCount: 1,
              apiSearchResultTotal: 1,
              isLimited: false,
            };
          }
        }
      );

      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(vi.mocked(githubService.fetchAllStarredRepositories)).toHaveBeenCalled();
      });

      const searchInput = screen.getByPlaceholderText(/search repositories/i);
      const searchButton = screen.getByTestId('search-button');

      // First search: "vue" (will be slow)
      fireEvent.change(searchInput, { target: { value: 'vue' } });
      fireEvent.click(searchButton);

      // Second search: "react" (will be fast) - initiated before first completes
      fireEvent.change(searchInput, { target: { value: 'react' } });
      fireEvent.click(searchButton);

      // Wait for second search to complete
      await waitFor(() => {
        expect(screen.getByText('react-query')).toBeInTheDocument();
      });

      // Now let the first (stale) search complete - it should throw AbortError
      firstSearchResolve!({});

      // Give time for any potential state updates from stale response
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should still show react results, not vue (stale) results
      expect(screen.getByText('react-query')).toBeInTheDocument();
      expect(screen.queryByText('vue')).not.toBeInTheDocument();
    });

    it('ignores stale results when filter changes during search', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        signOut: vi.fn(),
      });

      const starredSearchRepos: Repository[] = [
        {
          ...mockRepositories[0],
          id: 200,
          name: 'starred-result',
          full_name: 'user/starred-result',
        },
      ];

      const allSearchRepos: Repository[] = [
        {
          ...mockRepositories[0],
          id: 201,
          name: 'all-repos-result',
          full_name: 'popular/all-repos-result',
        },
      ];

      let starredSearchResolve: (value: unknown) => void;
      const starredSearchPromise = new Promise((resolve) => {
        starredSearchResolve = resolve;
      });

      vi.mocked(githubService.searchStarredRepositories).mockImplementation(
        async (_session, _query, _page, _perPage, _allStarredRepos, signal) => {
          await starredSearchPromise;

          // Check abort after delay
          if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }

          return {
            repositories: starredSearchRepos,
            totalCount: 1,
            apiSearchResultTotal: 1,
            isLimited: false,
          };
        }
      );

      vi.mocked(githubService.searchRepositories).mockResolvedValue({
        repositories: allSearchRepos,
        totalCount: 1,
        apiSearchResultTotal: 1,
        isLimited: false,
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
      const searchButton = screen.getByTestId('search-button');
      const filterSelect = screen.getByTestId('filter-select');

      // Start search in "starred" mode (will be slow)
      fireEvent.change(searchInput, { target: { value: 'test' } });
      fireEvent.click(searchButton);

      // Change filter to "all" before starred search completes
      fireEvent.change(filterSelect, { target: { value: 'all' } });

      // Wait for "all" search to complete
      await waitFor(() => {
        expect(screen.getByText('all-repos-result')).toBeInTheDocument();
      });

      // Now let the stale starred search complete - it should throw AbortError
      starredSearchResolve!({});

      // Give time for any potential state updates
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should still show "all" results, not stale "starred" results
      expect(screen.getByText('all-repos-result')).toBeInTheDocument();
      expect(screen.queryByText('starred-result')).not.toBeInTheDocument();
    });

    it('ignores stale results when search is cleared', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        signOut: vi.fn(),
      });

      const searchRepos: Repository[] = [
        {
          ...mockRepositories[0],
          id: 300,
          name: 'search-result',
          full_name: 'org/search-result',
        },
      ];

      let searchResolve: (value: unknown) => void;
      const searchPromise = new Promise((resolve) => {
        searchResolve = resolve;
      });

      vi.mocked(githubService.searchStarredRepositories).mockImplementation(
        async (_session, _query, _page, _perPage, _allStarredRepos, signal) => {
          await searchPromise;

          // Check abort after delay - simulates real fetch behavior
          if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }

          return {
            repositories: searchRepos,
            totalCount: 1,
            apiSearchResultTotal: 1,
            isLimited: false,
          };
        }
      );

      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(vi.mocked(githubService.fetchAllStarredRepositories)).toHaveBeenCalled();
      });

      // Verify initial starred repos are shown
      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('typescript')).toBeInTheDocument();

      const searchInput = screen.getByPlaceholderText(/search repositories/i);
      const searchButton = screen.getByTestId('search-button');

      // Start search (will be slow)
      fireEvent.change(searchInput, { target: { value: 'test' } });
      fireEvent.click(searchButton);

      // Clear search before it completes
      fireEvent.change(searchInput, { target: { value: '' } });
      fireEvent.click(searchButton);

      // Should immediately show original starred repos
      await waitFor(() => {
        expect(screen.getByText('react')).toBeInTheDocument();
        expect(screen.getByText('typescript')).toBeInTheDocument();
      });

      // Now let the stale search complete - it should throw AbortError
      searchResolve!({});

      // Give time for any potential state updates
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should still show starred repos, not stale search results
      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('typescript')).toBeInTheDocument();
      expect(screen.queryByText('search-result')).not.toBeInTheDocument();
    });
  });
});
