import { useQuery } from '@tanstack/react-query';
import { fetchAllStarredRepositories, type SortDirection } from '../services/github';
import { useAuthErrorHandler } from './useAuthErrorHandler';
import type { Repository, AllStarredData } from '../types';

interface UseAllStarredRepositoriesOptions {
  token: string | null;
  sortDirection?: SortDirection;
  enabled: boolean;
}

interface UseAllStarredRepositoriesReturn {
  repositories: Repository[];
  totalStarred: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for fetching ALL starred repositories at once.
 *
 * Use this when you need client-side sorting (e.g., by star count) that requires
 * the complete dataset. For paginated browsing with server-side sorting, use
 * useBrowseStarred instead.
 *
 * Note: Capped at 500 repos to limit parallel API calls. This is acceptable for
 * client-side sorting since users rarely need to sort through more than 500 repos
 * at once. The paginated hook has no cap since it fetches one page at a time.
 *
 * Uses the same query key as useInfiniteSearch for cache sharing.
 */

export function useAllStarredRepositories({
  token,
  sortDirection = 'desc',
  enabled,
}: UseAllStarredRepositoriesOptions): UseAllStarredRepositoriesReturn {
  const { data, isLoading, error, refetch } = useQuery<AllStarredData, Error>({
    queryKey: ['allStarredRepositories', token],
    queryFn: () => {
      if (!token) {
        throw new Error('Token required');
      }
      return fetchAllStarredRepositories(token);
    },
    enabled: enabled && !!token,
    staleTime: Infinity,
  });

  useAuthErrorHandler(error, 'useAllStarredRepositories');

  let repositories: Repository[] = [];
  if (data) {
    repositories = sortDirection === 'asc' ? [...data.repositories].reverse() : data.repositories;
  }

  return {
    repositories,
    totalStarred: data?.totalStarred ?? 0,
    isLoading,
    error,
    refetch,
  };
}
