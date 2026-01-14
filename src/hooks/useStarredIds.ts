import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
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
  addRepoToStarredCache: (repo: Repository) => void;
  removeRepoFromStarredCache: (repo: Repository) => void;
}

/**
 * Hook for reading and optimistically updating the starred repositories cache.
 *
 * Does NOT fetch data - just reads from and manipulates the cache used by
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

  const addRepoToStarredCache = useCallback(
    (repo: Repository) => {
      queryClient.setQueryData<AllStarredData>(queryKey, (old) => {
        if (!old) return old;
        // Add repo if not already present
        if (old.repositories.some((r) => r.id === repo.id)) return old;
        return {
          ...old,
          repositories: [
            {
              ...repo,
              is_starred: true,
              starred_at: new Date().toISOString(),
            },
            ...old.repositories,
          ],
          totalStarred: old.totalStarred + 1,
        };
      });
    },
    [queryClient, queryKey]
  );

  const removeRepoFromStarredCache = useCallback(
    (repo: Repository) => {
      queryClient.setQueryData<AllStarredData>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          repositories: old.repositories.filter((r) => r.id !== repo.id),
          totalStarred: Math.max(0, old.totalStarred - 1),
        };
      });
    },
    [queryClient, queryKey]
  );

  return {
    starredIds,
    addRepoToStarredCache,
    removeRepoFromStarredCache,
  };
}
