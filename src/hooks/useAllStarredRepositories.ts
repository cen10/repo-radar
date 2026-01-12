import { useQuery } from '@tanstack/react-query';
import { fetchAllStarredRepositories, type SortDirection } from '../services/github';
import type { Repository } from '../types';

interface UseAllStarredRepositoriesOptions {
  token: string | null;
  sortDirection?: SortDirection;
  enabled: boolean;
}

interface UseAllStarredRepositoriesReturn {
  repositories: Repository[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for fetching ALL starred repositories at once.
 *
 * Use this when you need client-side sorting (e.g., by star count) that requires
 * the complete dataset. For paginated browsing with server-side sorting, use
 * usePaginatedStarredRepositories instead.
 *
 * Uses the same query key as useInfiniteSearch for cache sharing.
 */
export function useAllStarredRepositories({
  token,
  sortDirection = 'desc',
  enabled,
}: UseAllStarredRepositoriesOptions): UseAllStarredRepositoriesReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['allStarredRepositories', token],
    queryFn: () => {
      if (!token) {
        throw new Error('Token required');
      }
      return fetchAllStarredRepositories(token);
    },
    enabled: enabled && !!token,
    staleTime: 5 * 60 * 1000,
  });

  let repositories: Repository[] = [];
  if (data) {
    repositories = sortDirection === 'asc' ? [...data.repositories].reverse() : data.repositories;
  }

  return {
    repositories,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
