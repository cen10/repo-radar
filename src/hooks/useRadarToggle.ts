import { useState, useCallback, useEffect, useMemo } from 'react';
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
    radarsAlreadyContainingRepo,
    isLoading: isLoadingRepoRadars,
    error: repoRadarsError,
  } = useRepoRadars(githubRepoId);

  // Track radars to add/remove the repo that haven't been saved yet
  const [radarsToAddRepoTo, setRadarsToAddRepoTo] = useState<Set<string>>(new Set());
  const [radarsToRemoveRepoFrom, setRadarsToRemoveRepoFrom] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Clear unsaved changes and error when dialog opens
  useEffect(() => {
    if (open) {
      setRadarsToAddRepoTo(new Set());
      setRadarsToRemoveRepoFrom(new Set());
      setSaveError(null);
    }
  }, [open]);

  const isLoading = isLoadingRadars || isLoadingRepoRadars;
  const fetchError = radarsError || repoRadarsError;

  const isRadarChecked = useCallback(
    (radarId: string): boolean => {
      if (radarsToAddRepoTo.has(radarId)) return true;
      if (radarsToRemoveRepoFrom.has(radarId)) return false;
      return radarsAlreadyContainingRepo.includes(radarId);
    },
    [radarsAlreadyContainingRepo, radarsToAddRepoTo, radarsToRemoveRepoFrom]
  );

  // Filter to actual changes (not toggling back to original state)
  const actualAdds = useMemo(
    () => Array.from(radarsToAddRepoTo).filter((id) => !radarsAlreadyContainingRepo.includes(id)),
    [radarsToAddRepoTo, radarsAlreadyContainingRepo]
  );
  const actualRemoves = useMemo(
    () =>
      Array.from(radarsToRemoveRepoFrom).filter((id) => radarsAlreadyContainingRepo.includes(id)),
    [radarsToRemoveRepoFrom, radarsAlreadyContainingRepo]
  );

  // Compute repo count considering unsaved changes (for limit enforcement)
  const getRepoCountIncludingUnsavedChanges = useCallback(
    (radar: RadarWithCount): number => {
      let count = radar.repo_count;
      if (actualAdds.includes(radar.id)) {
        count += 1;
      }
      if (actualRemoves.includes(radar.id)) {
        count -= 1;
      }
      return count;
    },
    [actualAdds, actualRemoves]
  );

  // Derived state for limits using counts that include unsaved changes
  const totalRepoCount = radars.reduce((sum, r) => sum + getRepoCountIncludingUnsavedChanges(r), 0);

  const isAtTotalRepoLimit = totalRepoCount >= RADAR_LIMITS.MAX_TOTAL_REPOS;

  const hasUnsavedChanges = actualAdds.length > 0 || actualRemoves.length > 0;

  // Toggle handler: update local state only, no API calls
  const handleToggleRadar = useCallback(
    (radar: RadarWithCount) => {
      setSaveError(null);
      const currentlyChecked = isRadarChecked(radar.id);

      if (currentlyChecked) {
        // Currently checked → mark for removal
        setRadarsToRemoveRepoFrom((prev) => new Set(prev).add(radar.id));
        setRadarsToAddRepoTo((prev) => {
          const next = new Set(prev);
          next.delete(radar.id);
          return next;
        });
      } else {
        // Currently unchecked → mark for add
        setRadarsToAddRepoTo((prev) => new Set(prev).add(radar.id));
        setRadarsToRemoveRepoFrom((prev) => {
          const next = new Set(prev);
          next.delete(radar.id);
          return next;
        });
      }
    },
    [isRadarChecked]
  );

  // Save all unsaved changes
  const saveChanges = useCallback(async (): Promise<void> => {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      await Promise.all([
        ...actualAdds.map((id) => addRepoToRadar(id, githubRepoId)),
        ...actualRemoves.map((id) => removeRepoFromRadar(id, githubRepoId)),
      ]);

      // Invalidate all affected caches
      void queryClient.invalidateQueries({ queryKey: ['radars'] });
      void queryClient.invalidateQueries({ queryKey: ['repo-radars', githubRepoId] });

      // Invalidate each affected radar's repository list
      const affectedRadarIds = new Set([...actualAdds, ...actualRemoves]);
      affectedRadarIds.forEach((id) => {
        void queryClient.invalidateQueries({ queryKey: ['radarRepositories', id] });
      });

      // Clear unsaved changes on success
      setRadarsToAddRepoTo(new Set());
      setRadarsToRemoveRepoFrom(new Set());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save changes';
      setSaveError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [hasUnsavedChanges, actualAdds, actualRemoves, githubRepoId, queryClient]);

  // Discard all unsaved changes
  const cancelChanges = useCallback(() => {
    setRadarsToAddRepoTo(new Set());
    setRadarsToRemoveRepoFrom(new Set());
    setSaveError(null);
  }, []);

  const isCheckboxDisabled = useCallback(
    (radar: RadarWithCount): boolean => {
      if (isRadarChecked(radar.id)) return false; // Can always uncheck
      const repoCount = getRepoCountIncludingUnsavedChanges(radar);
      if (repoCount >= RADAR_LIMITS.MAX_REPOS_PER_RADAR) return true;
      if (isAtTotalRepoLimit) return true;
      return false;
    },
    [isRadarChecked, getRepoCountIncludingUnsavedChanges, isAtTotalRepoLimit]
  );

  const getDisabledTooltip = useCallback(
    (radar: RadarWithCount): string | null => {
      const repoCount = getRepoCountIncludingUnsavedChanges(radar);
      if (repoCount >= RADAR_LIMITS.MAX_REPOS_PER_RADAR) {
        return `This radar has reached its limit (${RADAR_LIMITS.MAX_REPOS_PER_RADAR} repos)`;
      }
      if (isAtTotalRepoLimit) {
        return `You've reached your total repo limit (${RADAR_LIMITS.MAX_TOTAL_REPOS})`;
      }
      return null;
    },
    [getRepoCountIncludingUnsavedChanges, isAtTotalRepoLimit]
  );

  return {
    radars,
    isLoading,
    fetchError,
    saveError,
    isSaving,
    hasUnsavedChanges,
    handleToggleRadar,
    isRadarChecked,
    isCheckboxDisabled,
    getDisabledTooltip,
    saveChanges,
    cancelChanges,
  };
}
