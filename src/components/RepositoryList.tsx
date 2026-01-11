import { useEffect, useRef, useCallback } from 'react';
import type { Repository } from '../types';
import { RepoCard } from './RepoCard';
import { MagnifyingGlassIcon, StarIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

export type SortOption = 'updated' | 'created' | 'stars' | 'forks' | 'help-wanted' | 'best-match';
export type ViewMode = 'starred' | 'all';

interface RepositoryListProps {
  repositories: Repository[];
  isLoading?: boolean;
  isFetchingMore?: boolean;
  hasMore?: boolean;
  error?: Error | null;
  onStar: (repo: Repository) => void;
  onUnstar: (repo: Repository) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  isSearching?: boolean;
  viewMode: ViewMode;
  onViewChange: (view: ViewMode) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onLoadMore: () => void;
}

const RepositoryList = ({
  repositories,
  isLoading = false,
  isFetchingMore = false,
  hasMore = false,
  error = null,
  onStar,
  onUnstar,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  isSearching = false,
  viewMode,
  onViewChange,
  sortBy,
  onSortChange,
  onLoadMore,
}: RepositoryListProps) => {
  // Track if we've already triggered a fetch to prevent race conditions
  const isFetchingRef = useRef(false);

  // Reset the fetching ref when isFetchingMore changes or when sort/view changes
  useEffect(() => {
    if (isFetchingMore) {
      isFetchingRef.current = true;
    } else {
      isFetchingRef.current = false;
    }
  }, [isFetchingMore]);

  // Reset fetching state when sort or view changes
  useEffect(() => {
    isFetchingRef.current = false;
  }, [sortBy, viewMode]);

  // Stable callback that checks conditions before fetching
  const handleLoadMore = useCallback(() => {
    if (!isFetchingRef.current && hasMore && !isFetchingMore && !isLoading) {
      isFetchingRef.current = true;
      onLoadMore();
    }
  }, [hasMore, isFetchingMore, isLoading, onLoadMore]);

  // Set up intersection observer for infinite scroll
  const { ref: loadMoreRef, isIntersecting } = useIntersectionObserver({
    enabled: hasMore && !isFetchingMore && !isLoading,
    rootMargin: '200px', // Trigger early for smooth experience
  });

  // Auto-load more when sentinel is visible
  useEffect(() => {
    if (isIntersecting) {
      handleLoadMore();
    }
  }, [isIntersecting, handleLoadMore]);

  // Loading state (only show spinner for initial load, not search or load more)
  if (isLoading && repositories.length === 0 && !isSearching) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"
          role="status"
          aria-label="Loading"
        >
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    const isGitHubAuthError = error.message.includes('session has expired');

    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error loading repositories</p>
        <p className="text-sm text-gray-600 mb-4">{error.message}</p>
        {isGitHubAuthError && (
          <a
            href="/"
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Sign Out and Reconnect
          </a>
        )}
      </div>
    );
  }

  // Get sort options based on current view
  const getSortOptions = () => {
    if (viewMode === 'starred') {
      return [
        { value: 'updated', label: 'Recently Updated' },
        { value: 'created', label: 'Recently Starred' },
        { value: 'stars', label: 'Most Stars' },
      ];
    }
    // For "all" view, offer GitHub search sort options
    return [
      { value: 'best-match', label: 'Best Match' },
      { value: 'updated', label: 'Recently Updated' },
      { value: 'stars', label: 'Most Stars' },
      { value: 'forks', label: 'Most Forks' },
      { value: 'help-wanted', label: 'Help Wanted' },
    ];
  };

  const sortOptions = getSortOptions();

  // Controls - tabs, search, sort
  const controls = (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex" aria-label="Repository views">
          <button
            onClick={() => onViewChange('starred')}
            className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${
              viewMode === 'starred'
                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            aria-current={viewMode === 'starred' ? 'page' : undefined}
          >
            <span className="flex items-center justify-center gap-2">
              {viewMode === 'starred' ? (
                <StarIconSolid className="h-5 w-5" aria-hidden="true" />
              ) : (
                <StarIcon className="h-5 w-5" aria-hidden="true" />
              )}
              My Stars
            </span>
          </button>
          <button
            onClick={() => onViewChange('all')}
            className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${
              viewMode === 'all'
                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            aria-current={viewMode === 'all' ? 'page' : undefined}
          >
            <span className="flex items-center justify-center gap-2">
              <GlobeAltIcon className="h-5 w-5" aria-hidden="true" />
              Explore All
            </span>
          </button>
        </nav>
      </div>

      {/* Search and Sort */}
      <div className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <form
            className="flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const query = formData.get('search') as string;
              onSearchSubmit(query);
            }}
          >
            <div className="flex">
              <label htmlFor="repo-search" className="sr-only">
                {viewMode === 'starred'
                  ? 'Search your starred repositories'
                  : 'Search all GitHub repositories'}
              </label>
              <input
                id="repo-search"
                name="search"
                type="text"
                placeholder={
                  viewMode === 'starred'
                    ? 'Search your stars...'
                    : 'Search all GitHub repositories...'
                }
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white border border-indigo-600 rounded-r-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              >
                <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Search</span>
              </button>
            </div>
          </form>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 cursor-pointer"
            aria-label="Sort repositories"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hidden aria-live region for screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {repositories.length === 0 && (searchQuery || viewMode !== 'starred') ? (
          <>No repositories found</>
        ) : null}
      </div>
    </div>
  );

  // Empty state - no repositories at all
  if (repositories.length === 0 && !isLoading && !isSearching) {
    return (
      <div className="space-y-6" data-testid="repository-list">
        {controls}
        <div className="text-center py-12">
          <p className="text-gray-500">No repositories found</p>
          <p className="text-sm text-gray-400 mt-2">
            {searchQuery
              ? 'Try a different search term'
              : viewMode === 'starred'
                ? 'Star some repositories on GitHub to see them here'
                : 'Try searching for repositories above'}
          </p>
          {searchQuery && (
            <button
              onClick={() => {
                onSearchChange('');
                onSearchSubmit('');
              }}
              className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Clear search
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {controls}

      {/* Repository Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isSearching && repositories.length === 0 && (
          <div className="col-span-full flex justify-center items-center py-8">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
              role="status"
              aria-label="Searching"
            />
            <span className="ml-3 text-gray-500">Searching GitHub...</span>
          </div>
        )}
        {repositories.map((repo) => (
          <RepoCard
            key={repo.id}
            repository={repo}
            onToggleStar={() => {
              if (repo.is_starred) {
                onUnstar(repo);
              } else {
                onStar(repo);
              }
            }}
          />
        ))}
      </div>

      {/* Loading More Indicator */}
      {isFetchingMore && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          <span className="ml-3 text-gray-600">Loading more repositories...</span>
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      {hasMore && !isFetchingMore && (
        <div
          ref={loadMoreRef}
          className="h-4"
          aria-hidden="true"
          data-testid="load-more-sentinel"
        />
      )}

      {/* End of Results */}
      {!hasMore && repositories.length > 0 && !isSearching && (
        <div className="text-center py-4 text-gray-500">
          <p>
            {repositories.length === 1 ? '1 repository' : `${repositories.length} repositories`}
          </p>
        </div>
      )}
    </div>
  );
};

export default RepositoryList;
