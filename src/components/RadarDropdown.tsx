import { useState, useRef, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useRadars } from '../hooks/useRadars';
import { useRepoRadars } from '../hooks/useRepoRadars';
import { addRepoToRadar, removeRepoFromRadar, createRadar, RADAR_LIMITS } from '../services/radar';
import type { RadarWithCount } from '../types/database';

interface RadarDropdownProps {
  githubRepoId: number;
  trigger: React.ReactNode;
  onOpenChange?: (isOpen: boolean) => void;
}

const MAX_NAME_LENGTH = 50;

export function RadarDropdown({ githubRepoId, trigger, onOpenChange }: RadarDropdownProps) {
  const queryClient = useQueryClient();
  const { radars, isLoading: isLoadingRadars } = useRadars();
  const { radarIds, isLoading: isLoadingRepoRadars } = useRepoRadars(githubRepoId);

  const [isCreating, setIsCreating] = useState(false);
  const [newRadarName, setNewRadarName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [togglingRadarId, setTogglingRadarId] = useState<string | null>(null);
  // Optimistic state for checkbox values during toggle
  const [optimisticRadarIds, setOptimisticRadarIds] = useState<string[] | null>(null);
  const [wasOpen, setWasOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const activeCheckboxRef = useRef<HTMLInputElement | null>(null);

  // Focus input when entering create mode
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  // Clear success message after announcement
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Reset form state when dropdown closes
  const resetFormState = useCallback(() => {
    setIsCreating(false);
    setNewRadarName('');
    setError(null);
    setOptimisticRadarIds(null);
  }, []);

  // Derived state for limits
  const totalRepos = radars.reduce((sum, r) => sum + r.repo_count, 0);
  const isAtTotalRepoLimit = totalRepos >= RADAR_LIMITS.MAX_TOTAL_REPOS;
  const isAtRadarLimit = radars.length >= RADAR_LIMITS.MAX_RADARS_PER_USER;

  const isLoading = isLoadingRadars || isLoadingRepoRadars;

  const invalidateCaches = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['radars'] });
    void queryClient.invalidateQueries({ queryKey: ['repo-radars', githubRepoId] });
  }, [queryClient, githubRepoId]);

  const handleToggleRadar = async (radar: RadarWithCount, isChecked: boolean) => {
    setTogglingRadarId(radar.id);
    setError(null);

    // Optimistic update: immediately show the expected state
    const currentIds = optimisticRadarIds ?? radarIds;
    const newOptimisticIds = isChecked
      ? currentIds.filter((id) => id !== radar.id)
      : [...currentIds, radar.id];
    setOptimisticRadarIds(newOptimisticIds);

    try {
      if (isChecked) {
        await removeRepoFromRadar(radar.id, githubRepoId);
        setSuccessMessage(`Removed from ${radar.name}`);
      } else {
        await addRepoToRadar(radar.id, githubRepoId);
        setSuccessMessage(`Added to ${radar.name}`);
      }
      invalidateCaches();
      // Clear optimistic state after cache invalidation triggers refetch
      setOptimisticRadarIds(null);
    } catch (err) {
      // Revert optimistic update on error
      setOptimisticRadarIds(null);
      const message = err instanceof Error ? err.message : 'Failed to update radar';
      setError(message);
    } finally {
      setTogglingRadarId(null);
      // Restore focus to the checkbox after re-render
      setTimeout(() => activeCheckboxRef.current?.focus(), 0);
    }
  };

  const handleCreateRadar = async (e: FormEvent) => {
    e.preventDefault();

    const trimmedName = newRadarName.trim();
    if (!trimmedName) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Create the radar
      const newRadar = await createRadar(trimmedName);

      // Add repo to the new radar
      await addRepoToRadar(newRadar.id, githubRepoId);

      // Invalidate caches
      invalidateCaches();

      // Reset form and announce success
      setNewRadarName('');
      setIsCreating(false);
      setSuccessMessage(`Radar '${trimmedName}' created and repo added`);

      // Focus the create button to keep focus inside panel (enables native Escape handling)
      setTimeout(() => createButtonRef.current?.focus(), 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create radar';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewRadarName('');
    setError(null);
  };

  const handleNameChange = (value: string) => {
    setNewRadarName(value);
    if (error) setError(null);
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

  const trimmedName = newRadarName.trim();
  const isCreateDisabled = !trimmedName || isSubmitting;

  // Use optimistic state if available, otherwise use server state
  const effectiveRadarIds = optimisticRadarIds ?? radarIds;

  return (
    <Popover className="relative">
      {({ open }) => {
        // Detect close and reset form state
        if (wasOpen && !open) {
          // Use setTimeout to avoid state update during render
          setTimeout(resetFormState, 0);
        }
        if (wasOpen !== open) {
          setTimeout(() => setWasOpen(open), 0);
        }

        // Notify parent of open state changes
        if (onOpenChange) {
          setTimeout(() => onOpenChange(open), 0);
        }

        return (
          <>
            <PopoverButton as="div" className="cursor-pointer">
              {trigger}
            </PopoverButton>

            <PopoverPanel
              focus
              transition
              className="absolute right-0 top-full z-10 mt-2 w-64 rounded-lg bg-white shadow-lg border border-gray-200 transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Add to Radar</h3>
              </div>

              {/* Aria-live region for announcements */}
              <div aria-live="polite" className="sr-only">
                {successMessage}
              </div>

              {/* Radar list */}
              <div className="max-h-48 overflow-y-auto py-2">
                {isLoading ? (
                  <div className="px-4 py-3 text-sm text-gray-500">Loading...</div>
                ) : radars.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">No radars yet</div>
                ) : (
                  <ul className="space-y-1">
                    {radars.map((radar) => {
                      const isChecked = effectiveRadarIds.includes(radar.id);
                      const isDisabled = isCheckboxDisabled(radar, isChecked);
                      const isToggling = togglingRadarId === radar.id;
                      const tooltip = isDisabled ? getDisabledTooltip(radar) : null;

                      return (
                        <li key={radar.id}>
                          <label
                            className={`flex items-center px-4 py-2 hover:bg-indigo-50 cursor-pointer ${
                              isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            title={tooltip ?? undefined}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isDisabled || isToggling}
                              onChange={(e) => {
                                activeCheckboxRef.current = e.target;
                                void handleToggleRadar(radar, isChecked);
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                              aria-disabled={isDisabled}
                            />
                            <span className="ml-3 text-sm text-gray-700">{radar.name}</span>
                            {isToggling && (
                              <span className="ml-auto">
                                <svg
                                  className="h-4 w-4 animate-spin text-indigo-600"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  />
                                </svg>
                              </span>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Error message */}
              {error && (
                <div className="px-4 py-2 bg-red-50 border-t border-red-100">
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                </div>
              )}

              {/* Create section */}
              <div className="border-t border-gray-200 p-3">
                {isCreating ? (
                  <form onSubmit={handleCreateRadar}>
                    <input
                      ref={inputRef}
                      type="text"
                      value={newRadarName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      disabled={isSubmitting}
                      maxLength={MAX_NAME_LENGTH}
                      placeholder="New radar name..."
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50"
                      aria-label="New radar name"
                    />
                    <div className="mt-1 flex justify-end">
                      <span
                        className={`text-xs ${newRadarName.length >= MAX_NAME_LENGTH ? 'text-red-500' : 'text-gray-400'}`}
                      >
                        {newRadarName.length} / {MAX_NAME_LENGTH}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleCancelCreate}
                        disabled={isSubmitting}
                        className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isCreateDisabled}
                        className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[60px]"
                      >
                        {isSubmitting ? (
                          <svg
                            className="h-4 w-4 animate-spin"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                        ) : (
                          'Create'
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    ref={createButtonRef}
                    onClick={() => setIsCreating(true)}
                    disabled={isAtRadarLimit}
                    title={
                      isAtRadarLimit
                        ? `You've reached your radar limit (${RADAR_LIMITS.MAX_RADARS_PER_USER})`
                        : undefined
                    }
                    className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create new radar
                  </button>
                )}
              </div>
            </PopoverPanel>
          </>
        );
      }}
    </Popover>
  );
}
