import { useState, useEffect } from 'react';
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

  const isRadarChecked = (radarId: string): boolean => {
    if (radarsToAddRepoTo.has(radarId)) return true;
    if (radarsToRemoveRepoFrom.has(radarId)) return false;
    return radarsAlreadyContainingRepo.includes(radarId);
  };

  // Filter to actual changes (not toggling back to original state)
  const actualAdds = Array.from(radarsToAddRepoTo).filter(
    (id) => !radarsAlreadyContainingRepo.includes(id)
  );
  const actualRemoves = Array.from(radarsToRemoveRepoFrom).filter((id) =>
    radarsAlreadyContainingRepo.includes(id)
  );

  // Compute repo count considering unsaved changes (for limit enforcement)
  const getRepoCountIncludingUnsavedChanges = (radar: RadarWithCount): number => {
    let count = radar.repo_count;
    if (actualAdds.includes(radar.id)) {
      count += 1;
    }
    if (actualRemoves.includes(radar.id)) {
      count -= 1;
    }
    return count;
  };

  // Derived state for limits using counts that include unsaved changes
  const totalRepoCount = radars.reduce((sum, r) => sum + getRepoCountIncludingUnsavedChanges(r), 0);

  const isAtTotalRepoLimit = totalRepoCount >= RADAR_LIMITS.MAX_TOTAL_REPOS;

  const hasUnsavedChanges = actualAdds.length > 0 || actualRemoves.length > 0;

  // Toggle handler: update local state only, no API calls
  const handleToggleRadar = (radar: RadarWithCount) => {
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
  };

  // Save all unsaved changes
  const saveChanges = async (): Promise<void> => {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    setSaveError(null);

    // Run removes before adds so "move" operations succeed when at limit
    const removeResults = await Promise.allSettled(
      actualRemoves.map((id) => removeRepoFromRadar(id, githubRepoId).then(() => id))
    );
    const addResults = await Promise.allSettled(
      actualAdds.map((id) => addRepoToRadar(id, githubRepoId).then(() => id))
    );

    const succeededAdds = addResults
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map((r) => r.value);
    const succeededRemoves = removeResults
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map((r) => r.value);

    const failedResults = [...addResults, ...removeResults].filter(
      (r) => r.status === 'rejected'
    ) as PromiseRejectedResult[];

    // Remove succeeded operations from pending sets
    if (succeededAdds.length > 0) {
      setRadarsToAddRepoTo((prev) => {
        const next = new Set(prev);
        succeededAdds.forEach((id) => next.delete(id));
        return next;
      });
    }
    if (succeededRemoves.length > 0) {
      setRadarsToRemoveRepoFrom((prev) => {
        const next = new Set(prev);
        succeededRemoves.forEach((id) => next.delete(id));
        return next;
      });
    }

    // Invalidate caches for successful operations
    if (succeededAdds.length > 0 || succeededRemoves.length > 0) {
      void queryClient.invalidateQueries({ queryKey: ['radars'] });
      // Await repo-radars so RadarIconButton sees updated state before modal closes
      await queryClient.invalidateQueries({ queryKey: ['repo-radars', githubRepoId] });

      const affectedRadarIds = new Set([...succeededAdds, ...succeededRemoves]);
      affectedRadarIds.forEach((id) => {
        void queryClient.invalidateQueries({ queryKey: ['radarRepositories', id] });
      });
    }

    setIsSaving(false);

    // If any failed, report error and throw
    if (failedResults.length > 0) {
      const firstError = failedResults[0].reason;
      const message =
        firstError instanceof Error ? firstError.message : 'Failed to save some changes';
      setSaveError(message);
      throw firstError;
    }
  };

  // Discard all unsaved changes
  const cancelChanges = () => {
    setRadarsToAddRepoTo(new Set());
    setRadarsToRemoveRepoFrom(new Set());
    setSaveError(null);
  };

  const isCheckboxDisabled = (radar: RadarWithCount): boolean => {
    if (isSaving) return true; // Disable all during save to prevent edits being dropped
    if (isRadarChecked(radar.id)) return false; // Can always uncheck
    const repoCount = getRepoCountIncludingUnsavedChanges(radar);
    if (repoCount >= RADAR_LIMITS.MAX_REPOS_PER_RADAR) return true;
    if (isAtTotalRepoLimit) return true;
    return false;
  };

  const getDisabledTooltip = (radar: RadarWithCount): string | null => {
    const repoCount = getRepoCountIncludingUnsavedChanges(radar);
    if (repoCount >= RADAR_LIMITS.MAX_REPOS_PER_RADAR) {
      return `This radar has reached its limit (${RADAR_LIMITS.MAX_REPOS_PER_RADAR} repos)`;
    }
    if (isAtTotalRepoLimit) {
      return `You've reached your total repo limit (${RADAR_LIMITS.MAX_TOTAL_REPOS})`;
    }
    return null;
  };

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
