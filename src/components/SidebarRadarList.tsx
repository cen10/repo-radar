import { useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import {
  PlusIcon,
  ArrowPathIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { RADAR_LIMITS } from '../services/radar';
import type { RadarWithCount } from '../types/database';
import { SidebarTooltip, useSidebarContext } from './Sidebar';
import { StaticRadarIcon } from './icons';
import { Button } from './Button';
import { useOnboarding } from '../contexts/use-onboarding';
import { useRadars } from '../hooks/useRadars';
import { TOUR_RADAR_ID } from '../demo/tour-data';
import { RenameRadarModal } from './RenameRadarModal';
import { DeleteRadarModal } from './DeleteRadarModal';

interface SidebarRadarListProps {
  onLinkClick: () => void;
  onCreateRadar: () => void;
}

interface RadarNavItemProps {
  radar: RadarWithCount;
  collapsed: boolean;
  hideText: boolean;
  onLinkClick: () => void;
  onRename: (radar: RadarWithCount) => void;
  onDelete: (radar: RadarWithCount) => void;
  dataTour?: string;
  isDimmed?: boolean;
  showPulse?: boolean;
}

// Approximate characters that fit in one line of the sidebar (for tooltip detection)
const MAX_RADAR_NAME_LENGTH = 20;

function RadarNavItem({
  radar,
  collapsed,
  hideText,
  onLinkClick,
  onRename,
  onDelete,
  dataTour,
  isDimmed,
  showPulse,
}: RadarNavItemProps) {
  // Show tooltip if name might be truncated
  const isTruncated = radar.name.length > MAX_RADAR_NAME_LENGTH;

  const navLinkBase =
    'group/radar flex items-center py-2 text-sm font-medium transition-colors rounded-lg';
  const navLinkLayout = collapsed ? 'justify-center px-2 outline-none' : 'gap-3 px-3';
  const navLinkActive = 'bg-indigo-100 text-indigo-700';
  const navLinkInactive = 'text-gray-700 hover:bg-indigo-50';
  const iconWrapperFocus =
    'p-1 -m-1 rounded-lg group-has-focus-visible:ring-2 group-has-focus-visible:ring-indigo-600 group-has-focus-visible:ring-offset-2';

  // Wrapper div with group class so hover state applies to both NavLink and Menu
  return (
    <div
      className={clsx(
        'group/radar relative rounded-lg transition-colors',
        isDimmed ? 'opacity-40 pointer-events-none' : 'hover:bg-indigo-50',
        showPulse && 'animate-pulse-border'
      )}
    >
      <SidebarTooltip label={radar.name} show={collapsed || isTruncated}>
        <NavLink
          to={`/radar/${radar.id}`}
          onClick={onLinkClick}
          aria-label={`${radar.name}, ${radar.repo_count} repositories`}
          data-tour={dataTour}
          className={({ isActive }) =>
            clsx(
              navLinkBase,
              navLinkLayout,
              !hideText && 'overflow-hidden',
              isActive && navLinkActive,
              !isActive && navLinkInactive
            )
          }
        >
          {({ isActive }) => (
            <>
              {/* Focus ring on icon wrapper when collapsed, on full link when expanded */}
              <span className={clsx('shrink-0', collapsed && iconWrapperFocus)}>
                <StaticRadarIcon
                  className={clsx(
                    'h-5 w-5',
                    isActive && 'text-indigo-600',
                    !isActive && 'text-gray-400'
                  )}
                />
              </span>
              {/* Name in fixed-width wrapper so text doesn't reflow during collapse */}
              {!hideText && (
                <div className="flex items-center gap-3 shrink-0 w-[168px]">
                  <span aria-hidden="true" className="flex-1 truncate min-w-0">
                    {radar.name}
                  </span>
                </div>
              )}
            </>
          )}
        </NavLink>
      </SidebarTooltip>

      {/* Repo count and kebab menu - positioned outside NavLink to avoid click interference */}
      {!hideText && (
        <Menu
          as="div"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-6 flex justify-end z-50 pointer-events-none"
        >
          {({ open }) => (
            <>
              {/* Kebab menu - shown on hover, keyboard focus, or when menu is open */}
              <MenuButton
                className={clsx(
                  'peer absolute -right-1 text-gray-400 cursor-pointer transition-opacity pointer-events-auto',
                  open
                    ? 'opacity-100'
                    : 'lg:opacity-0 focus-visible:opacity-100 lg:group-hover/radar:opacity-100'
                )}
              >
                <span className="sr-only">Open menu for {radar.name}</span>
                <EllipsisVerticalIcon className="h-4 w-4" aria-hidden="true" />
              </MenuButton>
              {/* Repo count - hidden on hover, keyboard focus, or when menu is open */}
              <span
                aria-hidden="true"
                className={clsx(
                  'text-gray-400 text-xs whitespace-nowrap transition-opacity',
                  open
                    ? 'opacity-0'
                    : 'opacity-0 lg:opacity-100 lg:group-hover/radar:opacity-0 lg:peer-focus-visible:opacity-0'
                )}
              >
                {radar.repo_count}
              </span>

              <MenuItems
                transition
                className="absolute right-0 top-full mt-1 w-36 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none transition duration-100 ease-out data-closed:scale-95 data-closed:opacity-0 pointer-events-auto"
              >
                <MenuItem>
                  <button
                    onClick={() => onRename(radar)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 data-focus:bg-indigo-50"
                  >
                    <PencilIcon className="h-4 w-4" aria-hidden="true" />
                    Rename
                  </button>
                </MenuItem>
                <MenuItem>
                  <button
                    onClick={() => onDelete(radar)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 data-focus:bg-indigo-50"
                  >
                    <TrashIcon className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </button>
                </MenuItem>
              </MenuItems>
            </>
          )}
        </Menu>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div
      data-testid="radar-list-loading"
      className="space-y-2"
      aria-busy="true"
      aria-label="Loading radars"
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-2 animate-pulse motion-reduce:animate-none"
        >
          <div className="h-5 w-5 bg-gray-200 rounded-full shrink-0" />
          <div className="flex-1 h-4 bg-gray-200 rounded" />
          <div className="h-4 w-6 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

interface ErrorStateProps {
  onRetry: () => void;
  isFetching: boolean;
}

function ErrorState({ onRetry, isFetching }: ErrorStateProps) {
  return (
    <div className="px-3 py-4 text-center" role="alert">
      <p className="text-sm text-gray-500 mb-2">Failed to load radars</p>
      <Button variant="link" onClick={onRetry} loading={isFetching} loadingText="Retrying...">
        <ArrowPathIcon className="h-4 w-4 mr-1" aria-hidden="true" />
        Retry
      </Button>
    </div>
  );
}

interface EmptyStateProps {
  hideText: boolean;
  onCreateRadar: () => void;
}

function EmptyState({ hideText, onCreateRadar }: EmptyStateProps) {
  // Intentionally hidden when collapsed (unlike CreateButton which shows an icon).
  // New users benefit from seeing the expanded "No radars yet" onboarding message.
  // pl-11 = 44px (12px nav padding + 20px icon + 12px gap) to align with nav text
  const collapseTransition =
    'whitespace-nowrap overflow-hidden transition-all duration-300 motion-reduce:transition-none';

  return (
    <div className="pl-11 pr-3 py-4">
      <p
        className={clsx(
          'text-sm text-gray-500 mb-3',
          collapseTransition,
          hideText ? 'w-0' : 'w-auto'
        )}
      >
        No radars yet.
      </p>
      <button
        onClick={onCreateRadar}
        className={clsx(
          'inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-500 font-medium',
          collapseTransition,
          hideText ? 'w-0' : 'w-auto'
        )}
      >
        <PlusIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        Create Radar
      </button>
    </div>
  );
}

interface CreateButtonProps {
  collapsed: boolean;
  hideText: boolean;
  onClick: () => void;
  disabled: boolean;
}

function CreateButton({ collapsed, hideText, onClick, disabled }: CreateButtonProps) {
  // Show limit message when disabled, otherwise show "New Radar" when collapsed
  const tooltipLabel = disabled
    ? `Radar limit reached (${RADAR_LIMITS.MAX_RADARS_PER_USER}). Delete one to create more.`
    : 'New Radar';
  const showTooltip = disabled || collapsed;
  // Position tooltip to right when collapsed, below when expanded (disabled)
  const tooltipPosition = collapsed ? 'right' : 'bottom';

  // Provide accessible label explaining why button is disabled
  const ariaLabel = disabled ? `New Radar (limit reached, delete one to create more)` : undefined;

  const buttonBase = 'group flex items-center w-full py-2 text-sm font-medium transition-colors';
  const buttonLayout = collapsed ? 'justify-center px-2 outline-none' : 'gap-3 px-3 rounded';
  const buttonDisabled = 'text-gray-400 cursor-not-allowed';
  const buttonEnabled = 'text-gray-600 hover:text-gray-900';
  const iconWrapperFocus =
    'p-1 -m-1 rounded-lg group-focus-visible:ring-2 group-focus-visible:ring-indigo-600 group-focus-visible:ring-offset-2';
  const collapseTransition =
    'whitespace-nowrap overflow-hidden transition-all duration-300 motion-reduce:transition-none';

  return (
    <SidebarTooltip label={tooltipLabel} show={showTooltip} position={tooltipPosition}>
      {/* Hover background on wrapper so margin for alignment doesn't offset the highlight */}
      <div className={clsx('rounded-lg transition-colors', !disabled && 'hover:bg-indigo-200')}>
        <button
          onClick={onClick}
          disabled={disabled}
          aria-label={ariaLabel}
          className={clsx(
            buttonBase,
            buttonLayout,
            disabled && buttonDisabled,
            !disabled && buttonEnabled
          )}
        >
          <span className={clsx('shrink-0', collapsed && iconWrapperFocus)}>
            <PlusIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className={clsx(collapseTransition, hideText ? 'w-0' : 'w-auto')}>New Radar</span>
        </button>
      </div>
    </SidebarTooltip>
  );
}

export function SidebarRadarList({ onLinkClick, onCreateRadar }: SidebarRadarListProps) {
  const { collapsed, hideText } = useSidebarContext();
  const { currentStepId, isTourActive } = useOnboarding();
  // Pulse animation draws attention to tour radar during onboarding
  const showPulse = currentStepId === 'sidebar-radars';
  const navigate = useNavigate();
  const { id: currentRadarId } = useParams<{ id: string }>();

  // Modal state
  const [radarToRename, setRadarToRename] = useState<RadarWithCount | null>(null);
  const [radarToDelete, setRadarToDelete] = useState<RadarWithCount | null>(null);

  const { radars, isLoading, isFetching, error, refetch } = useRadars();

  const isAtLimit = radars.length >= RADAR_LIMITS.MAX_RADARS_PER_USER;

  const handleDeleted = () => {
    // Navigate away if we deleted the radar we're currently viewing
    if (radarToDelete && currentRadarId === radarToDelete.id) {
      void navigate('/stars');
    }
    setRadarToDelete(null);
  };

  // Loading state - hidden when collapsed since there's no meaningful display
  if (isLoading) {
    return <div data-testid="radar-list">{!hideText && <LoadingSkeleton />}</div>;
  }

  // Error state - hidden when collapsed since interaction isn't possible
  if (error) {
    return (
      <div data-testid="radar-list">
        {!hideText && <ErrorState onRetry={() => refetch()} isFetching={isFetching} />}
      </div>
    );
  }

  // Empty state
  if (radars.length === 0) {
    return (
      <div data-testid="radar-list">
        <EmptyState hideText={hideText} onCreateRadar={onCreateRadar} />
      </div>
    );
  }

  // Normal state with radars
  return (
    <div data-testid="radar-list" className="space-y-1">
      {/* Radar list */}
      <div className="space-y-1">
        {radars.map((radar) => {
          const isTourRadar = radar.id === TOUR_RADAR_ID;
          // During tour, only tour-demo-radar gets the data-tour attribute for highlighting
          const dataTour = isTourRadar ? 'sidebar-radars' : undefined;
          // Dim non-tour radars during tour to guide users to click the tour radar
          const isDimmed = isTourActive && !isTourRadar;

          return (
            <RadarNavItem
              key={radar.id}
              radar={radar}
              collapsed={collapsed}
              hideText={hideText}
              onLinkClick={onLinkClick}
              onRename={setRadarToRename}
              onDelete={setRadarToDelete}
              dataTour={dataTour}
              isDimmed={isDimmed}
              showPulse={isTourRadar && showPulse}
            />
          );
        })}
      </div>

      {/* Create button */}
      <CreateButton
        collapsed={collapsed}
        hideText={hideText}
        onClick={onCreateRadar}
        disabled={isAtLimit}
      />

      {/* Rename Modal */}
      {radarToRename && (
        <RenameRadarModal radar={radarToRename} onClose={() => setRadarToRename(null)} />
      )}

      {/* Delete Modal */}
      {radarToDelete && (
        <DeleteRadarModal
          radar={radarToDelete}
          onClose={() => setRadarToDelete(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
