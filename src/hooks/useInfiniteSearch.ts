import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  searchRepositories,
  searchStarredRepositories,
  fetchAllStarredRepositories,
} from '../services/github';
import type { Repository } from '../types';

const ITEMS_PER_PAGE = 30;

type SearchMode = 'all' | 'starred';
type SearchSortOption = 'updated' | 'created' | 'stars';

interface UseInfiniteSearchOptions {
  token: string | null;
  query: string;
  mode: SearchMode;
  sortBy: SearchSortOption;
  enabled: boolean;
}

interface UseInfiniteSearchReturn {
  repositories: Repository[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: Error | null;
  totalCount: number;
  refetch: () => void;
}

/**
 * Hook for infinite scroll loading of search results.
 *
 * Supports two search modes:
 * - 'all': Search across all GitHub repositories (uses GitHub search API)
 * - 'starred': Search within user's starred repositories (fetches ALL starred repos, then filters client-side)
 */
export function useInfiniteSearch({
  token,
  query,
  mode,
  sortBy,
  enabled,
}: UseInfiniteSearchOptions): UseInfiniteSearchReturn {
  const trimmedQuery = query.trim();
  const shouldFetch = enabled && !!token && trimmedQuery.length > 0;
  const isStarredSearch = mode === 'starred';

  // Fetch ALL starred repos when searching within starred to ensure complete results.
  // Uses the same query key as useAllStarredRepositories for cache sharing.
  const {
    data: allStarredData,
    isLoading: isLoadingAllStarred,
    error: allStarredError,
  } = useQuery({
    queryKey: ['allStarredRepositories', token],
    queryFn: () => {
      if (!token) {
        throw new Error('Token required');
      }
      return fetchAllStarredRepositories(token);
    },
    enabled: shouldFetch && isStarredSearch,
    staleTime: 5 * 60 * 1000,
  });

  const allStarredRepos: Repository[] = allStarredData?.repositories ?? [];

  const fetchSearchPage = async ({
    pageParam,
    signal,
  }: {
    pageParam: number;
    signal?: AbortSignal;
  }) => {
    if (!token) {
      throw new Error('Token required');
    }
    if (isStarredSearch) {
      return searchStarredRepositories(
        token,
        trimmedQuery,
        pageParam,
        ITEMS_PER_PAGE,
        allStarredRepos,
        sortBy,
        signal
      );
    }
    return searchRepositories(token, trimmedQuery, pageParam, ITEMS_PER_PAGE, sortBy, signal);
  };

  const getNextPageParam = (
    lastPage: { apiSearchResultTotal: number },
    _allPages: unknown,
    lastPageParam: number
  ) => {
    const totalPages = Math.ceil(lastPage.apiSearchResultTotal / ITEMS_PER_PAGE);
    if (lastPageParam >= totalPages) return undefined;
    return lastPageParam + 1;
  };

  const {
    data,
    isLoading: isLoadingSearch,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error: searchError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['searchRepositories', token, trimmedQuery, mode, sortBy],
    queryFn: fetchSearchPage,
    initialPageParam: 1,
    getNextPageParam,
    // Only enable search after all starred repos are loaded (for starred search)
    enabled: shouldFetch && (!isStarredSearch || allStarredRepos.length > 0),
  });

  const repositories = data?.pages.flatMap((page) => page.repositories) ?? [];
  const totalCount = data?.pages[0]?.apiSearchResultTotal ?? 0;

  const isLoading = isLoadingSearch || isLoadingAllStarred;
  const error = (searchError || allStarredError) as Error | null;

  return {
    repositories,
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
    error,
    totalCount,
    refetch,
  };
}
