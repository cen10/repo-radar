import { useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  fetchStarredRepositories,
  type StarredSortOption,
  type SortDirection,
} from '../services/github';
import { getValidGitHubToken } from '../services/github-token';
import { useAuth } from './useAuth';
import { isGitHubAuthError } from '../utils/error';
import { logger } from '../utils/logger';
import type { Repository } from '../types';

const ITEMS_PER_PAGE = 30;

export type PaginatedSortOption = 'updated' | 'created';

interface UsePaginatedStarredRepositoriesOptions {
  token: string | null;
  sortBy: PaginatedSortOption;
  sortDirection?: SortDirection;
  enabled: boolean;
}

interface UsePaginatedStarredRepositoriesReturn {
  repositories: Repository[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for paginated browsing of starred repositories with server-side sorting.
 *
 * Supports incremental loading (infinite scroll) for 'updated' and 'created' sorts.
 * For sorting by star count, use useAllStarredRepositories instead.
 *
 * Note: No cap on total repos - users can scroll through all their starred repos.
 * This is fine since we fetch one page at a time (no parallel API call concerns).
 */
export function usePaginatedStarredRepositories({
  token,
  sortBy,
  sortDirection = 'desc',
  enabled,
}: UsePaginatedStarredRepositoriesOptions): UsePaginatedStarredRepositoriesReturn {
  const { signOut } = useAuth();

  const fetchStarredPage = async ({ pageParam }: { pageParam: number }) => {
    // getValidGitHubToken handles null providerToken by falling back to localStorage
    const validToken = getValidGitHubToken(token);
    const repos = await fetchStarredRepositories(
      validToken,
      pageParam,
      ITEMS_PER_PAGE,
      sortBy as StarredSortOption,
      sortDirection
    );
    return {
      repositories: repos,
      page: pageParam,
      hasMore: repos.length === ITEMS_PER_PAGE,
    };
  };

  const getNextPageParam = (lastPage: { hasMore: boolean; page: number }) => {
    if (!lastPage.hasMore) return undefined;
    return lastPage.page + 1;
  };

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch } =
    useInfiniteQuery({
      queryKey: ['starredRepositories', token, sortBy, sortDirection],
      queryFn: fetchStarredPage,
      initialPageParam: 1,
      getNextPageParam,
      // Allow fetch even if token is null - getValidGitHubToken will try localStorage fallback
      enabled,
    });

  const repositories = data?.pages.flatMap((page) => page.repositories) ?? [];
  const typedError = error as Error | null;

  // Handle GitHub auth errors (expired token or no token available) by signing out
  useEffect(() => {
    if (typedError) {
      logger.debug('usePaginatedStarredRepositories: Error occurred', {
        message: typedError.message,
        name: typedError.name,
        isGitHubAuthError: isGitHubAuthError(typedError),
      });
    }
    if (isGitHubAuthError(typedError)) {
      // Token is invalid or unavailable (getValidGitHubToken already tried localStorage)
      logger.info('usePaginatedStarredRepositories: GitHub auth error, signing out', {
        errorMessage: typedError?.message,
      });
      sessionStorage.setItem('session_expired', 'true');
      void signOut();
    }
  }, [typedError, signOut]);

  return {
    repositories,
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
    error: typedError,
    refetch,
  };
}
