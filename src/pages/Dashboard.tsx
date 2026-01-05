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
import type { Repository } from '../types';
import {
  filterOutLocallyUnstarred,
  addToLocallyUnstarred,
  removeFromLocallyUnstarred,
} from '../utils/repository-filter';

const Dashboard = () => {
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [starredRepositories, setStarredRepositories] = useState<Repository[]>([]);
  const [searchResults, setSearchResults] = useState<Repository[]>([]);
  const [starredRepos, setStarredRepos] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isShowingSearchResults, setIsShowingSearchResults] = useState(false);
  const [filterBy, setFilterBy] = useState<'all' | 'starred'>('starred');
  const [error, setError] = useState<Error | null>(null);
  const [searchPage, setSearchPage] = useState(1);
  const [totalSearchPages, setTotalSearchPages] = useState(0);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [effectiveTotal, setEffectiveTotal] = useState<number | undefined>();
  const [repoLimitReached, setRepoLimitReached] = useState(false);
  const [totalReposFetched, setTotalReposFetched] = useState(0);
  const [totalStarredRepos, setTotalStarredRepos] = useState(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

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

  // Load starred repositories on mount
  useEffect(() => {
    const loadStarredRepositories = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch real data from GitHub API
        // This will throw an error if session or provider_token is missing
        const result = await fetchAllStarredRepositories(session);
        const filteredRepos = filterOutLocallyUnstarred(result.repositories);
        setStarredRepositories(result.repositories);
        setRepositories(filteredRepos); // Initially show starred repos with filtering applied

        // Track if we hit the repository limit
        setRepoLimitReached(false); // No longer tracking isLimited from starred repos
        setTotalReposFetched(result.totalFetched);
        setTotalStarredRepos(result.totalStarred);

        // Load starred repos from localStorage
        const savedStars = localStorage.getItem('followedRepos');
        if (savedStars) {
          const starredIds = JSON.parse(savedStars) as number[];
          setStarredRepos(new Set(starredIds));
        }
      } catch (err) {
        // Check if it's a GitHub auth error and provide a more user-friendly message
        if (err instanceof Error && err.message.includes('No GitHub access token')) {
          setError(
            new Error(
              'Your GitHub session has expired. Please sign out and sign in again to reconnect your GitHub account.'
            )
          );
        } else {
          setError(err instanceof Error ? err : new Error('Failed to load repositories'));
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (user && !authLoading) {
      void loadStarredRepositories();
    }
  }, [user, session, authLoading]);

  // Search repositories with appropriate API based on filter
  const performSearch = useCallback(
    async (query: string, filter: 'all' | 'starred', page = 1) => {
      if (!query.trim()) {
        if (filter === 'starred') {
          // Show starred repositories with filtering applied
          setSearchResults([]);
          setRepositories(filterOutLocallyUnstarred(starredRepositories));
          setIsShowingSearchResults(false);
          setSearchPage(1);
          setTotalSearchPages(0);
          setHasMoreResults(false);
          setEffectiveTotal(undefined);
          return;
        } else {
          // For 'all' filter with empty query, search for most starred repositories
          query = 'stars:>1'; // Get repositories with at least 1 star, sorted by stars desc
        }
      }

      // Set searching state immediately
      setIsSearching(true);

      if (session?.provider_token) {
        try {
          let results: Repository[];
          const perPage = 30;

          if (filter === 'starred') {
            // Search within starred repositories only
            const starredResponse = await searchStarredRepositories(
              session,
              query,
              page,
              perPage,
              starredRepositories
            );
            results = starredResponse.repositories;

            // Set pagination info for client-side filtered starred repos
            const totalPages = Math.ceil(starredResponse.totalCount / perPage);
            setTotalSearchPages(totalPages);
            setHasMoreResults(page < totalPages);
            setEffectiveTotal(starredResponse.effectiveTotal);
          } else {
            // Search all GitHub repositories
            const searchResponse = await searchRepositories(session, query, page, perPage);
            results = searchResponse.repositories;

            // Set pagination info based on GitHub API response
            const totalPages = Math.ceil(searchResponse.effectiveTotal / perPage);
            setTotalSearchPages(totalPages);
            setHasMoreResults(page < totalPages);
            setEffectiveTotal(searchResponse.effectiveTotal);
          }

          setSearchResults(results);
          setRepositories(filterOutLocallyUnstarred(results));
          setIsShowingSearchResults(true);
          setSearchPage(page);
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Search failed'));
        } finally {
          setIsSearching(false);
        }
      } else {
        // No token, search locally in starred repos only
        const localQuery = query.toLowerCase();
        const localMatches = starredRepositories.filter((repo) => {
          const searchIn = [
            repo.name,
            repo.full_name,
            repo.description || '',
            repo.language || '',
            ...(repo.topics || []),
          ]
            .join(' ')
            .toLowerCase();
          return searchIn.includes(localQuery);
        });

        setRepositories(filterOutLocallyUnstarred(localMatches));
        setIsShowingSearchResults(true);
        setSearchPage(1);
        setTotalSearchPages(0);
        setHasMoreResults(false);
        setIsSearching(false);
      }
    },
    [session, starredRepositories]
  );

  // Handle search input changes (just updates the input value, no search)
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Handle search submission (when user clicks search button or hits enter)
  const handleSearchSubmit = useCallback(
    (query: string) => {
      // Clear any existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Reset to page 1 for new searches
      setSearchPage(1);

      // Perform search immediately
      void performSearch(query, filterBy, 1);
    },
    [performSearch, filterBy]
  );

  // Handle filter changes (immediate, no debouncing)
  const handleFilterChange = useCallback(
    (filter: 'all' | 'starred') => {
      setFilterBy(filter);
      setSearchPage(1); // Reset to page 1 when changing filters

      // If there's a search query, re-run search with new filter
      if (searchQuery.trim()) {
        void performSearch(searchQuery, filter, 1);
      } else {
        // No search query, use performSearch to handle appropriate default view based on filter
        void performSearch('', filter, 1);
      }
    },
    [performSearch, searchQuery]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    const timeoutRef = searchTimeoutRef.current;
    return () => {
      if (timeoutRef) {
        clearTimeout(timeoutRef);
      }
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
      await starRepository(session, repo.owner.login, repo.name);

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
      await unstarRepository(session, repo.owner.login, repo.name);

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
      alert(`Failed to unstar repository: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Handle search page changes
  const handleSearchPageChange = useCallback(
    (page: number) => {
      if (searchQuery.trim()) {
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
          starredRepos={starredRepos}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
          isSearching={isSearching}
          isShowingSearchResults={isShowingSearchResults}
          filterBy={filterBy}
          onFilterChange={handleFilterChange}
          itemsPerPage={30}
          searchPage={searchPage}
          totalSearchPages={totalSearchPages}
          hasMoreResults={hasMoreResults}
          onSearchPageChange={handleSearchPageChange}
          effectiveTotal={effectiveTotal}
        />
      </div>
    </div>
  );
};

export default Dashboard;
