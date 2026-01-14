import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import RepositoryList from '../components/RepositoryList';
import type { SortOption, ViewMode } from '../components/RepositoryList';
import { LoadingSpinner } from '../components/icons';
import { useAuth } from '../hooks/useAuth';
import { useAllStarredRepositories } from '../hooks/useAllStarredRepositories';
import {
  usePaginatedStarredRepositories,
  type PaginatedSortOption,
} from '../hooks/usePaginatedStarredRepositories';
import { useInfiniteSearch, type SearchModeConfig } from '../hooks/useInfiniteSearch';
import { useStarredIds } from '../hooks/useStarredIds';
import {
  starRepository,
  unstarRepository,
  type SearchSortOption,
  type StarredSearchSortOption,
} from '../services/github';
import { GitHubReauthRequiredError, getValidGitHubToken } from '../services/github-token';
import type { Repository } from '../types';
import {
  excludePendingUnstars,
  applyPendingUnstarStatus,
  markPendingUnstar,
  clearPendingUnstar,
} from '../utils/repository-filter';
import { logger } from '../utils/logger';

// Type for search query pages
interface SearchPage {
  repositories: Repository[];
  totalCount: number;
  apiSearchResultTotal: number;
}

/**
 * Helper to optimistically update is_starred in all search query caches.
 * React Query stores infinite queries as pages, so we need to map through all of them.
 */
function updateSearchCacheStarStatus(
  queryClient: ReturnType<typeof useQueryClient>,
  repoId: number,
  isStarred: boolean
) {
  // Get all search query cache entries and update them
  queryClient.setQueriesData<InfiniteData<SearchPage>>(
    { queryKey: ['searchRepositories'] },
    (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page) => ({
          ...page,
          repositories: page.repositories.map((repo) =>
            repo.id === repoId ? { ...repo, is_starred: isStarred } : repo
          ),
        })),
      };
    }
  );
}

