import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useSyncExternalStore } from 'react';
import type { Repository } from '../types';

interface AllStarredData {
  repositories: Repository[];
  totalFetched: number;
  totalStarred: number;
}

interface UseStarredIdsOptions {
  token: string | null;
  enabled?: boolean; // Kept for API compatibility, but doesn't trigger fetching
}

interface UseStarredIdsReturn {
  starredIds: Set<number>;
}

/**
 * Hook for reading the starred repositories cache.
 *
 * Does NOT fetch data - just reads from the cache used by
 * useAllStarredRepositories. The actual fetch only happens when that hook
 * is enabled (e.g., when sorting by "Most Stars").
 *
 * Returns starredIds derived from the cache (empty Set if cache not populated).
 */
export function useStarredIds({ token }: UseStarredIdsOptions): UseStarredIdsReturn {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['allStarredRepositories', token], [token]);

  // Cache the Set to avoid creating new references on every render
  const cachedSetRef = useRef<Set<number>>(new Set());
  const cachedIdsStringRef = useRef<string>('');

  // Subscribe to cache changes to get starredIds reactively
  const starredIds = useSyncExternalStore(
    (onStoreChange) => {
      return queryClient.getQueryCache().subscribe(onStoreChange);
    },
    () => {
      const data = queryClient.getQueryData<AllStarredData>(queryKey);
      if (!data) {
        if (cachedSetRef.current.size === 0) return cachedSetRef.current;
        cachedSetRef.current = new Set();
        cachedIdsStringRef.current = '';
        return cachedSetRef.current;
      }

      // Only create a new Set if the IDs have changed
      const idsString = data.repositories.map((r) => r.id).join(',');
      if (idsString !== cachedIdsStringRef.current) {
        cachedSetRef.current = new Set(data.repositories.map((repo) => repo.id));
        cachedIdsStringRef.current = idsString;
      }
      return cachedSetRef.current;
    }
  );

  return {
    starredIds,
  };
}
