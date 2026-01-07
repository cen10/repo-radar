import { useInfiniteQuery } from '@tanstack/react-query';
import { searchRepositories, searchStarredRepositories } from '../services/github';
import type { Repository } from '../types';

const ITEMS_PER_PAGE = 30;

type SearchFilter = 'all' | 'starred';

interface UseInfiniteSearchOptions {
  token: string | null;
  query: string;
  filter: SearchFilter;
  starredRepos?: Repository[];
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
 * - 'starred': Search within user's starred repositories (client-side filtering)
 */
export function useInfiniteSearch({
  token,
  query,
  filter,
  starredRepos,
  enabled = true,
}: UseInfiniteSearchOptions): UseInfiniteSearchReturn {
  const trimmedQuery = query.trim();
  const shouldFetch = enabled && !!token && trimmedQuery.length > 0;

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch } =
    useInfiniteQuery({
      queryKey: ['searchRepositories', token, trimmedQuery, filter, starredRepos?.length],
      queryFn: async ({ pageParam, signal }) => {
        if (filter === 'starred' && starredRepos) {
          return searchStarredRepositories(
            token!,
            trimmedQuery,
            pageParam,
            ITEMS_PER_PAGE,
            starredRepos,
            signal
          );
        }
        return searchRepositories(token!, trimmedQuery, pageParam, ITEMS_PER_PAGE, signal);
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage, _allPages, lastPageParam) => {
        const totalPages = Math.ceil(lastPage.apiSearchResultTotal / ITEMS_PER_PAGE);
        if (lastPageParam >= totalPages) return undefined;
        return lastPageParam + 1;
      },
      enabled: shouldFetch,
    });

  const repositories = data?.pages.flatMap((page) => page.repositories) ?? [];
  const totalCount = data?.pages[0]?.apiSearchResultTotal ?? 0;

  return {
    repositories,
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
    error: error as Error | null,
    totalCount,
    refetch,
  };
}
