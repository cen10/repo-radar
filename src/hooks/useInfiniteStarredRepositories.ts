import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  fetchStarredRepositories,
  fetchAllStarredRepositories,
  type StarredSortOption,
  type SortDirection,
} from '../services/github';
import type { Repository } from '../types';

const ITEMS_PER_PAGE = 30;

export type SortByOption = 'updated' | 'created' | 'stars';

interface UseInfiniteStarredRepositoriesOptions {
  token: string | null;
  sortBy: SortByOption;
  sortDirection?: SortDirection;
  enabled: boolean;
}

interface UseInfiniteStarredRepositoriesReturn {
  repositories: Repository[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: Error | null;
  totalFetched: number;
  refetch: () => void;
}

/**
 * Hook for browsing the user's starred repositories list (without search).
 *
 * For searching within starred repos, use useInfiniteSearch with mode: 'starred'.
 *
 * Supports three sort modes:
 * - 'updated': Server-side sort by recently updated (fast, incremental loading)
 * - 'created': Server-side sort by recently starred (fast, incremental loading)
 * - 'stars': Client-side sort by star count (loads all repos at once, then sorts)
 */
export function useInfiniteStarredRepositories({
  token,
  sortBy,
  sortDirection = 'desc',
  enabled,
}: UseInfiniteStarredRepositoriesOptions): UseInfiniteStarredRepositoriesReturn {
  const isStarsSort = sortBy === 'stars';

  // For 'stars' sort: load all repos at once using parallel fetching, then sort client-side
  const {
    data: allReposData,
    isLoading: isLoadingAll,
    error: allReposError,
    refetch: refetchAll,
  } = useQuery({
    queryKey: ['allStarredRepositories', token],
    queryFn: () => fetchAllStarredRepositories(token!),
    enabled: enabled && !!token && isStarsSort,
    staleTime: 5 * 60 * 1000,
  });

  const fetchStarredPage = async ({ pageParam }: { pageParam: number }) => {
    const repos = await fetchStarredRepositories(
      token!,
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

  // For 'updated'/'created' sort: use infinite query for incremental loading
  const {
    data: infiniteData,
    isLoading: isLoadingInfinite,
    isFetchingNextPage,
    hasNextPage: infiniteHasNextPage,
    fetchNextPage: fetchNextPageInfinite,
    error: infiniteError,
    refetch: refetchInfinite,
  } = useInfiniteQuery({
    queryKey: ['starredRepositories', token, sortBy, sortDirection],
    queryFn: fetchStarredPage,
    initialPageParam: 1,
    getNextPageParam,
    enabled: enabled && !!token && !isStarsSort,
  });

  // Compute final repositories based on sort mode
  let repositories: Repository[] = [];
  let hasNextPage = false;

  if (isStarsSort) {
    // Stars sort: all repos already loaded and sorted by star count
    if (allReposData) {
      repositories =
        sortDirection === 'asc'
          ? [...allReposData.repositories].reverse()
          : allReposData.repositories;
    }
    hasNextPage = false; // All data loaded at once
  } else {
    // Server-side sort: flatten infinite query pages
    repositories = infiniteData?.pages.flatMap((page) => page.repositories) ?? [];
    hasNextPage = infiniteHasNextPage ?? false;
  }

  const isLoading = isStarsSort ? isLoadingAll : isLoadingInfinite;
  const error = (isStarsSort ? allReposError : infiniteError) as Error | null;

  return {
    repositories,
    isLoading,
    isFetchingNextPage: isStarsSort ? false : isFetchingNextPage,
    hasNextPage,
    fetchNextPage: isStarsSort ? () => {} : fetchNextPageInfinite,
    error,
    totalFetched: repositories.length,
    refetch: isStarsSort ? refetchAll : refetchInfinite,
  };
}
