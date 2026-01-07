import React, { useEffect } from 'react';
import type { Repository } from '../types';
import { RepoCard } from './RepoCard';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

export type SortOption = 'updated' | 'created' | 'stars';
export type FilterOption = 'all' | 'starred';

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
  filterBy: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onLoadMore: () => void;
}

const RepositoryList: React.FC<RepositoryListProps> = ({
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
  filterBy,
  onFilterChange,
  sortBy,
  onSortChange,
  onLoadMore,
}) => {
  // Set up intersection observer for infinite scroll
  const { ref: loadMoreRef, isIntersecting } = useIntersectionObserver({
    enabled: hasMore && !isFetchingMore && !isLoading,
    rootMargin: '200px', // Trigger early for smooth experience
  });

  // Auto-load more when sentinel is visible
  useEffect(() => {
    if (isIntersecting && hasMore && !isFetchingMore && !isLoading) {
      onLoadMore();
    }
  }, [isIntersecting, hasMore, isFetchingMore, isLoading, onLoadMore]);

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
            href="/login"
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Sign Out and Reconnect
          </a>
        )}
      </div>
    );
  }

  // Controls - search, filter, sort
  const controls = (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="flex flex-col lg:flex-row gap-4">
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
              Search repositories
            </label>
            <input
              id="repo-search"
              name="search"
              type="text"
              placeholder='Search repositories... (use "quotes" for exact name match)'
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

        {/* Filter */}
        <select
          value={filterBy}
          onChange={(e) => onFilterChange(e.target.value as FilterOption)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 cursor-pointer"
          aria-label="Filter repositories"
        >
          <option value="starred">Starred Only</option>
          <option value="all">All Repositories</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 cursor-pointer"
          aria-label="Sort repositories"
        >
          <option value="updated">Recently Updated</option>
          <option value="created">Recently Starred</option>
          <option value="stars">Most Stars</option>
        </select>
      </div>

      {/* Hidden aria-live region for screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {repositories.length === 0 && (searchQuery || filterBy !== 'starred') ? (
          <>No repositories match your filters</>
        ) : null}
      </div>
    </div>
  );

  // Empty state - no repositories at all
  if (repositories.length === 0 && !isLoading && !isSearching) {
    return (
      <div className="space-y-6">
        {controls}
        <div className="text-center py-12">
          <p className="text-gray-500">No repositories found</p>
          <p className="text-sm text-gray-400 mt-2">
            {searchQuery
              ? 'Try a different search term'
              : 'Star some repositories on GitHub to see them here'}
          </p>
          {(searchQuery || filterBy !== 'starred') && (
            <button
              onClick={() => {
                onSearchChange('');
                onFilterChange('starred');
              }}
              className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Clear filters
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
          <div className="col-span-full text-center py-4">
            <span className="text-gray-500">Searching GitHub...</span>
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
