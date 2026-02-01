import { useQuery } from '@tanstack/react-query';
import { fetchRepositoryReleases } from '../services/github';
import { getValidGitHubToken, hasFallbackToken } from '../services/github-token';
import { useAuthErrorHandler } from './useAuthErrorHandler';
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
  const { data, isLoading, error, refetch } = useQuery<Release[], Error>({
    queryKey: ['releases', owner, repo],
    queryFn: () => {
      const validToken = getValidGitHubToken(token);
      return fetchRepositoryReleases(validToken, owner, repo);
    },
    enabled: enabled && (!!token || hasFallbackToken()) && !!owner && !!repo,
  });

  useAuthErrorHandler(error, 'useReleases');

  return {
    releases: data ?? [],
    isLoading,
    error,
    refetch,
  };
}
