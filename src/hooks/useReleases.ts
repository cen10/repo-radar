import { useQuery } from '@tanstack/react-query';
import { fetchRepositoryReleases } from '../services/github';
import type { Release } from '../types';

interface UseReleasesOptions {
  token: string | null;
  owner: string;
  repo: string;
  enabled?: boolean;
}

interface UseReleasesReturn {
  releases: Release[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for fetching releases for a specific repository.
 *
 * Designed for lazy-loading on repository detail pages. TanStack Query
 * handles caching, so repeated views of the same repo won't re-fetch.
 * Always fetches 10 releases - components can slice if fewer are needed.
 *
 * @param options.token - GitHub access token
 * @param options.owner - Repository owner (e.g., 'facebook')
 * @param options.repo - Repository name (e.g., 'react')
 * @param options.enabled - Whether to enable the query (default true)
 */
export function useReleases({
  token,
  owner,
  repo,
  enabled = true,
}: UseReleasesOptions): UseReleasesReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['releases', owner, repo],
    queryFn: () => {
      if (!token) {
        throw new Error('Token required');
      }
      return fetchRepositoryReleases(token, owner, repo, 10);
    },
    enabled: enabled && !!token && !!owner && !!repo,
  });

  return {
    releases: data ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
