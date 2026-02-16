import { useState, useEffect } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useRadarToggle } from '../hooks/useRadarToggle';
import { Tooltip } from './Tooltip';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';

interface ManageRadarsModalProps {
  githubRepoId: number;
  open: boolean;
  onClose: () => void;
}

export function ManageRadarsModal({ githubRepoId, open, onClose }: ManageRadarsModalProps) {
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

  // Reset discard confirm state when modal opens (defensive, since components stay mounted)
  useEffect(() => {
    if (open) {
      setShowDiscardConfirm(false);
    }
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
      // Error is displayed in modal via saveError, don't close
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    cancelChanges();
    onClose();
  };

  const handleCancelDiscard = () => {
    setShowDiscardConfirm(false);
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
          const isChecked = isRadarChecked(radar.id);
          const isDisabled = isCheckboxDisabled(radar);
          const tooltip = isDisabled ? getDisabledTooltip(radar) : null;

          const labelContent = (
            <label
              className={clsx(
                'flex items-center rounded-md px-3 py-2 hover:bg-indigo-50 cursor-pointer',
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={isDisabled}
                onChange={() => handleToggleRadar(radar)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                aria-disabled={isDisabled}
              />
              <span className="ml-3 text-sm text-gray-700">{radar.name}</span>
            </label>
          );

          return (
            <li key={radar.id}>
              {tooltip ? <Tooltip content={tooltip}>{labelContent}</Tooltip> : labelContent}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <>
      <Dialog open={open} onClose={handleCancel} className="relative z-50">
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
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Add to Radar
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={handleCancel} aria-label="Close">
                <XMarkIcon className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              {/* Radar list */}
              <div className="max-h-64 overflow-y-auto">{renderRadarList()}</div>

              {/* Save error message */}
              {saveError && (
                <div className="mt-3 rounded-md bg-red-50 px-3 py-2">
                  <p className="text-sm text-red-600" role="alert">
                    {saveError}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 pb-6">
              <Button onClick={handleDone} loading={isSaving}>
                Done
              </Button>
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
