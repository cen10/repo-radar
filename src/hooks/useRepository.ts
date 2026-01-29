import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchRepositoryById, isRepositoryStarred } from '../services/github';
import { useAuthErrorHandler } from './useAuthErrorHandler';
import { useStarredIds } from './useStarredIds';
import type { Repository } from '../types';

interface AllStarredData {
  repositories: Repository[];
  totalFetched: number;
  totalStarred: number;
}

interface UseRepositoryOptions {
  repoId: string | undefined;
  token: string | null;
  enabled?: boolean;
}

interface UseRepositoryReturn {
  repository: Repository | null;
  isLoading: boolean;
  error: Error | null;
  isNotFound: boolean;
  refetch: () => Promise<void>;
  isRefetching: boolean;
  dataUpdatedAt: number | undefined;
}

/**
 * Hook for fetching a single repository by its GitHub numeric ID.
 *
 * Used on the repository detail page. Fetches fresh data from GitHub API.
 * Returns isNotFound: true when the repo doesn't exist or is inaccessible.
 * Also determines is_starred status by checking cache first, then API.
 *
 * @param options.repoId - The GitHub repository numeric ID (as string from URL params)
 * @param options.token - GitHub access token
 * @param options.enabled - Whether to enable the query (default true)
 */
export function useRepository({
  repoId,
  token,
  enabled = true,
}: UseRepositoryOptions): UseRepositoryReturn {
  const numericId = repoId ? parseInt(repoId, 10) : NaN;
  const isValidId = !isNaN(numericId);

  const queryClient = useQueryClient();

  // Check starred IDs cache first
  const { starredIds } = useStarredIds({ token });
  const isInStarredCache = isValidId && starredIds.has(numericId);

  const { data, isLoading, error, refetch, isRefetching, dataUpdatedAt } = useQuery<
    Repository | null,
    Error
  >({
    queryKey: ['repository', repoId],
    queryFn: () => {
      if (!token) {
        throw new Error('Token required');
      }
      return fetchRepositoryById(token, numericId);
    },
    enabled: enabled && !!token && isValidId,
  });

  const { data: isStarredFromApi } = useQuery({
    // Cache for individual starred-status API checks if not found in cache.
    // Stores both true AND false results to avoid repeat calls.
    // This is separate from allStarredRepositories, which only
    // contains the first 500 starred repos for the Stars page.
    queryKey: ['isRepositoryStarred', data?.owner.login, data?.name],
    queryFn: () => isRepositoryStarred(token, data!.owner.login, data!.name),
    enabled: !!data && !isInStarredCache,
  });

  useAuthErrorHandler(error, 'useRepository');

  // Update allStarredRepositories cache when we learn a repo is starred via API
  useEffect(() => {
    if (!isStarredFromApi || !data) return;

    const cacheKey = ['allStarredRepositories', token];
    const cachedData = queryClient.getQueryData<AllStarredData>(cacheKey);

    // Only update if cache exists and repo isn't already in it
    if (cachedData && !cachedData.repositories.some((r) => r.id === data.id)) {
      queryClient.setQueryData<AllStarredData>(cacheKey, {
        ...cachedData,
        repositories: [...cachedData.repositories, { ...data, is_starred: true }],
        totalFetched: cachedData.totalFetched + 1,
        totalStarred: cachedData.totalStarred + 1,
      });
    }
  }, [isStarredFromApi, data, token, queryClient]);

  // Determine final is_starred value: cache takes priority, then API result
  const isStarred = isInStarredCache || (isStarredFromApi ?? false);

  // Merge is_starred into repository
  const repository = data ? { ...data, is_starred: isStarred } : null;

  return {
    repository,
    isLoading,
    error,
    isNotFound: !isLoading && !error && data === null && isValidId,
    refetch: async () => {
      await refetch();
    },
    isRefetching,
    dataUpdatedAt,
  };
}
