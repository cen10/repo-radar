import { useState } from 'react';
import clsx from 'clsx';
import { useRadarToggle } from '../hooks/useRadarToggle';
import { Tooltip } from './Tooltip';
import { BottomSheet } from './BottomSheet';
import { ConfirmDialog } from './ConfirmDialog';

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
      <BottomSheet
        open={open}
        onClose={handleCancel}
        onDone={handleDone}
        title="Add to Radar"
        loading={isSaving}
      >
        {renderContent()}
      </BottomSheet>

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
