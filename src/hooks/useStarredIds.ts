import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { fetchAllStarredRepositories } from '../services/github';

const QUERY_KEY = ['starredIds'];

interface UseStarredIdsOptions {
  token: string | null;
  enabled?: boolean;
}

interface UseStarredIdsReturn {
  starredIds: Set<number>;
  isLoading: boolean;
  error: Error | null;
  addId: (id: number) => void;
  removeId: (id: number) => void;
}

/**
 * Hook for managing starred repository IDs with optimistic updates.
 *
 * Fetches all starred repo IDs on mount and provides functions to
 * optimistically add/remove IDs when the user stars/unstars repos.
 */
export function useStarredIds({
  token,
  enabled = true,
}: UseStarredIdsOptions): UseStarredIdsReturn {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (!token) {
        throw new Error('Token required');
      }
      const result = await fetchAllStarredRepositories(token);
      // Extract just the IDs
      return new Set(result.repositories.map((repo) => repo.id));
    },
    enabled: enabled && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const addId = useCallback(
    (id: number) => {
      queryClient.setQueryData<Set<number>>(QUERY_KEY, (old) => {
        const newSet = new Set(old);
        newSet.add(id);
        return newSet;
      });
    },
    [queryClient]
  );

  const removeId = useCallback(
    (id: number) => {
      queryClient.setQueryData<Set<number>>(QUERY_KEY, (old) => {
        const newSet = new Set(old);
        newSet.delete(id);
        return newSet;
      });
    },
    [queryClient]
  );

  return {
    starredIds: data ?? new Set(),
    isLoading,
    error: error as Error | null,
    addId,
    removeId,
  };
}
