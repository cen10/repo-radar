import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useQueryClient } from '@tanstack/react-query';
import { useRadars } from '../hooks/useRadars';
import { useRepoRadars } from '../hooks/useRepoRadars';
import { addRepoToRadar, removeRepoFromRadar, RADAR_LIMITS } from '../services/radar';
import type { RadarWithCount } from '../types/database';
import { Button } from './Button';

interface ManageRadarsModalProps {
  githubRepoId: number;
  onClose: () => void;
}

// Portal-based tooltip that escapes overflow containers
interface PortalTooltipProps {
  content: string | null;
  children: React.ReactNode;
  leftOffset?: number;
}

function PortalTooltip({ content, children, leftOffset = 28 }: PortalTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left + leftOffset,
      });
    }
  }, [leftOffset]);

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <>
      <div ref={triggerRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        {children}
      </div>
      {isVisible &&
        content &&
        createPortal(
          <div
            className="fixed z-100 w-max max-w-xs rounded bg-gray-900 px-2 py-1 text-xs text-white pointer-events-none"
            style={{ top: position.top, left: position.left }}
            role="tooltip"
          >
            {content}
            <span className="absolute left-4 bottom-full border-4 border-transparent border-b-gray-900" />
          </div>,
          document.body
        )}
    </>
  );
}

export function ManageRadarsModal({ githubRepoId, onClose }: ManageRadarsModalProps) {
  const queryClient = useQueryClient();
  const { radars, isLoading: isLoadingRadars, error: radarsError } = useRadars();
  const {
    radarIds,
    isLoading: isLoadingRepoRadars,
    error: repoRadarsError,
  } = useRepoRadars(githubRepoId);

  const [toggleError, setToggleError] = useState<string | null>(null);

  const isLoading = isLoadingRadars || isLoadingRepoRadars;
  const fetchError = radarsError || repoRadarsError;

  // Derived state for limits
  const totalRepos = radars.reduce((sum, r) => sum + r.repo_count, 0);
  const isAtTotalRepoLimit = totalRepos >= RADAR_LIMITS.MAX_TOTAL_REPOS;

  const repoRadarsQueryKey = ['repo-radars', githubRepoId] as const;
  const radarsQueryKey = ['radars'] as const;

  const handleToggleRadar = async (radar: RadarWithCount, isChecked: boolean) => {
    setToggleError(null);

    // Optimistic update: update both caches for consistent UI state
    const previousIds = radarIds;
    const previousRadars = radars;

    const newIds = isChecked ? radarIds.filter((id) => id !== radar.id) : [...radarIds, radar.id];
    queryClient.setQueryData(repoRadarsQueryKey, newIds);

    // Also update radars cache to keep repo_count in sync with checkbox state
    const newRadars = radars.map((r) =>
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
  };

  const isCheckboxDisabled = (radar: RadarWithCount, isChecked: boolean): boolean => {
    if (isChecked) return false; // Can always uncheck
    if (radar.repo_count >= RADAR_LIMITS.MAX_REPOS_PER_RADAR) return true;
    if (isAtTotalRepoLimit) return true;
    return false;
  };

  const getDisabledTooltip = (radar: RadarWithCount): string | null => {
    if (radar.repo_count >= RADAR_LIMITS.MAX_REPOS_PER_RADAR) {
      return `This radar has reached its limit (${RADAR_LIMITS.MAX_REPOS_PER_RADAR} repos)`;
    }
    if (isAtTotalRepoLimit) {
      return `You've reached your total repo limit (${RADAR_LIMITS.MAX_TOTAL_REPOS})`;
    }
    return null;
  };

  const renderRadarList = () => {
    let statusMessage: string | null = null;

    if (isLoading) {
      statusMessage = 'Loading...';
    } else if (fetchError) {
      statusMessage = 'Failed to load radars. Please try again.';
    } else if (radars.length === 0) {
      statusMessage = 'No radars yet. Create one in the sidebar.';
    }

    if (statusMessage) {
      const colorClass = fetchError ? 'text-red-600' : 'text-gray-500';
      return <div className={`py-3 text-sm ${colorClass}`}>{statusMessage}</div>;
    }

    return (
      <ul className="space-y-1">
        {radars.map((radar) => {
          const isChecked = radarIds.includes(radar.id);
          const isDisabled = isCheckboxDisabled(radar, isChecked);
          const tooltip = isDisabled ? getDisabledTooltip(radar) : null;

          const labelContent = (
            <label
              className={`flex items-center rounded-md px-3 py-2 hover:bg-indigo-50 cursor-pointer ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={isDisabled}
                onChange={() => void handleToggleRadar(radar, isChecked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                aria-disabled={isDisabled}
              />
              <span className="ml-3 text-sm text-gray-700">{radar.name}</span>
            </label>
          );

          return (
            <li key={radar.id}>
              {tooltip ? (
                <PortalTooltip content={tooltip}>{labelContent}</PortalTooltip>
              ) : (
                labelContent
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 transition-opacity duration-200 data-closed:opacity-0"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-md rounded-lg bg-white shadow-xl transition duration-200 data-closed:scale-95 data-closed:opacity-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6">
            <DialogTitle className="text-lg font-semibold text-gray-900">Add to Radar</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
              <XMarkIcon className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Radar list */}
            <div className="max-h-64 overflow-y-auto">{renderRadarList()}</div>

            {/* Toggle error message */}
            {toggleError && (
              <div className="mt-3 rounded-md bg-red-50 px-3 py-2">
                <p className="text-sm text-red-600" role="alert">
                  {toggleError}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end px-6 pb-6">
            <Button onClick={onClose}>Done</Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
