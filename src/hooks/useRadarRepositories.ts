import { useQuery } from '@tanstack/react-query';
import { getRadarRepos } from '../services/radar';
import { fetchRepositoriesByIds } from '../services/github';
import { getValidGitHubToken, hasFallbackToken } from '../services/github-token';
import { useOnboarding } from '../contexts/use-onboarding';
import { getTourRepos, TOUR_RADAR_ID } from '../demo/tour-data';
import type { Repository } from '../types';

interface UseRadarRepositoriesOptions {
  radarId: string | undefined;
  token: string | null;
  enabled?: boolean;
}

interface UseRadarRepositoriesReturn {
  repositories: Repository[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for fetching repositories in a radar.
 *
 * Two-step fetch:
 * 1. Get repo IDs from Supabase (via getRadarRepos)
 * 2. Fetch full repository data from GitHub (via fetchRepositoriesByIds)
 *
 * @param options.radarId - The radar ID to fetch repos for
 * @param options.token - GitHub access token for fetching repo details
 * @param options.enabled - Whether to enable the query (default true)
 */
export function useRadarRepositories({
  radarId,
  token,
  enabled = true,
}: UseRadarRepositoriesOptions): UseRadarRepositoriesReturn {
  const { isTourActive } = useOnboarding();

  // Return tour demo repod immediately for the tour demo radar
  const isTourDemoRadar = isTourActive && radarId === TOUR_RADAR_ID;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['radarRepositories', radarId],
    queryFn: async () => {
      if (!radarId) {
        return [];
      }

      // Tour demo radar uses client-side demo data, no API calls
      if (isTourDemoRadar) {
        return getTourRepos();
      }

      const validToken = getValidGitHubToken(token);

      // Step 1: Get repo IDs from Supabase
      const radarRepos = await getRadarRepos(radarId);

      if (radarRepos.length === 0) {
        return [];
      }

      // Step 2: Fetch full repo data from GitHub
      const repoIds = radarRepos.map((r) => r.github_repo_id);
      const repositories = await fetchRepositoriesByIds(validToken, repoIds);

      return repositories;
    },
    enabled: enabled && !!radarId && (isTourDemoRadar || !!token || hasFallbackToken()),
  });

  return {
    repositories: data ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
