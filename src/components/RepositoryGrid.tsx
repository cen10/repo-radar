import { useEffect, useRef, useCallback, type ReactNode } from 'react';
import type { Repository } from '../types';
import { RepoCard } from './RepoCard';
import { LoadingSpinner } from './icons';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

interface RepositoryGridProps {
  repositories: Repository[];
  isSearching?: boolean;
  isFetchingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  sortBy: string;
  footer?: ReactNode;
}

export function RepositoryGrid({
  repositories,
  isSearching = false,
  isFetchingMore = false,
  hasMore = false,
  onLoadMore,
  sortBy,
  footer,
}: RepositoryGridProps) {
  // Guard against duplicate fetches from rapid IntersectionObserver callbacks.
  // isFetchingMore prop won't be true until React re-renders, but the observer
  // can fire multiple times before that. This ref provides synchronous protection.
  // See: https://github.com/TanStack/query/issues/6689
  const isFetchingRef = useRef(false);

  // Reset ref when fetch completes.
  useEffect(() => {
    if (!isFetchingMore) {
      isFetchingRef.current = false;
    }
  }, [isFetchingMore]);

  // Reset ref when sort changes (creates a new query, not fetching "next" page).
  useEffect(() => {
    isFetchingRef.current = false;
  }, [sortBy]);

  const canLoadMore = hasMore && !isFetchingMore && !isSearching && !!onLoadMore;

  const handleLoadMore = useCallback(() => {
    if (!isFetchingRef.current && canLoadMore && onLoadMore) {
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

  return (
    <div>
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

      {/* Footer (end of results, count, etc.) */}
      {!hasMore && repositories.length > 0 && !isSearching && footer && (
        <div className="text-center py-4 text-gray-500">{footer}</div>
      )}
    </div>
  );
}
