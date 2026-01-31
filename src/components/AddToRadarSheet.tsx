import { useRadarToggle } from '../hooks/useRadarToggle';
import { Tooltip } from './Tooltip';
import { BottomSheet } from './BottomSheet';

interface AddToRadarSheetProps {
  githubRepoId: number;
  open: boolean;
  onClose: () => void;
}

export function AddToRadarSheet({ githubRepoId, open, onClose }: AddToRadarSheetProps) {
  const {
    radars,
    radarIds,
    isLoading,
    fetchError,
    toggleError,
    handleToggleRadar,
    isCheckboxDisabled,
    getDisabledTooltip,
  } = useRadarToggle({ githubRepoId, open });

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
