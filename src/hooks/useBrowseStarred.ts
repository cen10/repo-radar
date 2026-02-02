import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import {
  fetchStarredRepositories,
  type StarredSortOption,
  type SortDirection,
} from '../services/github';
import { getValidGitHubToken, hasFallbackToken } from '../services/github-token';
import { useAuth } from './useAuth';
import { useAuthErrorHandler } from './useAuthErrorHandler';
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

interface StarredPage {
  repositories: Repository[];
  page: number;
  hasMore: boolean;
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
  const { user } = useAuth();

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

  const getNextPageParam = (lastPage: StarredPage) => {
    if (!lastPage.hasMore) return undefined;
    return lastPage.page + 1;
  };

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch } =
    useInfiniteQuery<StarredPage, Error, InfiniteData<StarredPage>, readonly unknown[], number>({
      queryKey: ['starredRepositories', token, sortBy, sortDirection],
      queryFn: fetchStarredPage,
      initialPageParam: 1,
      getNextPageParam,
      enabled: enabled && !!user && (!!token || hasFallbackToken()),
    });

  const repositories = data?.pages.flatMap((page) => page.repositories) ?? [];

  useAuthErrorHandler(error, 'useBrowseStarred');

  return {
    repositories,
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
    error,
    refetch,
  };
}
