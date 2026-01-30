import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useRadarToggle } from '../hooks/useRadarToggle';
import { Tooltip } from './Tooltip';
import { Button } from './Button';

interface ManageRadarsModalProps {
  githubRepoId: number;
  onClose: () => void;
}

export function ManageRadarsModal({ githubRepoId, onClose }: ManageRadarsModalProps) {
  const {
    radars,
    radarIds,
    isLoading,
    fetchError,
    toggleError,
    handleToggleRadar,
    isCheckboxDisabled,
    getDisabledTooltip,
  } = useRadarToggle({ githubRepoId });

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
              {tooltip ? <Tooltip content={tooltip}>{labelContent}</Tooltip> : labelContent}
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
