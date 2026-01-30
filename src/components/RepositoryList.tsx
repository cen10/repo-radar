import { useEffect, useRef, useCallback, type ReactNode } from 'react';
import type { Repository } from '../types';
import { RepoCard } from './RepoCard';
import { LoadingSpinner } from './icons';
import { SearchBar } from './SearchBar';
import { SortDropdown } from './SortDropdown';
import { NoSearchResultsState } from './EmptyState';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { MAX_STARRED_REPOS } from '../services/github';

export type SortOption = 'updated' | 'created' | 'stars' | 'forks' | 'help-wanted' | 'best-match';

export interface SortOptionConfig {
  value: SortOption;
  label: string;
}

interface RepositoryListProps {
  // null = pre-search state, [] = no results, [...repos] = has results
  repositories: Repository[] | null;
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  isSearching: boolean;
  hasActiveSearch: boolean;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onLoadMore: () => void;
  title: string;
  titleIcon: React.ReactElement;
  searchPlaceholder: string;
  sortOptions: SortOptionConfig[];
  // Empty state when no data and not searching (e.g., NoStarredReposState)
  // Optional for search-first pages where this state is unreachable
  emptyState?: ReactNode;
  // Pre-search state (repositories === null) - for search-first pages like Explore
  preSearchMessage?: string;
  preSearchHint?: string;
  // Optional: total starred repos for showing "hit the cap" warning
  totalStarred?: number;
}

const RepositoryList = ({
  repositories,
  isLoading,
  isFetchingMore,
  hasMore,
  error,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  isSearching,
  hasActiveSearch,
  sortBy,
  onSortChange,
  onLoadMore,
  title,
  titleIcon,
  searchPlaceholder,
  sortOptions,
  emptyState,
  preSearchMessage,
  preSearchHint,
  totalStarred,
}: RepositoryListProps) => {
  // Guard against duplicate fetches from rapid IntersectionObserver callbacks.
  // isFetchingMore prop won't be true until React re-renders, but the observer
  // can fire multiple times before that. This ref provides synchronous protection.
  // See: https://github.com/TanStack/query/issues/6689
  const isFetchingRef = useRef(false);

  useEffect(() => {
    isFetchingRef.current = isFetchingMore;
  }, [isFetchingMore, sortBy]);

  const canLoadMore = hasMore && !isFetchingMore && !isLoading;

  const handleLoadMore = useCallback(() => {
    if (!isFetchingRef.current && canLoadMore) {
      isFetchingRef.current = true;
      onLoadMore();
    }
  }, [canLoadMore, onLoadMore]);

  // Set up intersection observer for infinite scroll
  const { ref: loadMoreRef, isIntersecting } = useIntersectionObserver({
    enabled: canLoadMore,
    rootMargin: '200px',
  });

  useEffect(() => {
    if (isIntersecting) {
      handleLoadMore();
    }
  }, [isIntersecting, handleLoadMore]);

  // Loading state (show *full page* spinner only for initial load)
  if (isLoading && repositories?.length === 0 && !isSearching) {
    return (
      <div className="flex justify-center items-center min-h-[400px]" role="status">
        <LoadingSpinner className="h-12 w-12 text-indigo-600" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12" role="alert">
        <p className="text-red-600 mb-4">Error loading repositories</p>
        <p className="text-sm text-gray-600 mb-4">{error.message}</p>
      </div>
    );
  }

  // Controls - search and sort
  const controls = (
    <div>
      {/* Header */}
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900 mb-6">
        {titleIcon}
        {title}
      </h1>

      {/* Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchBar
          id="repo-search"
          value={searchQuery}
          onChange={onSearchChange}
          onSubmit={onSearchSubmit}
          placeholder={searchPlaceholder}
        />
        <SortDropdown value={sortBy} onChange={onSortChange} options={sortOptions} />
      </div>

      {/* Hidden aria-live region for screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {repositories !== null && repositories.length === 0 && hasActiveSearch && (
          <>No repositories found. Try a different search term.</>
        )}
      </div>
    </div>
  );

  // Pre-search state (repositories === null) - for search-first pages like Explore
  if (repositories === null) {
    return (
      <div data-testid="repository-list">
        {controls}
        <div className="text-center py-16">
          <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
          <p className="mt-4 text-lg font-medium text-gray-900">
            {preSearchMessage ?? 'Discover repositories'}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            {preSearchHint ?? 'Search to find repositories'}
          </p>
        </div>
      </div>
    );
  }

  // Empty state: no results
  if (repositories.length === 0 && !isLoading && !isSearching) {
    const handleClearSearch = () => {
      onSearchChange('');
      onSearchSubmit('');
    };

    return (
      <div data-testid="repository-list">
        {controls}
        {hasActiveSearch ? <NoSearchResultsState onClearSearch={handleClearSearch} /> : emptyState}
      </div>
    );
  }

  return (
    <div>
      {controls}

      {/* Repository Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isSearching && repositories.length === 0 && (
          <div className="col-span-full flex justify-center items-center py-8" role="status">
            <LoadingSpinner className="h-8 w-8 text-indigo-600" />
            <span className="ml-3 text-gray-500">Searching...</span>
          </div>
        )}
        {repositories.map((repo) => (
          <RepoCard key={repo.id} repository={repo} />
        ))}
      </div>

      {/* Loading More Indicator */}
      {isFetchingMore && (
        <div className="flex justify-center items-center py-8" role="status">
          <LoadingSpinner className="h-8 w-8 text-indigo-600" />
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
          {totalStarred && totalStarred > MAX_STARRED_REPOS ? (
            <>
              <p>
                {repositories.length === 1 ? '1 repository' : `${repositories.length} repositories`}
              </p>
              <p className="text-sm mt-1">
                {`Searched ${MAX_STARRED_REPOS} of ${totalStarred} starred repos. `}
                <a
                  href="https://github.com/stars"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  View all on GitHub
                </a>
              </p>
            </>
          ) : (
            <p>
              {repositories.length === 1 ? '1 repository' : `${repositories.length} repositories`}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default RepositoryList;
