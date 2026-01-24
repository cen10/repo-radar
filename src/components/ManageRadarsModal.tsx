import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useQueryClient } from '@tanstack/react-query';
import { useRadars } from '../hooks/useRadars';
import { useRepoRadars } from '../hooks/useRepoRadars';
import { addRepoToRadar, removeRepoFromRadar, RADAR_LIMITS } from '../services/radar';
import type { RadarWithCount } from '../types/database';

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
  const { radars, isLoading: isLoadingRadars } = useRadars();
  const { radarIds, isLoading: isLoadingRepoRadars } = useRepoRadars(githubRepoId);

  const [error, setError] = useState<string | null>(null);
  const [optimisticRadarIds, setOptimisticRadarIds] = useState<string[] | null>(null);

  const isLoading = isLoadingRadars || isLoadingRepoRadars;

  // Derived state for limits
  const totalRepos = radars.reduce((sum, r) => sum + r.repo_count, 0);
  const isAtTotalRepoLimit = totalRepos >= RADAR_LIMITS.MAX_TOTAL_REPOS;

  const invalidateCaches = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['radars'] }),
      queryClient.invalidateQueries({ queryKey: ['repo-radars', githubRepoId] }),
    ]);
  }, [queryClient, githubRepoId]);

  const handleToggleRadar = async (radar: RadarWithCount, isChecked: boolean) => {
    setError(null);

    // Optimistic update: immediately show the new state
    const currentIds = optimisticRadarIds ?? radarIds;
    const newOptimisticIds = isChecked
      ? currentIds.filter((id) => id !== radar.id)
      : [...currentIds, radar.id];
    setOptimisticRadarIds(newOptimisticIds);

    try {
      if (isChecked) {
        await removeRepoFromRadar(radar.id, githubRepoId);
      } else {
        await addRepoToRadar(radar.id, githubRepoId);
      }
      // Sync with server in background
      void invalidateCaches();
    } catch (err) {
      // Revert optimistic update on error
      setOptimisticRadarIds(null);
      const message = err instanceof Error ? err.message : 'Failed to update radar';
      setError(message);
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

  // Use optimistic state if available, otherwise use server state
  const effectiveRadarIds = optimisticRadarIds ?? radarIds;

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
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Radar list */}
            <div className="max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="py-3 text-sm text-gray-500">Loading...</div>
              ) : radars.length === 0 ? (
                <div className="py-3 text-sm text-gray-500">
                  No radars yet. Create one in the sidebar.
                </div>
              ) : (
                <ul className="space-y-1">
                  {radars.map((radar) => {
                    const isChecked = effectiveRadarIds.includes(radar.id);
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
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-3 rounded-md bg-red-50 px-3 py-2">
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end px-6 pb-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Done
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
