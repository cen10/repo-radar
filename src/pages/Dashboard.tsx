import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import RepositoryList from '../components/RepositoryList';
import type { SortOption, FilterOption } from '../components/RepositoryList';
import { useAuth } from '../hooks/useAuth';
import { useInfiniteRepositories, type SortByOption } from '../hooks/useInfiniteRepositories';
import { useInfiniteSearch } from '../hooks/useInfiniteSearch';
import { starRepository, unstarRepository } from '../services/github';
import { GitHubReauthRequiredError, getValidGitHubToken } from '../services/github-token';
import type { Repository } from '../types';
import {
  excludePendingUnstars,
  markPendingUnstar,
  clearPendingUnstar,
} from '../utils/repository-filter';

const Dashboard = () => {
  const { user, providerToken, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<FilterOption>('starred');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [isSearching, setIsSearching] = useState(false);
  // State to trigger re-render when pending unstars change (value unused, only setter matters)
  const [, setPendingUnstarsVersion] = useState(0);

  // Determine if we're in search mode
  const isSearchMode = activeSearchQuery.trim().length > 0 || filterBy === 'all';

  // Infinite repositories for starred repos
  const {
    repositories: starredRepos,
    isLoading: isLoadingStarred,
    isFetchingNextPage: isFetchingMoreStarred,
    hasNextPage: hasMoreStarred,
    fetchNextPage: fetchMoreStarred,
    error: starredError,
  } = useInfiniteRepositories({
    token: providerToken,
    sortBy: sortBy as SortByOption,
    enabled: !isSearchMode && !!user,
  });

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
    query: activeSearchQuery || 'stars:>1', // Default to popular repos for "all" filter
    filter: filterBy,
    sortBy: sortBy as 'updated' | 'created' | 'stars',
    starredRepos: filterBy === 'starred' ? starredRepos : undefined,
    enabled: isSearchMode && !!user,
  });

  // Choose which data to display
  const repositories = isSearchMode
    ? excludePendingUnstars(searchResults)
    : excludePendingUnstars(starredRepos);
  const isLoading = isSearchMode ? isLoadingSearch : isLoadingStarred;
  const isFetchingMore = isSearchMode ? isFetchingMoreSearch : isFetchingMoreStarred;
  const hasMore = isSearchMode ? hasMoreSearch : hasMoreStarred;
  const error = isSearchMode ? searchError : starredError;
  const fetchMore = isSearchMode ? fetchMoreSearch : fetchMoreStarred;

  // Defensive handler for the unlikely case where no GitHub token is available
  const isReauthError = useCallback(
    (err: unknown): boolean => {
      if (err instanceof GitHubReauthRequiredError) {
        void signOut()
          .catch(() => {})
          .then(() => navigate('/login'));
        return true;
      }
      return false;
    },
    [signOut, navigate]
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      void navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Handle reauth errors from query hooks
  useEffect(() => {
    if (error) {
      isReauthError(error);
    }
  }, [error, isReauthError]);

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

  // Handle search input changes
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Handle search submission
  const handleSearchSubmit = useCallback((query: string) => {
    setIsSearching(true);
    setActiveSearchQuery(query);
    // The useInfiniteSearch hook will automatically fetch when activeSearchQuery changes
    // Set searching to false after a brief delay to show the searching state
    setTimeout(() => setIsSearching(false), 100);
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((filter: FilterOption) => {
    setFilterBy(filter);
    // If switching to 'starred', clear any active search to show starred repos
    if (filter === 'starred') {
      setActiveSearchQuery('');
      setSearchQuery('');
    }
  }, []);

  // Handle sort changes
  const handleSortChange = useCallback((sort: SortOption) => {
    setSortBy(sort);
    // The useInfiniteRepositories hook will refetch with the new sort
  }, []);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    fetchMore();
  }, [fetchMore]);

  const handleStar = async (repo: Repository) => {
    try {
      const token = getValidGitHubToken(providerToken);
      await starRepository(token, repo.owner.login, repo.name);
      clearPendingUnstar(repo.id);
      setPendingUnstarsVersion((v) => v + 1);
      // Invalidate starred repositories cache to refetch with new star
      await queryClient.invalidateQueries({ queryKey: ['starredRepositories'] });
      await queryClient.invalidateQueries({ queryKey: ['allStarredRepositories'] });
    } catch (err) {
      if (isReauthError(err)) return;
      alert(`Failed to star repository: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleUnstar = async (repo: Repository) => {
    try {
      const confirmMessage = `Are you sure you want to unstar "${repo.name}" on GitHub?\n\nNote: Due to GitHub API delays, this repository may briefly reappear if you refresh the page. The change typically syncs within 30-45 seconds.`;
      if (!window.confirm(confirmMessage)) {
        return;
      }

      const token = getValidGitHubToken(providerToken);
      await unstarRepository(token, repo.owner.login, repo.name);
      markPendingUnstar(repo.id);
      // Trigger re-render to filter out the unstarred repo immediately
      setPendingUnstarsVersion((v) => v + 1);
      // Invalidate cache to refetch without the unstarred repo
      await queryClient.invalidateQueries({ queryKey: ['starredRepositories'] });
      await queryClient.invalidateQueries({ queryKey: ['allStarredRepositories'] });
    } catch (err) {
      if (isReauthError(err)) return;
      alert(`Failed to unstar repository: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

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
            {activeSearchQuery
              ? `Searching for "${activeSearchQuery}"${isSearching ? '...' : ''}`
              : 'Track and manage your starred GitHub repositories'}
          </p>
        </div>

        <RepositoryList
          repositories={repositories}
          isLoading={isLoading}
          isFetchingMore={isFetchingMore}
          hasMore={hasMore}
          error={error}
          onStar={handleStar}
          onUnstar={handleUnstar}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
          isSearching={isSearching}
          filterBy={filterBy}
          onFilterChange={handleFilterChange}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          onLoadMore={handleLoadMore}
        />
      </div>
    </div>
  );
};

export default Dashboard;
