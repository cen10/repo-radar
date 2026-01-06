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
  filterOutLocallyUnstarred,
  addToLocallyUnstarred,
  removeFromLocallyUnstarred,
} from '../utils/repository-filter';

const ITEMS_PER_PAGE = 30;

const Dashboard = () => {
  const { user, providerToken, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [starredRepositories, setStarredRepositories] = useState<Repository[]>([]);
  const [searchResults, setSearchResults] = useState<Repository[]>([]);
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
    const stored = localStorage.getItem('locallyUnstarredRepos');
    if (stored) {
      const entries = JSON.parse(stored);
      const now = Date.now();
      const validEntries = entries.filter(
        (entry: { timestamp: number }) => now - entry.timestamp < 60000 // 1 minute
      );

      if (validEntries.length !== entries.length) {
        localStorage.setItem('locallyUnstarredRepos', JSON.stringify(validEntries));
      }
    }

    // Listen for localStorage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'locallyUnstarredRepos') {
        // Refresh current repository list
        setRepositories((prev) => filterOutLocallyUnstarred(prev));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Load starred repositories when auth is ready
  useEffect(() => {
    // Guard: skip if load already started - Prevents overwriting search results
    if (initialLoadStartedRef.current) {
      return;
    }

    const loadStarredRepositories = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = getValidGitHubToken(providerToken);

        const result = await fetchAllStarredRepositories(token);
        const filteredRepos = filterOutLocallyUnstarred(result.repositories);
        setStarredRepositories(result.repositories);
        setRepositories(filteredRepos);

        setRepoLimitReached(result.isLimited);
        setTotalReposFetched(result.totalFetched);
        setTotalStarredRepos(result.totalStarred);
      } catch (err) {
        // Reset flag on error so retry is possible
        initialLoadStartedRef.current = false;
        if (isReauthError(err)) return;
        setError(err instanceof Error ? err : new Error('Failed to load repositories'));
      } finally {
        setIsLoading(false);
      }
    };

    if (user && !authLoading) {
      // Set flag synchronously BEFORE async work to prevent duplicate fetches
      initialLoadStartedRef.current = true;
      void loadStarredRepositories();
    }
  }, [user, providerToken, authLoading, signOut, navigate, isReauthError]);

  // Reset to default starred repos view (no API call, client-side pagination)
  const showDefaultStarredView = useCallback(() => {
    setSearchResults([]);
    setRepositories(filterOutLocallyUnstarred(starredRepositories));
    setDataIsPrepaginated(false);
    setCurrentPage(1);
    setTotalPages(0);
    setHasMoreResults(false);
    setApiSearchResultTotal(undefined);
  }, [starredRepositories]);

  // Search within user's starred repositories via API
  const searchWithinStarredRepos = useCallback(
    async (query: string, page: number, signal?: AbortSignal) => {
      const token = getValidGitHubToken(providerToken);
      const starredResponse = await searchStarredRepositories(
        token,
        query,
        page,
        ITEMS_PER_PAGE,
        starredRepositories,
        signal
      );

      const totalPages = Math.ceil(starredResponse.totalCount / ITEMS_PER_PAGE);

      setSearchResults(starredResponse.repositories);
      setRepositories(filterOutLocallyUnstarred(starredResponse.repositories));
      setDataIsPrepaginated(true);
      setCurrentPage(page);
      setTotalPages(totalPages);
      setHasMoreResults(page < totalPages);
      setApiSearchResultTotal(starredResponse.apiSearchResultTotal);
    },
    [providerToken, starredRepositories]
  );

  // Search all GitHub repositories via API
  const searchAllGitHubRepos = useCallback(
    async (query: string, page: number, signal?: AbortSignal) => {
      const token = getValidGitHubToken(providerToken);
      const searchResponse = await searchRepositories(token, query, page, ITEMS_PER_PAGE, signal);

      const totalPages = Math.ceil(searchResponse.apiSearchResultTotal / ITEMS_PER_PAGE);

      setSearchResults(searchResponse.repositories);
      setRepositories(filterOutLocallyUnstarred(searchResponse.repositories));
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
        showDefaultStarredView();
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

  const handleStar = async (repoId: number) => {
    try {
      // Remove from locally unstarred list immediately
      removeFromLocallyUnstarred(repoId);

      // Find the repository to get owner and name
      const repo =
        repositories.find((r) => r.id === repoId) ||
        searchResults.find((r) => r.id === repoId) ||
        starredRepositories.find((r) => r.id === repoId);

      if (!repo) {
        throw new Error('Repository not found');
      }

      // Star the repository on GitHub
      const token = getValidGitHubToken(providerToken);
      await starRepository(token, repo.owner.login, repo.name);

      // Update local state to reflect the change immediately
      setStarredRepos((prev) => {
        const newSet = new Set(prev);
        newSet.add(repoId);
        return newSet;
      });

      // Update the repository lists to mark it as starred
      const updateRepoList = (repos: Repository[]) =>
        repos.map((r) => (r.id === repoId ? { ...r, is_starred: true } : r));

      setRepositories(updateRepoList);
      setSearchResults(updateRepoList);
      setStarredRepositories(updateRepoList);
    } catch (err) {
      if (isReauthError(err)) return;
      alert(`Failed to star repository: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleUnstar = async (repoId: number) => {
    try {
      // Find the repository to get owner and name
      const repo =
        repositories.find((r) => r.id === repoId) ||
        searchResults.find((r) => r.id === repoId) ||
        starredRepositories.find((r) => r.id === repoId);

      if (!repo) {
        throw new Error('Repository not found');
      }

      // Show confirmation dialog
      const confirmMessage = `Are you sure you want to unstar "${repo.name}" on GitHub?\n\nNote: Due to GitHub API delays, this repository may briefly reappear if you refresh the page. The change typically syncs within 30-45 seconds.`;
      if (!window.confirm(confirmMessage)) {
        return;
      }

      // Unstar the repository on GitHub
      const token = getValidGitHubToken(providerToken);
      await unstarRepository(token, repo.owner.login, repo.name);

      // Add to locally unstarred list to hide until GitHub API syncs
      addToLocallyUnstarred(repoId);

      // Update local state to reflect the change immediately
      setStarredRepos((prev) => {
        const newSet = new Set(prev);
        newSet.delete(repoId);
        return newSet;
      });

      // For search results, update the star status
      const updateSearchResults = (repos: Repository[]) =>
        repos.map((r) => (r.id === repoId ? { ...r, is_starred: false } : r));

      // For starred repositories list, REMOVE the unstarred repo entirely
      const removeFromStarred = (repos: Repository[]) => repos.filter((r) => r.id !== repoId);

      // If we're not in a search (showing starred repos), remove the repo from view
      if (!searchQuery) {
        setRepositories(filterOutLocallyUnstarred(removeFromStarred(repositories)));
      } else {
        // In search mode, just update the star status and apply filtering
        setRepositories(filterOutLocallyUnstarred(updateSearchResults(repositories)));
      }

      setSearchResults(updateSearchResults(searchResults));
      setStarredRepositories(removeFromStarred(starredRepositories));
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
