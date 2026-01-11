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
  sortBy?: SearchSortOption;
  enabled?: boolean;
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
  sortBy = 'updated',
  enabled = true,
}: UseInfiniteSearchOptions): UseInfiniteSearchReturn {
  const trimmedQuery = query.trim();
  const shouldFetch = enabled && !!token && trimmedQuery.length > 0;
  const isStarredSearch = mode === 'starred';

  // Fetch ALL starred repos when searching within starred to ensure complete results
  // This uses the same query key as useInfiniteRepositories for cache sharing
  const {
    data: allStarredData,
    isLoading: isLoadingAllStarred,
    error: allStarredError,
  } = useQuery({
    queryKey: ['allStarredRepositories', token],
    queryFn: () => fetchAllStarredRepositories(token!),
    enabled: shouldFetch && isStarredSearch,
    staleTime: 5 * 60 * 1000,
  });

  const allStarredRepos: Repository[] = allStarredData?.repositories ?? [];

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch } =
    useInfiniteQuery({
      queryKey: ['searchRepositories', token, trimmedQuery, mode, sortBy],
      queryFn: async ({ pageParam, signal }) => {
        if (isStarredSearch) {
          // Use all starred repos for complete search results
          return searchStarredRepositories(
            token!,
            trimmedQuery,
            pageParam,
            ITEMS_PER_PAGE,
            allStarredRepos,
            sortBy,
            signal
          );
        }
        return searchRepositories(token!, trimmedQuery, pageParam, ITEMS_PER_PAGE, sortBy, signal);
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage, _allPages, lastPageParam) => {
        const totalPages = Math.ceil(lastPage.apiSearchResultTotal / ITEMS_PER_PAGE);
        if (lastPageParam >= totalPages) return undefined;
        return lastPageParam + 1;
      },
      // Only enable search after all starred repos are loaded (for starred search)
      enabled: shouldFetch && (!isStarredSearch || allStarredRepos.length > 0),
    });

  const repositories = data?.pages.flatMap((page) => page.repositories) ?? [];
  const totalCount = data?.pages[0]?.apiSearchResultTotal ?? 0;

  // Combine loading states: loading if fetching all starred OR running search
  const combinedIsLoading = isStarredSearch ? isLoadingAllStarred || isLoading : isLoading;
  // Surface any error from either query
  const combinedError = (allStarredError || error) as Error | null;

  return {
    repositories,
    isLoading: combinedIsLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
    error: combinedError,
    totalCount,
    refetch,
  };
}
