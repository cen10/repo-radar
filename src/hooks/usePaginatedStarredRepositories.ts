import { useInfiniteQuery } from '@tanstack/react-query';
import {
  fetchStarredRepositories,
  type StarredSortOption,
  type SortDirection,
} from '../services/github';
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
 */
export function usePaginatedStarredRepositories({
  token,
  sortBy,
  sortDirection = 'desc',
  enabled,
}: UsePaginatedStarredRepositoriesOptions): UsePaginatedStarredRepositoriesReturn {
  const fetchStarredPage = async ({ pageParam }: { pageParam: number }) => {
    if (!token) {
      throw new Error('Token required');
    }
    const repos = await fetchStarredRepositories(
      token,
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
      enabled: enabled && !!token,
    });

  const repositories = data?.pages.flatMap((page) => page.repositories) ?? [];

  return {
    repositories,
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
    error: error as Error | null,
    refetch,
  };
}
