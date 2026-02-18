import { useState, useEffect, useRef, useCallback } from 'react';
import type { TouchEvent } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import clsx from 'clsx';
import { useRadarToggle } from '../hooks/useRadarToggle';
import { Tooltip } from './Tooltip';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';

const SWIPE_THRESHOLD = 100;
const TRANSITION_DURATION = 300;

interface AddToRadarSheetProps {
  githubRepoId: number;
  open: boolean;
  onClose: () => void;
}

export function AddToRadarSheet({ githubRepoId, open, onClose }: AddToRadarSheetProps) {
  const {
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
  } = useRadarToggle({ githubRepoId, open });

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const currentTranslateY = useRef(0);
  const isSwipeGesture = useRef(false);
  const swipeAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset discard confirm state when sheet opens (defensive, since components stay mounted)
  useEffect(() => {
    if (open) {
      setShowDiscardConfirm(false);
    }
  }, [open]);

  // Clear swipe animation timeout when sheet closes or unmounts
  useEffect(() => {
    if (!open && swipeAnimationTimeoutRef.current) {
      clearTimeout(swipeAnimationTimeoutRef.current);
      swipeAnimationTimeoutRef.current = null;
    }
    return () => {
      if (swipeAnimationTimeoutRef.current) {
        clearTimeout(swipeAnimationTimeoutRef.current);
      }
    };
  }, [open]);

  const handleDone = async () => {
    if (!hasUnsavedChanges) {
      onClose();
      return;
    }

    try {
      await saveChanges();
      onClose();
    } catch {
      // Error is displayed in sheet via saveError, don't close
    }
  };

  const handleCancel = useCallback(() => {
    if (isSaving) return; // Prevent closing while save is in-flight
    if (hasUnsavedChanges) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  }, [isSaving, hasUnsavedChanges, onClose]);

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    cancelChanges();
    onClose();
  };

  const handleCancelDiscard = () => {
    setShowDiscardConfirm(false);
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    currentTranslateY.current = 0;
    // Only allow swipe gesture if scrollable content is at top
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    isSwipeGesture.current = scrollTop === 0;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (touchStartY.current === null || !panelRef.current) return;
    // Don't interfere with content scrolling
    if (!isSwipeGesture.current) return;

    const deltaY = e.touches[0].clientY - touchStartY.current;

    // Only allow downward swipe (positive delta)
    if (deltaY > 0) {
      currentTranslateY.current = deltaY;
      panelRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!panelRef.current) return;

    const shouldDismiss = isSwipeGesture.current && currentTranslateY.current > SWIPE_THRESHOLD;

    if (shouldDismiss) {
      if (hasUnsavedChanges) {
        // Skip slide-away animation to avoid jank when discard dialog appears
        panelRef.current.style.transform = '';
        handleCancel();
      } else {
        // Animate to off-screen from current position, then close
        panelRef.current.style.transform = 'translateY(100%)';
        swipeAnimationTimeoutRef.current = setTimeout(() => {
          swipeAnimationTimeoutRef.current = null;
          if (panelRef.current) {
            panelRef.current.style.transform = '';
          }
          onClose();
        }, TRANSITION_DURATION);
      }
    } else {
      // Snap back to original position
      panelRef.current.style.transform = '';
    }

    touchStartY.current = null;
    currentTranslateY.current = 0;
    isSwipeGesture.current = false;
  }, [onClose, hasUnsavedChanges, handleCancel]);

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
              const isChecked = isRadarChecked(radar.id);
              const isDisabled = isCheckboxDisabled(radar);
              const tooltip = isDisabled ? getDisabledTooltip(radar) : null;

              const labelContent = (
                <label
                  className={clsx(
                    'flex items-center rounded-md px-3 py-3 active:bg-indigo-50',
                    isDisabled && 'opacity-50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={() => handleToggleRadar(radar)}
                    className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                    aria-disabled={isDisabled}
                  />
                  <span className="ml-3 text-base text-gray-700">{radar.name}</span>
                </label>
              );

              return (
                <li key={radar.id}>
                  {tooltip ? (
                    <Tooltip content={tooltip} enableTouch>
                      {labelContent}
                    </Tooltip>
                  ) : (
                    labelContent
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Save error */}
        {saveError && (
          <div className="mt-3 rounded-md bg-red-50 px-3 py-2">
            <p className="text-sm text-red-600" role="alert">
              {saveError}
            </p>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <Dialog open={open} onClose={handleCancel} className="relative z-modal">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/50 transition-opacity duration-200 data-closed:opacity-0"
        />
        <div className="fixed inset-0 flex items-end justify-center px-4 pt-2 pb-0">
          <DialogPanel
            ref={panelRef}
            transition
            data-testid="bottom-sheet-panel"
            className="w-full max-h-[calc(100vh-5rem)] rounded-t-2xl bg-white shadow-xl transition-transform duration-300 ease-out data-closed:translate-y-full motion-reduce:transition-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            {/* Drag handle indicator */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-gray-300" aria-hidden="true" />
            </div>

            <div className="px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom, 1rem)' }}>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Add to Radar
              </DialogTitle>

              <div ref={scrollRef} className="mt-4 max-h-[60vh] overflow-y-auto">
                {renderContent()}
              </div>

              <div className="mt-6 pb-4">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleDone}
                  loading={isSaving}
                >
                  Done
                </Button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <ConfirmDialog
        open={showDiscardConfirm}
        title="Discard changes?"
        message="You have unsaved changes. Are you sure you want to discard them?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
        variant="danger"
      />
    </>
  );
}