const Dashboard = () => {
  const { user, providerToken, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('starred');
  const [sortBy, setSortBy] = useState<SortOption>('created'); // Default: Recently Starred for My Stars tab
  // State to trigger re-render when pending unstars change (value unused, only setter matters)
  const [, setPendingUnstarsVersion] = useState(0);

  const isSearchMode = activeSearchQuery.trim().length > 0 || viewMode === 'all';
  const isStarsSort = sortBy === 'stars';

  const { addRepoToStarredCache, removeRepoFromStarredCache } = useStarredIds({
    token: providerToken,
  });

  // Both the useAllStarredRepositories and usePaginatedStarredRepositories hooks are always
  // called (Rules of Hooks), but only one fetches at a time. React Query's `enabled` flag
  // prevents network requests when false. Stars sorting requires all repos client-side;
  // other sorts use server-side pagination.

  // Starred repos - bulk fetch for sorting by star count
  const {
    repositories: allStarredRepos,
    totalStarred,
    isLoading: isLoadingAllStarred,
    error: allStarredError,
  } = useAllStarredRepositories({
    token: providerToken,
    // Always fetch to pre-warm cache for useStarredIds (used to mark
    // is_starred on search results). With staleTime: Infinity, this only
    // makes API calls on first load (or after page refresh).
    enabled: !!user,
  });

  // Starred repos - paginated fetch for server-side sorting
  const {
    repositories: paginatedRepos,
    isLoading: isLoadingPaginatedStarred,
    isFetchingNextPage: isFetchingMoreStarred,
    hasNextPage: hasMoreStarred,
    fetchNextPage: fetchMoreStarred,
    error: paginatedError,
  } = usePaginatedStarredRepositories({
    token: providerToken,
    sortBy: sortBy as PaginatedSortOption,
    enabled: !isSearchMode && !isStarsSort,
  });

  // Combine results from whichever hook is active
  const starredRepos = isStarsSort ? allStarredRepos : paginatedRepos;
  const isLoadingStarred = isLoadingAllStarred || isLoadingPaginatedStarred;
  const starredError = allStarredError || paginatedError;

  // Build type-safe search config based on view mode
  // The discriminated union ensures we pass valid mode+sortBy combinations
  const searchModeConfig: SearchModeConfig =
    viewMode === 'all'
      ? { mode: 'all', sortBy: sortBy as SearchSortOption }
      : { mode: 'starred', sortBy: sortBy as StarredSearchSortOption };

  // Infinite search results
  const {
    repositories: searchResults,
    isLoading: isLoadingSearch,
    isFetchingNextPage: isFetchingMoreSearch,
    hasNextPage: hasMoreSearch,
    fetchNextPage: fetchMoreSearch,
    error: searchError,
  } = useInfiniteSearch({
    token: providerToken,
    query: activeSearchQuery || 'stars:>1', // Default to popular repos for "all" view
    ...searchModeConfig,
    enabled: isSearchMode && !!user,
  });

  // Choose which data to display
  // - In "My Stars" view: hide pending unstars (they shouldn't appear in starred list)
  // - In "Explore All" view: keep visible but mark as unstarred (override stale API data)
  const repositories = isSearchMode
    ? applyPendingUnstarStatus(searchResults)
    : excludePendingUnstars(starredRepos);
  const isLoading = isSearchMode ? isLoadingSearch : isLoadingStarred;
  const isFetchingMore = isSearchMode ? isFetchingMoreSearch : isFetchingMoreStarred;
  const hasMore = isSearchMode ? hasMoreSearch : hasMoreStarred;
  const error = isSearchMode ? searchError : starredError;
  const fetchMore = isSearchMode ? fetchMoreSearch : fetchMoreStarred;

  // Defensive handler for the unlikely case where no GitHub token is available
  const handleIfReauthError = useCallback(
    (err: unknown): boolean => {
      if (err instanceof GitHubReauthRequiredError) {
        void signOut()
          .catch(() => {})
          .then(() => navigate('/'));
        return true;
      }
      return false;
    },
    [signOut, navigate]
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      void navigate('/');
    }
  }, [user, authLoading, navigate]);

  // Check if any query error requires re-authentication
  useEffect(() => {
    if (error) {
      handleIfReauthError(error);
    }
  }, [error, handleIfReauthError]);

  // Handle localStorage cleanup and cross-tab synchronization
  useEffect(() => {
    const stored = localStorage.getItem('pendingUnstars');
    if (stored) {
      const entries = JSON.parse(stored);
      const now = Date.now();
      const validEntries = entries.filter(
        (entry: { timestamp: number }) => now - entry.timestamp < 60000
      );
      if (validEntries.length !== entries.length) {
        localStorage.setItem('pendingUnstars', JSON.stringify(validEntries));
      }
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pendingUnstars') {
        // Trigger re-render to apply updated pending unstars filter
        setPendingUnstarsVersion((v) => v + 1);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleSearchSubmit = useCallback((query: string) => {
    setActiveSearchQuery(query);
    // The useInfiniteSearch hook will automatically fetch when activeSearchQuery changes
  }, []);

  const handleViewChange = useCallback((view: ViewMode) => {
    setViewMode(view);
    if (view === 'starred') {
      // Clear any active search to show starred repos
      setActiveSearchQuery('');
      setSearchQuery('');
      // Default to Recently Starred for My Stars tab
      setSortBy('created');
    } else {
      // Default to Best Match for Explore All tab
      setSortBy('best-match');
    }
  }, []);

  const handleSortChange = useCallback((sort: SortOption) => {
    setSortBy(sort);
    // The useInfiniteRepositories hook will refetch with the new sort
  }, []);

  const handleLoadMore = useCallback(() => {
    fetchMore();
  }, [fetchMore]);

  const handleStar = (repo: Repository) => {
    // Optimistic update: Update UI immediately
    clearPendingUnstar(repo.id);
    setPendingUnstarsVersion((v) => v + 1);
    addRepoToStarredCache(repo);
    updateSearchCacheStarStatus(queryClient, repo.id, true);

    const performStar = async () => {
      try {
        const token = getValidGitHubToken(providerToken);
        await starRepository(token, repo.owner.login, repo.name);
        // Invalidate paginated cache to sync with server on next fetch
        await queryClient.invalidateQueries({ queryKey: ['starredRepositories'] });
      } catch (err) {
        // Revert optimistic update on failure
        removeRepoFromStarredCache(repo);
        updateSearchCacheStarStatus(queryClient, repo.id, false);
        setPendingUnstarsVersion((v) => v + 1);

        if (handleIfReauthError(err)) return;
        logger.error('Failed to star repository:', err);
        alert(`Failed to star repository: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };
    void performStar();
  };

  const handleUnstar = (repo: Repository) => {
    const confirmMessage = `Are you sure you want to unstar "${repo.name}" on GitHub?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Optimistic update: Update UI immediately after confirmation
    // Always mark as pending unstar to handle GitHub API sync delays on refresh
    // - In "My Stars" view: excludePendingUnstars hides the repo
    // - In "Explore All" view: applyPendingUnstarStatus marks it as unstarred
    markPendingUnstar(repo.id);
    setPendingUnstarsVersion((v) => v + 1);
    removeRepoFromStarredCache(repo);
    updateSearchCacheStarStatus(queryClient, repo.id, false);

    const performUnstar = async () => {
      try {
        const token = getValidGitHubToken(providerToken);
        await unstarRepository(token, repo.owner.login, repo.name);
        // Invalidate paginated cache to sync with server on next fetch
        await queryClient.invalidateQueries({ queryKey: ['starredRepositories'] });
      } catch (err) {
        // Revert optimistic update on failure
        clearPendingUnstar(repo.id);
        setPendingUnstarsVersion((v) => v + 1);
        addRepoToStarredCache(repo);
        updateSearchCacheStarStatus(queryClient, repo.id, true);

        if (handleIfReauthError(err)) return;
        logger.error('Failed to unstar repository:', err);
        alert(
          `Failed to unstar repository: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    };
    void performUnstar();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" role="status">
        <LoadingSpinner className="h-12 w-12 text-indigo-600" />
        <span className="sr-only">Loading...</span>
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
            {activeSearchQuery
              ? `Searching for "${activeSearchQuery}"${isLoading ? '...' : ''}`
              : 'Track and manage your starred GitHub repositories'}
          </p>
        </div>

        <RepositoryList
          repositories={repositories}
          totalStarred={isStarsSort ? totalStarred : undefined}
          isLoading={isLoading}
          isFetchingMore={isFetchingMore}
          hasMore={hasMore}
          error={error}
          onStar={handleStar}
          onUnstar={handleUnstar}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
          isSearching={isSearchMode && isLoading}
          hasActiveSearch={activeSearchQuery.trim().length > 0}
          viewMode={viewMode}
          onViewChange={handleViewChange}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          onLoadMore={handleLoadMore}
        />
      </div>
    </div>
  );
};

export default Dashboard;
