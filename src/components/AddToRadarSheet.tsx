import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useRadars } from '../hooks/useRadars';
import { useRepoRadars } from '../hooks/useRepoRadars';
import { addRepoToRadar, removeRepoFromRadar, RADAR_LIMITS } from '../services/radar';
import type { RadarWithCount } from '../types/database';
import { BottomSheet } from './BottomSheet';

interface AddToRadarSheetProps {
  githubRepoId: number;
  open: boolean;
  onClose: () => void;
}

// Portal-based tooltip for limit messages
interface TooltipProps {
  content: string | null;
  children: React.ReactNode;
}

function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleTouchStart = () => {
    // Clear any pending hide timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (triggerRef.current && content) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left + 28,
      });
      setIsVisible(true);
    }
  };

  const handleTouchEnd = () => {
    // Keep tooltip visible briefly on touch
    timeoutRef.current = setTimeout(() => setIsVisible(false), 2000);
  };

  return (
    <>
      <div
        ref={triggerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={handleTouchStart}
        onMouseLeave={() => setIsVisible(false)}
      >
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

export function AddToRadarSheet({ githubRepoId, open, onClose }: AddToRadarSheetProps) {
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

    // Optimistic update
    const previousIds = radarIds;
    const previousRadars = radars;

    const newIds = isChecked ? radarIds.filter((id) => id !== radar.id) : [...radarIds, radar.id];
    queryClient.setQueryData(repoRadarsQueryKey, newIds);

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
      void queryClient.invalidateQueries({ queryKey: radarsQueryKey });
      void queryClient.invalidateQueries({ queryKey: repoRadarsQueryKey });
    } catch (err) {
      queryClient.setQueryData(repoRadarsQueryKey, previousIds);
      queryClient.setQueryData(radarsQueryKey, previousRadars);
      const message = err instanceof Error ? err.message : 'Failed to update radar';
      setToggleError(message);
    }
  };

  const isCheckboxDisabled = (radar: RadarWithCount, isChecked: boolean): boolean => {
    if (isChecked) return false;
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

  const renderContent = () => {
    if (isLoading) {
      return <div className="py-3 text-sm text-gray-500">Loading...</div>;
    }

    if (fetchError) {
      return (
        <div className="py-3 text-sm text-red-600">Failed to load radars. Please try again.</div>
      );
    }

    return (
      <>
        {/* Radar list */}
        {radars.length === 0 ? (
          <div className="py-3 text-sm text-gray-500">
            No radars yet. Create one in the sidebar.
          </div>
        ) : (
          <ul className="space-y-1">
            {radars.map((radar) => {
              const isChecked = radarIds.includes(radar.id);
              const isDisabled = isCheckboxDisabled(radar, isChecked);
              const tooltip = isDisabled ? getDisabledTooltip(radar) : null;

              const labelContent = (
                <label
                  className={`flex items-center rounded-md px-3 py-3 active:bg-indigo-50 ${
                    isDisabled ? 'opacity-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={() => void handleToggleRadar(radar, isChecked)}
                    className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                    aria-disabled={isDisabled}
                  />
                  <span className="ml-3 text-base text-gray-700">{radar.name}</span>
                </label>
              );

              return (
                <li key={radar.id}>
                  {tooltip ? <Tooltip content={tooltip}>{labelContent}</Tooltip> : labelContent}
                </li>
              );
            })}
          </ul>
        )}

        {/* Toggle error */}
        {toggleError && (
          <div className="mt-3 rounded-md bg-red-50 px-3 py-2">
            <p className="text-sm text-red-600" role="alert">
              {toggleError}
            </p>
          </div>
        )}
      </>
    );
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Add to Radar">
      {renderContent()}
    </BottomSheet>
  );
}
