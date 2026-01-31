import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRadars } from './useRadars';
import { useRepoRadars } from './useRepoRadars';
import { addRepoToRadar, removeRepoFromRadar, RADAR_LIMITS } from '../services/radar';
import type { RadarWithCount } from '../types/database';

interface UseRadarToggleOptions {
  githubRepoId: number;
  open: boolean;
}

export function useRadarToggle({ githubRepoId, open }: UseRadarToggleOptions) {
  const queryClient = useQueryClient();
  const { radars, isLoading: isLoadingRadars, error: radarsError } = useRadars();
  const {
    radarIds,
    isLoading: isLoadingRepoRadars,
    error: repoRadarsError,
  } = useRepoRadars(githubRepoId);

  const [toggleError, setToggleError] = useState<string | null>(null);

  // Clear error when dialog opens
  useEffect(() => {
    if (open) {
      setToggleError(null);
    }
  }, [open]);

  const isLoading = isLoadingRadars || isLoadingRepoRadars;
  const fetchError = radarsError || repoRadarsError;

  // Derived state for limits
  const totalRepos = radars.reduce((sum, r) => sum + r.repo_count, 0);
  const isAtTotalRepoLimit = totalRepos >= RADAR_LIMITS.MAX_TOTAL_REPOS;

  const repoRadarsQueryKey = useMemo(() => ['repo-radars', githubRepoId] as const, [githubRepoId]);
  const radarsQueryKey = useMemo(() => ['radars'] as const, []);

  const handleToggleRadar = useCallback(
    async (radar: RadarWithCount, isChecked: boolean) => {
      setToggleError(null);

      // Read current cache state at execution time to avoid stale closure issues
      const previousIds = queryClient.getQueryData<string[]>(repoRadarsQueryKey) ?? [];
      const previousRadars = queryClient.getQueryData<RadarWithCount[]>(radarsQueryKey) ?? [];

      const newIds = isChecked
        ? previousIds.filter((id) => id !== radar.id)
        : [...previousIds, radar.id];
      queryClient.setQueryData(repoRadarsQueryKey, newIds);

      // Also update radars cache to keep repo_count in sync with checkbox state
      const newRadars = previousRadars.map((r) =>
        r.id === radar.id ? { ...r, repo_count: r.repo_count + (isChecked ? -1 : 1) } : r
      );
      queryClient.setQueryData(radarsQueryKey, newRadars);

      try {
        if (isChecked) {
          await removeRepoFromRadar(radar.id, githubRepoId);
        } else {
          await addRepoToRadar(radar.id, githubRepoId);
        }
        // Refresh both caches with server data
        void queryClient.invalidateQueries({ queryKey: radarsQueryKey });
        void queryClient.invalidateQueries({ queryKey: repoRadarsQueryKey });
      } catch (err) {
        // Revert both caches on error
        queryClient.setQueryData(repoRadarsQueryKey, previousIds);
        queryClient.setQueryData(radarsQueryKey, previousRadars);
        const message = err instanceof Error ? err.message : 'Failed to update radar';
        setToggleError(message);
      }
    },
    [queryClient, githubRepoId, repoRadarsQueryKey, radarsQueryKey]
  );

  const isCheckboxDisabled = useCallback(
    (radar: RadarWithCount, isChecked: boolean): boolean => {
      if (isChecked) return false; // Can always uncheck
      if (radar.repo_count >= RADAR_LIMITS.MAX_REPOS_PER_RADAR) return true;
      if (isAtTotalRepoLimit) return true;
      return false;
    },
    [isAtTotalRepoLimit]
  );

  const getDisabledTooltip = useCallback(
    (radar: RadarWithCount): string | null => {
      if (radar.repo_count >= RADAR_LIMITS.MAX_REPOS_PER_RADAR) {
        return `This radar has reached its limit (${RADAR_LIMITS.MAX_REPOS_PER_RADAR} repos)`;
      }
      if (isAtTotalRepoLimit) {
        return `You've reached your total repo limit (${RADAR_LIMITS.MAX_TOTAL_REPOS})`;
      }
      return null;
    },
    [isAtTotalRepoLimit]
  );

  return {
    radars,
    radarIds,
    isLoading,
    fetchError,
    toggleError,
    handleToggleRadar,
    isCheckboxDisabled,
    getDisabledTooltip,
  };
}
