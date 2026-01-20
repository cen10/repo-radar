import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import RepositoryList, { type SortOption, type SortOptionConfig } from './RepositoryList';
import { LoadingSpinner } from './icons';
import { isGitHubAuthError } from '../utils/error';
import { logger } from '../utils/logger';
import type { Repository } from '../types';

/**
 * Common result shape from data fetching hooks.
 * Both usePaginatedStarredRepositories and useInfiniteSearch return this shape.
 */
interface DataResult {
  repositories: Repository[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: Error | null;
}

interface RepositoryListPageProps {
  // Content configuration
  title: string;
  searchPlaceholder: string;
  emptyStateMessage: string;
  emptyStateHint: string;

  // Data source - result object from your data hook
  result: DataResult;

  // Sort configuration
  sortOptions: SortOptionConfig[];
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;

  // Search state
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  hasActiveSearch: boolean;

  // Whether the current operation is a search (affects loading indicator text)
  isSearching: boolean;

  // Optional: custom pre-search UI (for Explore page's empty state)
  renderPreSearch?: () => React.ReactNode;

  // Optional: for showing "Showing X of Y" when results are capped
  totalStarred?: number;
  fetchedStarredCount?: number;
}

/**
 * Shared page component for displaying repository lists.
 *
 * Handles common concerns:
 * - Auth loading state
 * - Redirect to home when not authenticated
 * - Auto-signout on GitHub auth errors
 * - Consistent page layout
 *
 * Used by StarsPage, ExplorePage, and RadarPage.
 */
const RepositoryListPage = ({
  title,
  searchPlaceholder,
  emptyStateMessage,
  emptyStateHint,
  result,
  sortOptions,
  sortBy,
  onSortChange,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  hasActiveSearch,
  isSearching,
  renderPreSearch,
  totalStarred,
  fetchedStarredCount,
}: RepositoryListPageProps) => {
  const { repositories, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } = result;
  const { user, authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isGitHubAuthError(error)) {
      logger.info('GitHub token invalid, signing out user');
      sessionStorage.setItem('session_expired', 'true');
      void signOut();
    }
  }, [error, signOut]);

  useEffect(() => {
    if (!authLoading && !user) {
      void navigate('/');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status">
        <LoadingSpinner className="h-12 w-12 text-indigo-600" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (!user) return null;

  if (renderPreSearch && !hasActiveSearch) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{renderPreSearch()}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <RepositoryList
        repositories={repositories}
        isLoading={isLoading}
        isFetchingMore={isFetchingNextPage}
        hasMore={hasNextPage}
        error={error}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onSearchSubmit={onSearchSubmit}
        isSearching={isSearching}
        hasActiveSearch={hasActiveSearch}
        sortBy={sortBy}
        onSortChange={onSortChange}
        onLoadMore={fetchNextPage}
        title={title}
        searchPlaceholder={searchPlaceholder}
        sortOptions={sortOptions}
        emptyStateMessage={emptyStateMessage}
        emptyStateHint={emptyStateHint}
        totalStarred={totalStarred}
        fetchedStarredCount={fetchedStarredCount}
      />
    </div>
  );
};

export default RepositoryListPage;
