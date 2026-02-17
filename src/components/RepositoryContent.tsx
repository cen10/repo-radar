import type { ReactNode } from 'react';
import type { Repository } from '../types';
import { RepositoryGrid } from './RepositoryGrid';
import { NoSearchResultsState } from './EmptyState';
import { LoadingSpinner } from './icons';

interface RepositoryContentProps {
  // State
  repositories: Repository[];
  isLoading: boolean;
  error: Error | null;

  // Search
  hasActiveSearch: boolean;
  onClearSearch: () => void;

  // Page-specific states
  emptyState?: ReactNode;
  preSearchState?: ReactNode;

  // Grid/infinite scroll (passed through to RepositoryGrid)
  isFetchingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  sortBy: string;
  footer?: ReactNode;
}

export function RepositoryContent({
  repositories,
  isLoading,
  error,
  hasActiveSearch,
  onClearSearch,
  emptyState,
  preSearchState,
  isFetchingMore = false,
  hasMore = false,
  onLoadMore,
  sortBy,
  footer,
}: RepositoryContentProps) {
  const isSearching = isLoading && hasActiveSearch;

  // 1. Pre-search state (Explore page only)
  if (preSearchState && !hasActiveSearch) {
    return <>{preSearchState}</>;
  }

  // 2. Initial loading (not searching, no repos yet)
  if (isLoading && repositories.length === 0 && !isSearching) {
    return (
      <div className="flex justify-center items-center min-h-[400px]" role="status">
        <LoadingSpinner className="h-12 w-12 text-indigo-600" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  // 3. Error state
  if (error) {
    return (
      <div className="text-center py-12" role="alert">
        <p className="text-red-600 mb-4">Error loading repositories</p>
        <p className="text-sm text-gray-600 mb-4">{error.message}</p>
      </div>
    );
  }

  // 4. Empty state (no data, not searching)
  if (repositories.length === 0 && !isLoading && !hasActiveSearch && emptyState) {
    return <>{emptyState}</>;
  }

  // 5. No search results
  if (repositories.length === 0 && !isLoading && hasActiveSearch) {
    return (
      <>
        <NoSearchResultsState onClearSearch={onClearSearch} />
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          No repositories found. Try a different search term.
        </div>
      </>
    );
  }

  // 6. Show grid (has repos or currently searching)
  return (
    <>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {repositories.length > 0 && !isSearching && (
          <>{`${repositories.length} ${repositories.length === 1 ? 'repository' : 'repositories'} found.`}</>
        )}
      </div>
      <RepositoryGrid
        repositories={repositories}
        isSearching={isSearching}
        isFetchingMore={isFetchingMore}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        sortBy={sortBy}
        footer={footer}
      />
    </>
  );
}
