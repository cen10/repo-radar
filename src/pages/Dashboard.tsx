import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import RepositoryList from '../components/RepositoryList';
import { useAuth } from '../hooks/useAuth';
import {
  fetchAllStarredRepositories,
  searchRepositories,
  searchStarredRepositories,
  starRepository,
  unstarRepository,
} from '../services/github';
import { GitHubReauthRequiredError, getValidGitHubToken } from '../services/github-token';
import type { Repository } from '../types';
import {
  excludePendingUnstars,
  markPendingUnstar,
  clearPendingUnstar,
} from '../utils/repository-filter';

const ITEMS_PER_PAGE = 30;

const Dashboard = () => {
  const { user, providerToken, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dataIsPrepaginated, setDataIsPrepaginated] = useState(false);
  const [filterBy, setFilterBy] = useState<'all' | 'starred'>('starred');
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [apiSearchResultTotal, setApiSearchResultTotal] = useState<number | undefined>();
  const [repoLimitReached, setRepoLimitReached] = useState(false);
  const [totalReposFetched, setTotalReposFetched] = useState(0);
  const [totalStarredRepos, setTotalStarredRepos] = useState(0);
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const initialLoadStartedRef = useRef(false);

  // Defensive handler for the unlikely case where no GitHub token is available.
  // GitHub OAuth tokens don't expire, so this would only trigger if the user
  // cleared browser storage while Supabase had already dropped provider_token.
  // Forces re-authentication to recover.
  const isReauthError = useCallback(
    (err: unknown): boolean => {
      if (err instanceof GitHubReauthRequiredError) {
        void signOut().then(() => navigate('/login'));
        return true;
      }
      return false;
    },
    [signOut, navigate]
  );

  useEffect(() => {
    if (!authLoading && !user) {
      void navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Handle localStorage cleanup and cross-tab synchronization
  useEffect(() => {
    // Clean up expired entries from localStorage on startup
    const stored = localStorage.getItem('pendingUnstars');
    if (stored) {
      const entries = JSON.parse(stored);
      const now = Date.now();
      const validEntries = entries.filter(
        (entry: { timestamp: number }) => now - entry.timestamp < 60000 // 1 minute
      );

      if (validEntries.length !== entries.length) {
        localStorage.setItem('pendingUnstars', JSON.stringify(validEntries));
      }
    }

    // Listen for localStorage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pendingUnstars') {
        // Refresh current repository list
        setRepositories((prev) => excludePendingUnstars(prev));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Reusable function to fetch starred repositories
  const loadStarredRepositories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = getValidGitHubToken(providerToken);
      const result = await fetchAllStarredRepositories(token);

      // Prevent unstarred repos from reappearing on refresh until GitHub API syncs
      setRepositories(excludePendingUnstars(result.repositories));

      setRepoLimitReached(result.isLimited);
      setTotalReposFetched(result.totalFetched);
      setTotalStarredRepos(result.totalStarred);

      return result.repositories;
    } catch (err) {
      if (isReauthError(err)) return [];
      setError(err instanceof Error ? err : new Error('Failed to load repositories'));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [providerToken, isReauthError]);

  // Load starred repositories when auth is ready
  useEffect(() => {
    // Guard: skip if load already started - Prevents overwriting search results
    if (initialLoadStartedRef.current) {
      return;
    }

    if (user && !authLoading) {
      // Set flag synchronously BEFORE async work to prevent duplicate fetches
      initialLoadStartedRef.current = true;
      void loadStarredRepositories();
    }
  }, [user, authLoading, loadStarredRepositories]);

  // Reset to default starred repos view by refetching
  const showDefaultStarredView = useCallback(async () => {
    setDataIsPrepaginated(false);
    setCurrentPage(1);
    setTotalPages(0);
    setHasMoreResults(false);
    setApiSearchResultTotal(undefined);
    await loadStarredRepositories();
  }, [loadStarredRepositories]);

  // Search within user's starred repositories via API
  const searchWithinStarredRepos = useCallback(
    async (query: string, page: number, signal?: AbortSignal) => {
      const token = getValidGitHubToken(providerToken);

      // Fetch fresh starred repos to search within
      const result = await fetchAllStarredRepositories(token);
      const starredRepos = excludePendingUnstars(result.repositories);

      const starredResponse = await searchStarredRepositories(
        token,
        query,
        page,
        ITEMS_PER_PAGE,
        starredRepos,
        signal
      );

      const totalPages = Math.ceil(starredResponse.totalCount / ITEMS_PER_PAGE);

      setRepositories(excludePendingUnstars(starredResponse.repositories));
      setDataIsPrepaginated(true);
      setCurrentPage(page);
      setTotalPages(totalPages);
      setHasMoreResults(page < totalPages);
      setApiSearchResultTotal(starredResponse.apiSearchResultTotal);
    },
    [providerToken]
  );

  // Search all GitHub repositories via API
  const searchAllGitHubRepos = useCallback(
    async (query: string, page: number, signal?: AbortSignal) => {
      const token = getValidGitHubToken(providerToken);
      const searchResponse = await searchRepositories(token, query, page, ITEMS_PER_PAGE, signal);

      const totalPages = Math.ceil(searchResponse.apiSearchResultTotal / ITEMS_PER_PAGE);

      setRepositories(excludePendingUnstars(searchResponse.repositories));
      setDataIsPrepaginated(true);
      setCurrentPage(page);
      setTotalPages(totalPages);
      setHasMoreResults(page < totalPages);
      setApiSearchResultTotal(searchResponse.apiSearchResultTotal);
    },
    [providerToken]
  );

  // Main search router - determines which search behavior to use
  const performSearch = useCallback(
    async (query: string, filter: 'all' | 'starred', page = 1) => {
      // Abort any in-flight search request
      searchAbortControllerRef.current?.abort();
      searchAbortControllerRef.current = new AbortController();
      const signal = searchAbortControllerRef.current.signal;

      // No query + starred filter = show default view
      if (!query.trim() && filter === 'starred') {
        await showDefaultStarredView();
        return;
      }

      // No query + all filter = search for popular repos
      const effectiveQuery = query.trim() || 'stars:>1';

      setIsSearching(true);

      try {
        if (filter === 'starred') {
          await searchWithinStarredRepos(effectiveQuery, page, signal);
        } else {
          await searchAllGitHubRepos(effectiveQuery, page, signal);
        }
      } catch (err) {
        // Silently ignore abort errors - request was superseded by newer search
        // Note: DOMException may not be instanceof Error in all environments (e.g., jsdom)
        if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
          return;
        }

        if (isReauthError(err)) return;
        setError(err instanceof Error ? err : new Error('Search failed'));
      } finally {
        // Only clear searching state if this request wasn't aborted
        if (!signal.aborted) {
          setIsSearching(false);
        }
      }
    },
    [showDefaultStarredView, searchWithinStarredRepos, searchAllGitHubRepos, isReauthError]
  );

  // Handle search input changes (just updates the input value, no search)
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Handle search submission (when user clicks search button or hits enter)
  const handleSearchSubmit = useCallback(
    (query: string) => {
      // Reset to page 1 for new searches
      setCurrentPage(1);

      // Perform search immediately
      void performSearch(query, filterBy, 1);
    },
    [performSearch, filterBy]
  );

  // Handle filter changes (immediate, no debouncing)
  const handleFilterChange = useCallback(
    (filter: 'all' | 'starred') => {
      setFilterBy(filter);
      setCurrentPage(1); // Reset to page 1 when changing filters

      // Re-run search with new filter (performSearch handles all cases)
      void performSearch(searchQuery, filter, 1);
    },
    [performSearch, searchQuery]
  );

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      // Abort any in-flight search when component unmounts
      searchAbortControllerRef.current?.abort();
    };
  }, []);

  const handleStar = async (repo: Repository) => {
    try {
      // Clear pending unstar (if it exists) since user is re-starring
      clearPendingUnstar(repo.id);

      // Star the repository on GitHub
      const token = getValidGitHubToken(providerToken);
      await starRepository(token, repo.owner.login, repo.name);

      // Update repositories to mark as starred
      setRepositories((prev) =>
        prev.map((r) => (r.id === repo.id ? { ...r, is_starred: true } : r))
      );
    } catch (err) {
      if (isReauthError(err)) return;
      alert(`Failed to star repository: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleUnstar = async (repo: Repository) => {
    try {
      // Show confirmation dialog
      const confirmMessage = `Are you sure you want to unstar "${repo.name}" on GitHub?\n\nNote: Due to GitHub API delays, this repository may briefly reappear if you refresh the page. The change typically syncs within 30-45 seconds.`;
      if (!window.confirm(confirmMessage)) {
        return;
      }

      // Unstar the repository on GitHub
      const token = getValidGitHubToken(providerToken);
      await unstarRepository(token, repo.owner.login, repo.name);

      // Hide repo until GitHub API syncs
      markPendingUnstar(repo.id);

      // Update repositories to mark as unstarred
      setRepositories((prev) =>
        prev.map((r) => (r.id === repo.id ? { ...r, is_starred: false } : r))
      );
    } catch (err) {
      if (isReauthError(err)) return;
      alert(`Failed to unstar repository: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Handle page changes for prepaginated data (API search results)
  const handleSearchPageChange = useCallback(
    (page: number) => {
      // Allow pagination when:
      // 1. There's an explicit search query, OR
      // 2. The filter is 'all' (which shows popular repos even without a query)
      if (searchQuery.trim() || filterBy === 'all') {
        void performSearch(searchQuery, filterBy, page);
      }
    },
    [searchQuery, filterBy, performSearch]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Repository Dashboard</h2>
          <p className="mt-2 text-gray-600">
            {searchQuery
              ? `Searching for "${searchQuery}"${isSearching ? '...' : ''}`
              : 'Track and manage your starred GitHub repositories'}
          </p>

          {/* Repository limit warning */}
          {repoLimitReached && !searchQuery && filterBy === 'starred' && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-amber-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">
                    Showing first {totalReposFetched} of {totalStarredRepos} starred repositories
                  </h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>
                      {totalStarredRepos - totalReposFetched} repositories aren't displayed for
                      performance reasons. Use search in Repo Radar to find specific repositories,
                      or view all starred repositories on GitHub.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <RepositoryList
          repositories={repositories}
          isLoading={isLoading}
          error={error}
          onStar={handleStar}
          onUnstar={handleUnstar}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
          isSearching={isSearching}
          dataIsPrepaginated={dataIsPrepaginated}
          filterBy={filterBy}
          onFilterChange={handleFilterChange}
          itemsPerPage={ITEMS_PER_PAGE}
          currentPage={currentPage}
          totalPages={totalPages}
          hasMoreResults={hasMoreResults}
          onPrepaginatedPageChange={handleSearchPageChange}
          apiSearchResultTotal={apiSearchResultTotal}
        />
      </div>
    </div>
  );
};

export default Dashboard;
