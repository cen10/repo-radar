import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query';
import {
  searchRepositories,
  searchStarredRepositories,
  fetchAllStarredRepositories,
  type SearchSortOption,
  type StarredSearchSortOption,
} from '../services/github';
import { getValidGitHubToken, hasFallbackToken } from '../services/github-token';
import { useStarredIds } from './useStarredIds';
import { useAuth } from './useAuth';
import { useAuthErrorHandler } from './useAuthErrorHandler';
import type { Repository, AllStarredData } from '../types';

const ITEMS_PER_PAGE = 30;

// Discriminated union: mode determines which sort options are valid
// Exported so callers can build type-safe options
export type SearchModeConfig =
  | { mode: 'all'; sortBy: SearchSortOption }
  | { mode: 'starred'; sortBy: StarredSearchSortOption };

interface UseInfiniteSearchBaseOptions {
  token: string | null;
  query: string;
  enabled: boolean;
}

type UseInfiniteSearchOptions = UseInfiniteSearchBaseOptions & SearchModeConfig;

interface UseInfiniteSearchReturn {
  repositories: Repository[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: Error | null;
  totalCount: number;
  refetch: () => void;
  totalStarred: number;
  /** True when in starred mode and user has 0 starred repos to search */
  hasNoStarredRepos: boolean;
}

interface SearchPage {
  repositories: Repository[];
  totalCount: number;
  apiSearchResultTotal: number;
}

/**
 * Hook for infinite scroll loading of search results.
 *
 * Supports two search modes:
 * - 'all': Search across all GitHub repositories (uses GitHub search API)
 * - 'starred': Search within user's starred repositories (fetches ALL starred repos, then filters client-side)
 */
export function useInfiniteSearch(options: UseInfiniteSearchOptions): UseInfiniteSearchReturn {
  const { token, query, mode, sortBy, enabled } = options;
  const { user } = useAuth();
  const trimmedQuery = query.trim();
  const shouldFetch =
    enabled && !!user && (!!token || hasFallbackToken()) && trimmedQuery.length > 0;
  const isStarredSearch = mode === 'starred';

  // Get starred IDs for marking search results (used in 'all' mode)
  const { starredIds } = useStarredIds({
    token,
    enabled: shouldFetch && !isStarredSearch,
  });

  // Fetch ALL starred repos when searching within starred to ensure complete results.
  // Uses the same query key as useAllStarredRepositories for cache sharing.
  const {
    data: allStarredData,
    isLoading: isLoadingAllStarred,
    error: allStarredError,
  } = useQuery<AllStarredData, Error>({
    queryKey: ['allStarredRepositories', token],
    queryFn: () => {
      const validToken = getValidGitHubToken(token);
      return fetchAllStarredRepositories(validToken);
    },
    enabled: shouldFetch && isStarredSearch,
    staleTime: Infinity,
  });

  const allStarredRepos: Repository[] = allStarredData?.repositories ?? [];

  const fetchSearchPage = async ({
    pageParam,
    signal,
  }: {
    pageParam: number;
    signal: AbortSignal;
  }) => {
    const validToken = getValidGitHubToken(token);

    if (options.mode === 'starred') {
      return searchStarredRepositories(
        validToken,
        trimmedQuery,
        pageParam,
        ITEMS_PER_PAGE,
        allStarredRepos,
        options.sortBy,
        signal
      );
    }
    return searchRepositories(
      validToken,
      trimmedQuery,
      pageParam,
      ITEMS_PER_PAGE,
      options.sortBy,
      signal,
      starredIds
    );
  };

  const getNextPageParam = (lastPage: SearchPage, _allPages: unknown, lastPageParam: number) => {
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
  } = useInfiniteQuery<SearchPage, Error, InfiniteData<SearchPage>, readonly unknown[], number>({
    queryKey: ['searchRepositories', token, trimmedQuery, mode, sortBy],
    queryFn: fetchSearchPage,
    initialPageParam: 1,
    getNextPageParam,
    // Only enable search after all starred repos are loaded (for starred search).
    // Use allStarredData !== undefined to distinguish "loading" from "loaded with 0 repos".
    enabled: shouldFetch && (!isStarredSearch || allStarredData !== undefined),
  });

  const repositories = data?.pages.flatMap((page) => page.repositories) ?? [];
  const totalCount = data?.pages[0]?.apiSearchResultTotal ?? 0;

  const isLoading = isLoadingSearch || isLoadingAllStarred;
  const error = searchError || allStarredError;

  useAuthErrorHandler(error, 'useInfiniteSearch');

  const totalStarred = allStarredData?.totalStarred ?? 0;

  // In starred mode, user has no starred repos to search
  const hasNoStarredRepos = isStarredSearch && allStarredData !== undefined && totalStarred === 0;

  return {
    repositories,
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
    error,
    totalCount,
    refetch,
    totalStarred,
    hasNoStarredRepos,
  };
}
