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

export type BrowseSortOption = 'updated' | 'created';

interface UseBrowseStarredOptions {
  token: string | null;
  sortBy: BrowseSortOption;
  sortDirection?: SortDirection;
  enabled: boolean;
}

interface UseBrowseStarredReturn {
  repositories: Repository[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for browsing starred repositories with infinite scroll.
 *
 * Supports server-side sorting by 'updated' or 'created'.
 * For sorting by star count, use useAllStarredRepositories instead.
 */
export function useBrowseStarred({
  token,
  sortBy,
  sortDirection = 'desc',
  enabled,
}: UseBrowseStarredOptions): UseBrowseStarredReturn {
  const { signOut } = useAuth();

  const fetchStarredPage = async ({ pageParam }: { pageParam: number }) => {
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
      enabled,
    });

  const repositories = data?.pages.flatMap((page) => page.repositories) ?? [];
  const typedError = error as Error | null;

  useEffect(() => {
    if (typedError) {
      logger.debug('useBrowseStarred: Error occurred', {
        message: typedError.message,
        name: typedError.name,
        isGitHubAuthError: isGitHubAuthError(typedError),
      });
    }
    if (isGitHubAuthError(typedError)) {
      logger.info('useBrowseStarred: GitHub auth error, signing out', {
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
